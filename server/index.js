import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, supabaseReady, supabaseError } from './supabaseClient.js';

dotenv.config();
const IS_VERCEL = process.env.VERCEL === '1';

// SEC-07: CORS configuration — allow configured origins (comma-separated)
const defaultOrigins = ['http://localhost:5173'];
if (process.env.VERCEL_URL) {
  defaultOrigins.push(`https://${process.env.VERCEL_URL}`);
}
const CLIENT_ORIGIN_RAW = process.env.CLIENT_ORIGIN || defaultOrigins.join(',');
const ALLOWED_ORIGINS = CLIENT_ORIGIN_RAW
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true; // allow non-browser clients
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // Allow Vercel preview domains when primary Vercel domain is configured
  const hasVercelOriginConfigured = ALLOWED_ORIGINS.some(o => /\.vercel\.app$/i.test(o));
  if (hasVercelOriginConfigured && /\.vercel\.app$/i.test(origin)) return true;

  return false;
}

const app = express();
const server = createServer(app);

// Only create real Socket.IO server when NOT on Vercel (serverless can't hold WebSocket connections)
const io = IS_VERCEL
  ? { emit() {}, to() { return this; }, on() {}, use() {}, of() { return this; } }
  : new Server(server, {
      cors: {
        origin: (origin, callback) => {
          if (isAllowedOrigin(origin)) return callback(null, true);
          return callback(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST"]
      }
    });

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ ok: true, service: 'level-up-backend' });
});

app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/api/db-ping', async (req, res) => {
  if (!supabaseReady || !supabase) {
    return res.status(503).json({ ok: false, error: supabaseError || 'Supabase not configured' });
  }
  const { data, error } = await supabase.from('event_config').select('*').limit(1);
  if (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
      code: error.code || error.cause?.code || null,
      cause: error.cause?.message || null
    });
  }
  res.json({ ok: true, data });
});

// AUTH-03/04: Warn loudly if using fallback secrets
const JWT_SECRET = process.env.JWT_SECRET || 'level-up-event-secret-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
if (!process.env.JWT_SECRET) console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET env var for production!');
if (!process.env.ADMIN_PASSWORD) console.warn('⚠️  WARNING: Using default ADMIN_PASSWORD. Set ADMIN_PASSWORD env var for production!');

// AUTH-05: Simple in-memory rate limiter for login endpoints
const loginAttempts = new Map(); // key -> { count, resetTime }
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max attempts per window

function checkRateLimit(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || now > record.resetTime) {
    loginAttempts.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  record.count++;
  return record.count <= RATE_LIMIT_MAX;
}

// RT-01: Submission lock to prevent double-submit race conditions
const submissionLocks = new Set(); // "teamId:challengeId" keys

// AUTH-09: Track socket-to-team mapping for online status cleanup
const socketTeamMap = new Map(); // socketId -> teamId

// ADM-01: Simple admin action audit logger
const adminLog = [];
function logAdminAction(action, details) {
  const entry = { timestamp: new Date().toISOString(), action, ...details };
  adminLog.push(entry);
  console.log(`[ADMIN] ${entry.timestamp} | ${action} |`, JSON.stringify(details));
  // Keep last 500 entries in memory
  if (adminLog.length > 500) adminLog.shift();
}

// In-memory game state (in production, use a database)
const gameState = {
  teams: {},
  powerUps: {},
  heists: {},
  targetLocks: {},
  fullscreenViolations: {}, // teamId -> { violations: number, disqualified: boolean } // targetTeamId -> attackerTeamId (one lock per target)
  eventConfig: {
    currentLevel: 1,
    isEventActive: true,
    levelTimers: {
      1: 45 * 60, // 45 minutes
      2: 60 * 60, // 60 minutes
      3: 45 * 60  // 45 minutes
    },
    heistTimeLimit: 600, // 10 minutes
    difficultyMultiplier: 1
  },
  levelProgress: {},
  announcements: []
};

// Power-up definitions
const POWER_UPS = {
  GUARDIAN_ANGEL: {
    id: 'GUARDIAN_ANGEL',
    name: 'Guardian Angel',
    description: 'Reduces enemy heist time by 30 seconds',
    effect: { heistTimeReduction: 30 }
  },
  DOUBLE_CASH: {
    id: 'DOUBLE_CASH',
    name: 'Double Cash',
    description: 'Next successful challenge gives 2x cash',
    effect: { cashMultiplier: 2 }
  },
  SHIELD: {
    id: 'SHIELD',
    name: 'Shield',
    description: 'Blocks one incoming heist attempt',
    effect: { blockHeist: true }
  },
  HINT_MASTER: {
    id: 'HINT_MASTER',
    name: 'Hint Master',
    description: 'Reveals hint for current challenge',
    effect: { revealHint: true }
  },
  TIME_FREEZE: {
    id: 'TIME_FREEZE',
    name: 'Time Freeze',
    description: 'Adds 60 seconds to current challenge timer',
    effect: { addTime: 60 }
  }
};

// Seeded random shuffle — deterministic per team so each team gets a unique but consistent order
function seededShuffle(array, seed) {
  const arr = [...array];
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = ((s << 5) - s) + seed.charCodeAt(i);
    s |= 0;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Challenge data for each level
const challenges = {
  level1: {
    logo: [
      { id: 'logo_1', question: 'Identify this logo', answer: 'Spotify', reward: 150, image: '/logos/spotify.png', options: ['Whatsapp', 'Spotify', 'LINE', 'Shazam'] },
      { id: 'logo_2', question: 'Identify this logo', answer: 'HTML', reward: 150, image: '/logos/html.png', options: ['HTML', 'CSS', 'JS', 'Type Script'] },
      { id: 'logo_3', question: 'Identify this logo', answer: 'GitLab', reward: 200, image: '/logos/gitlab.png', options: ['Fire Fox', 'GitLab', 'Brave', 'Reddit'] },
      { id: 'logo_4', question: 'Identify this logo', answer: 'Anaconda', reward: 250, image: '/logos/anaconda.png', options: ['Kali Linux', 'Razer', 'Python', 'Anaconda'] },
      { id: 'logo_5', question: 'Identify this logo', answer: 'NVIDIA', reward: 200, image: '/logos/nvidia.png', options: ['MongoDB', 'Android', 'NVIDIA', 'Envato'] },
      { id: 'logo_6', question: 'Identify this logo', answer: 'Slack', reward: 150, image: '/logos/slack.png', options: ['Elastic', 'Slack', 'Figma', 'Notion'] },
      { id: 'logo_7', question: 'Identify this logo', answer: 'Docker', reward: 200, image: '/logos/docker.png', options: ['Kubernetes', 'Docker', 'DigitalOcean', 'DeepSeek'] },
      { id: 'logo_8', question: 'Identify this logo', answer: 'Ollama', reward: 300, image: '/logos/ollama.png', options: ['Ollama', 'GitHub', 'Deno', 'Playboy'] },
      { id: 'logo_9', question: 'Identify this logo', answer: 'Google Maps', reward: 150, image: '/logos/googlemaps.png', options: ['Subway', 'Google Maps', 'MapMyIndia', 'Google Maps Navigation'] },
      { id: 'logo_10', question: 'Identify this logo', answer: 'Fiverr', reward: 200, image: '/logos/fiverr.png', options: ['Facebook', 'Flipkart', 'Fiverr', 'Figma'] },
    ],
    aihuman: [
      { id: 'aih_1', question: 'Which image is AI generated?', answer: 'Image 1', reward: 300, images: ['/aihuman/q1_img1.jpeg', '/aihuman/q1_img2.jpeg'], options: ['Image 1', 'Image 2'], reason: 'Look at the piano keys under the cat\'s legs — no weight, no gravity' },
      { id: 'aih_2', question: 'Which image is AI generated?', answer: 'Image 2', reward: 300, images: ['/aihuman/q2_img1.jpeg', '/aihuman/q2_img2.jpeg'], options: ['Image 1', 'Image 2'], reason: 'Sorry for the artificial rainbow. Can\'t make it look more artificial!' },
      { id: 'aih_3', question: 'Which image is AI generated?', answer: 'Image 2', reward: 300, images: ['/aihuman/q3_img1.jpeg', '/aihuman/q3_img2.jpeg'], options: ['Image 1', 'Image 2'], reason: 'Sorry for the loss of the horse' },
      { id: 'aih_4', question: 'Which image is AI generated?', answer: 'Image 2', reward: 300, images: ['/aihuman/q4_img1.jpeg', '/aihuman/q4_img2.jpeg'], options: ['Image 1', 'Image 2'], reason: 'A little more obvious — Image 2 is AI generated (generated by nano banana)' },
      { id: 'aih_5', question: 'Which image is AI generated?', answer: 'Image 1', reward: 300, images: ['/aihuman/q5_img1.jpeg', '/aihuman/q5_img2.jpeg'], options: ['Image 1', 'Image 2'], reason: 'Image 1 is AI generated — check the brand name on the building outside' },
    ],
    reasoning: [
      { id: 'lr_1', question: 'A programmer notices that their program works correctly for small input sizes, but becomes very slow when the number of inputs increases significantly. The logic of the program is correct, but its performance degrades as input size grows. Which factor is MOST responsible for this behavior?', answer: 'B', reward: 400, options: ['Syntax', 'Algorithm efficiency', 'Data type', 'Compiler version'] },
      { id: 'lr_2', question: 'Two different algorithms solve the same problem. Algorithm A takes 2 sec for 1,000 inputs. Algorithm B takes 2 sec for 10,000 inputs. Which is better?', answer: 'B', reward: 400, options: ['Algorithm A', 'Algorithm B', 'Both same', 'Cannot say'] },
      { id: 'lr_3', question: 'A mobile app continues to show old data even after the server data has been updated. When the user clears the app storage and opens it again, the new data appears. Which part of the system is MOST likely responsible for storing the old data?', answer: 'B', reward: 400, options: ['Server RAM', 'Local cache', 'Network router', 'DNS server'] },
      { id: 'lr_4', question: 'Which memory is fastest but smallest?', answer: 'D', reward: 300, options: ['Hard disk', 'RAM', 'Cache', 'Register'] },
      { id: 'lr_5', question: 'The average of 6 numbers is 12. If one number is excluded, the average becomes 10. What is the excluded number?', answer: 'C', reward: 400, options: ['18', '20', '22', '24'] },
      { id: 'lr_6', question: 'Which identifier is invalid because it is a keyword?', answer: 'C', reward: 300, options: ['number', 'main', 'while', 'count'] },
      { id: 'lr_7', question: 'In a row of students: R is 10th from the left end. S is 15th from the right end. If there are 24 students in the row. How many students are between R and S?', answer: 'B', reward: 400, options: ['2', '3', '4', '5'] },
      { id: 'lr_8', question: 'Two different programs produce the same output for all possible inputs, but one uses half the memory and finishes in one-third of the time. Which statement is MOST logically correct?', answer: 'B', reward: 400, options: ['Both programs are equally efficient', 'The faster program has better time and space complexity', 'The slower program is more secure', 'The faster program must use parallel processing'] },
      { id: 'lr_9', question: 'A hacker sends many fake requests to a server so that real users cannot access it. Which pair correctly matches the attack and its effect?', answer: 'B', reward: 400, options: ['Phishing → Data corruption', 'DDoS → Service unavailability', 'Trojan → Password encryption', 'Spoofing → Hardware failure'] },
      { id: 'lr_10', question: 'Which one is an example of platform-independent code?', answer: 'B', reward: 300, options: ['C program compiled only for Windows', 'Java program running on JVM', 'Assembly code', 'Machine code'] },
      { id: 'lr_11', question: 'A developer writes code in a high-level language. The code is first converted into an intermediate form and then executed line by line. Which combination best describes this process?', answer: 'B', reward: 400, options: ['Compiler → Machine Code → CPU', 'Interpreter → Bytecode → Runtime', 'Source Code → Assembly → Loader', 'Compiler → Object Code → Linker'] },
      { id: 'lr_12', question: 'A developer writes a function that works correctly only when input size is small. For large inputs, the program becomes extremely slow, even though no errors occur. Which hidden issue is MOST likely present?', answer: 'B', reward: 400, options: ['Logical fallacy', 'Poor algorithmic complexity', 'Deadlock', 'Data redundancy'] },
    ]
  },
  level2: {
    easy: [
      { id: 'easy_1', question: 'Which code reverses the number n=1234?', answer: 'B', reward: 200, optionImages: { A: '/round2/easy_q1_optA.png', B: '/round2/easy_q1_optB.png', C: '/round2/easy_q1_optC.png', D: '/round2/easy_q1_optD.png' } },
      { id: 'easy_2', question: 'Which of the following program swaps two numbers without using a third variable?', answer: 'D', reward: 200, optionImages: { A: '/round2/easy_q2_optA.png', B: '/round2/easy_q2_optB.png', C: '/round2/easy_q2_optC.png', D: '/round2/easy_q2_optD.png' } },
      { id: 'easy_3', question: 'What will be the output of the following C program?', answer: 'B', reward: 200, codeImage: '/round2/easy_q3_code.png', options: ['1210', '-1', 'Compilation Error', 'No Output'] },
      { id: 'easy_4', question: 'What is the output of the following C program?', answer: 'A', reward: 200, codeImage: '/round2/easy_q4_code.png', options: ['Prime', 'Not Prime', 'Compilation Error', 'Infinite Loop'] },
      { id: 'easy_5', question: 'Which of the following programs correctly checks whether a number is Even or Odd without using the % operator?', answer: 'B', reward: 200, optionImages: { A: '/round2/easy_q5_optA.png', B: '/round2/easy_q5_optB.png', C: '/round2/easy_q5_optC.png', D: '/round2/easy_q5_optD.png' } },
      { id: 'easy_6', question: 'What is the output of this code?', answer: 'C', reward: 200, codeImage: '/round2/easy_q6_code.png', options: ['Vowels: 3, Consonants: 7', 'Vowels: 0, Consonants: 1', 'Vowels: 1, Consonants: 0', 'Vowels: 7, Consonants: 10'] },
    ],
    medium: [
      { id: 'med_1', question: 'Which of the following C code snippets correctly determines whether a given year is a Leap Year?', answer: 'B', reward: 350, optionImages: { A: '/round2/med_q1_optA.png', B: '/round2/med_q1_optB.png', C: '/round2/med_q1_optC.png', D: '/round2/med_q1_optD.png' } },
      { id: 'med_2', question: 'Which of the following recursive functions correctly returns the nth Fibonacci number?', answer: 'C', reward: 350, optionImages: { A: '/round2/med_q2_optA.png', B: '/round2/med_q2_optB.png', C: '/round2/med_q2_optC.png', D: '/round2/med_q2_optD.png' } },
      { id: 'med_3', question: 'What is the output of the following C program?', answer: 'C', reward: 350, codeImage: '/round2/med_q3_code.png', options: ['9474', '9475', 'False', 'Compilation Error'] },
      { id: 'med_4', question: 'What is the output of the following C program?', answer: 'B', reward: 350, codeImage: '/round2/med_q4_code.png', options: ['101101', '45', '44', 'Compilation Error'] },
      { id: 'med_5', question: 'Which of the following C programs correctly finds the missing number from an array containing distinct integers from 1 to N, where exactly one number is missing?', answer: 'B', reward: 350, optionImages: { A: '/round2/med_q5_optA.png', B: '/round2/med_q5_optB.png', C: '/round2/med_q5_optC.png', D: '/round2/med_q5_optD.png' } },
      { id: 'med_6', question: 'Which of the following C programs gives the output:\n7   9   8\n12  3   6\n5   14  11', answer: 'B', reward: 350, optionImages: { A: '/round2/med_q6_optA.png', B: '/round2/med_q6_optB.png', C: '/round2/med_q6_optC.png', D: '/round2/med_q6_optD.png' } },
    ],
    hard: [
      { id: 'hard_1', question: 'Which program correctly prints the first 5 rows of Pascal\'s Triangle?\n1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1', answer: 'A', reward: 500, optionImages: { A: '/round2/hard_q1_optA.png', B: '/round2/hard_q1_optB.png', C: '/round2/hard_q1_optC.png', D: '/round2/hard_q1_optD.png' } },
      { id: 'hard_2', question: 'What is the output of the below code?', answer: 'C', reward: 500, codeImage: '/round2/hard_q2_code.png', options: ['30\\n40\\n20', '20\\n40\\n30', '30\\n40\\n30', 'Compilation Error'] },
      { id: 'hard_3', question: 'What is the output of the below code?', answer: 'C', reward: 500, codeImage: '/round2/hard_q3_code.png', options: ['5', '10', '20', '0'] },
      { id: 'hard_4', question: 'Which code correctly prints this pattern?', answer: 'A', reward: 500, patternImage: '/round2/hard_q4_pattern.png', optionImages: { A: '/round2/hard_q4_optA.png', B: '/round2/hard_q4_optB.png', C: '/round2/hard_q4_optC.png', D: '/round2/hard_q4_optD.png' } },
    ],
  },
  level3: {
    compound: [
      {
        id: 'c_1',
        question: 'You are cracking safes in sequence. Variable tries starts at 0.\n\ntries ← 0\nfor code from 2 to 5 do\n    for attempt from 1 to code do\n        if (code * attempt) mod 3 = 0 then\n            tries ← tries + 2\n        else if attempt = 1 then\n            continue\n        else\n            tries ← tries - 1\nprint tries\n\nWhat is the final value of tries?\n\nA. 5\nB. 2\nC. 3\nD. 4',
        answer: 'D',
        reward: 250
      },
      {
        id: 'c_2',
        question: 'In a heist game, variable loot starts at 0.\n\nloot ← 0\nfor floor from 1 to 3 do\n    for locker from 1 to 3 do\n        if (floor + locker) mod 2 = 0 then\n            loot ← loot + (floor * locker)\n        else\n            loot ← loot - 1\nprint loot\n\nWhat is the final value printed for loot?\n\nA. 5\nB. 7\nC. 4\nD. 6',
        answer: 'D',
        reward: 250
      },
      {
        id: 'c_3',
        question: 'During a digital lockpick, hits counts success patterns.\n\nhits ← 0\nfor i from 1 to 4 do\n    for j from 1 to 4 do\n        if (i + j) mod 2 = 0 then\n            if i < j then\n                hits ← hits + 2\n            else\n                hits ← hits + 1\n        else\n            hits ← hits - 1\nprint hits\n\nWhat is the final value of hits?\n\nA. 4\nB. 7\nC. 5\nD. 6',
        answer: 'D',
        reward: 250
      }
    ],
    safe: [
      { id: 's_1', question: 'What is the output?\n\nx = 7\ny = 3\nresult = (x * y) + (x - y)\nprint(result)', answer: '2524', codes: ['2524', '1847', '3091', '4762'], correctIndex: 0, attempts: 3 },
      { id: 's_2', question: 'What is the output?\n\na = 15\nb = 4\nresult = (a % b) * 1000 + (a // b) * 100 + (a + b)\nprint(result)', answer: '3319', codes: ['3319', '4527', '1893', '7061'], correctIndex: 0, attempts: 3 },
      { id: 's_3', question: 'What is the output?\n\nn = 5\nresult = 1\nfor i in range(1, n+1):\n    result *= i\nprint(result % 10000)', answer: '0120', codes: ['0120', '5040', '3628', '7200'], correctIndex: 0, attempts: 3 },
      { id: 's_4', question: 'What is the output?\n\ndef mystery(n):\n    if n <= 1: return n\n    return mystery(n-1) + mystery(n-2)\nprint(mystery(10))', answer: '0055', codes: ['0055', '0089', '0034', '0144'], correctIndex: 0, attempts: 3 },
      { id: 's_5', question: 'What is the output?\n\narr = [3, 1, 4, 1, 5, 9, 2, 6]\narr.sort()\nresult = arr[0]*1000 + arr[1]*100 + arr[-2]*10 + arr[-1]\nprint(result)', answer: '1169', codes: ['1169', '2359', '3469', '4579'], correctIndex: 0, attempts: 3 }
    ]
  }
};

// Initialize sample teams
function initializeSampleTeams() {
  const teamNames = ['Cyber Wolves', 'Digital Pirates', 'Neon Raiders', 'Shadow Coders', 'Quantum Thieves'];
  teamNames.forEach((name, index) => {
    const teamId = uuidv4();
    const accessCode = `GDGTEAM${(index + 1).toString().padStart(2, '0')}`;
    gameState.teams[teamId] = {
      id: teamId,
      name: name,
      accessCode: accessCode,
      cash: 0,
      currentLevel: 1,
      completedChallenges: [],
      powerUps: [],
      heistStatus: 'none',
      isOnline: false,
      lastActive: new Date()
    };
    gameState.powerUps[teamId] = [];
    gameState.levelProgress[teamId] = {
      level1: { logo: [], aihuman: [], reasoning: [] },
      level2: { easy: [], medium: [], hard: [] },
      level3: { compound: [], heistTarget: null, heistStatus: 'none' }
    };
  });
}

initializeSampleTeams();

// Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/auth/team-login', (req, res) => {
  const { accessCode } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

  // AUTH-05: Rate limit team login attempts by IP
  if (!checkRateLimit(`team-login:${clientIp}`)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  const team = Object.values(gameState.teams).find(t => t.accessCode === accessCode);
  
  if (!team) {
    return res.status(401).json({ error: 'Invalid access code' });
  }
  
  const token = jwt.sign({ teamId: team.id, role: 'team' }, JWT_SECRET, { expiresIn: '8h' });
  team.isOnline = true;
  team.lastActive = new Date();
  
  io.emit('teamStatusUpdate', { teamId: team.id, isOnline: true });
  io.emit('leaderboardUpdate', getLeaderboard());
  
  res.json({ token, team: sanitizeTeam(team), powerUps: gameState.powerUps[team.id] });
});

app.post('/api/auth/admin-login', (req, res) => {
  const { password } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

  // AUTH-05: Rate limit admin login attempts by IP
  if (!checkRateLimit(`admin-login:${clientIp}`)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: 'admin' });
});

app.get('/api/teams', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  res.json(Object.values(gameState.teams));
});

app.get('/api/team/:teamId', authenticateToken, (req, res) => {
  // AUTH-07: Teams can only access their own data; admins can access any
  if (req.user.role === 'team' && req.user.teamId !== req.params.teamId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const team = gameState.teams[req.params.teamId];
  if (!team) return res.status(404).json({ error: 'Team not found' });
  
  res.json({
    team: sanitizeTeam(team),
    powerUps: gameState.powerUps[team.id],
    progress: gameState.levelProgress[team.id]
  });
});

// SEC-02: Leaderboard is intentionally public for spectators/display screens
app.get('/api/leaderboard', (req, res) => {
  res.json(getLeaderboard());
});

app.get('/api/announcements', authenticateToken, (req, res) => {
  const recent = gameState.announcements.slice(-10).reverse();
  res.json({ announcements: recent });
});

app.get('/api/event-config', authenticateToken, (req, res) => {
  res.json({ eventConfig: gameState.eventConfig });
});

app.get('/api/challenges/:level/:zone', authenticateToken, (req, res) => {
  const { level, zone } = req.params;
  const levelKey = `level${level}`;
  
  if (!challenges[levelKey] || !challenges[levelKey][zone]) {
    return res.status(404).json({ error: 'Challenge zone not found' });
  }
  
  const teamId = req.user.teamId;
  const progress = gameState.levelProgress[teamId];
  // Defensive: ensure zone array exists (may be missing if restored from old backup)
  if (progress && progress[levelKey] && !progress[levelKey][zone]) progress[levelKey][zone] = [];
  const completed = progress?.[levelKey]?.[zone] || [];
  
  // PU-01: Check if team has HINT_MASTER — if so, include hints in response
  const hasHintMaster = gameState.powerUps[teamId]?.some(p => p.id === 'HINT_MASTER');
  
  // Randomize question order per team using seeded shuffle
  const allChallenges = seededShuffle(challenges[levelKey][zone], teamId);
  
  const availableChallenges = allChallenges
    .filter(c => !completed.includes(c.id))
    .map(c => ({ ...c, answer: undefined, acceptedAnswers: undefined, hint: hasHintMaster ? c.hint : undefined }));
  
  const responseData = { challenges: availableChallenges, completed, hasHintMaster };
  
  // For Level 2, include cross-section progress so frontend can enforce limits
  if (level === '2' || level === 2) {
    const l2 = progress?.level2 || {};
    const sectionKeys = Object.keys(challenges.level2);
    const sectionProgress = {};
    sectionKeys.forEach(k => { sectionProgress[k] = (l2[k] || []).length; });
    const totalCompleted = Object.values(sectionProgress).reduce((a, b) => a + b, 0);
    responseData.level2Progress = { sectionProgress, totalCompleted, maxPerSection: 3, maxTotal: 6 };
  }
  
  res.json(responseData);
});

app.post('/api/challenges/submit', authenticateToken, (req, res) => {
  const { challengeId, answer, level, zone } = req.body;
  const teamId = req.user.teamId;
  const team = gameState.teams[teamId];
  
  if (!team) return res.status(404).json({ error: 'Team not found' });
  
  const levelKey = `level${level}`;
  const challenge = challenges[levelKey]?.[zone]?.find(c => c.id === challengeId);
  
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  
  const progress = gameState.levelProgress[teamId];
  // Defensive: ensure zone array exists (may be missing if restored from old backup)
  if (!progress[levelKey]) progress[levelKey] = {};
  if (!progress[levelKey][zone]) progress[levelKey][zone] = [];
  if (progress[levelKey][zone].includes(challengeId)) {
    return res.status(400).json({ error: 'Challenge already completed' });
  }
  
  // L2-01: For Level 2, enforce max 3 per section and max 6 total
  if (level === 2 || level === '2') {
    const l2 = progress.level2;
    const sectionKeys = Object.keys(challenges.level2); // ['easy', 'medium', 'hard']
    const thisZoneCompleted = (l2[zone] || []).length;
    if (thisZoneCompleted >= 3) {
      return res.status(400).json({ 
        error: 'You have reached the maximum of 3 questions for this section.',
        maxReached: true
      });
    }
    const totalCompleted = sectionKeys.reduce((sum, k) => sum + (l2[k] || []).length, 0);
    if (totalCompleted >= 6) {
      return res.status(400).json({ 
        error: 'You have answered all 6 allowed Level 2 questions.',
        allDone: true
      });
    }
  }
  
  // RT-01: Prevent double-submit race condition with a lock
  const lockKey = `${teamId}:${challengeId}`;
  if (submissionLocks.has(lockKey)) {
    return res.status(409).json({ error: 'Submission already in progress' });
  }
  submissionLocks.add(lockKey);
  
  try {
    // Support acceptedAnswers array for multiple valid answers
    const userAnswer = answer.toLowerCase().trim();
    const validAnswers = challenge.acceptedAnswers
      ? challenge.acceptedAnswers.map(a => a.toLowerCase().trim())
      : [challenge.answer.toLowerCase().trim()];
    const isCorrect = validAnswers.includes(userAnswer);
    
    if (isCorrect) {
      // PU-04: Apply difficulty multiplier from event config
      let reward = Math.round(challenge.reward * (gameState.eventConfig.difficultyMultiplier || 1));
      
      // Check for double cash power-up
      const doubleCashIndex = gameState.powerUps[teamId].findIndex(p => p.id === 'DOUBLE_CASH');
      if (doubleCashIndex !== -1) {
        reward *= 2;
        gameState.powerUps[teamId].splice(doubleCashIndex, 1);
      }
      
      team.cash += reward;
      progress[levelKey][zone].push(challengeId);
      
      // Auto-grant power-ups based on milestones
      checkAndGrantPowerUps(teamId);
      
      io.emit('leaderboardUpdate', getLeaderboard());
      io.to(teamId).emit('teamUpdate', { team: sanitizeTeam(team), powerUps: gameState.powerUps[teamId] });
      
      res.json({ success: true, correct: true, reward, newCash: team.cash });
    } else {
      const penalty = Math.round((challenge.penalty || 0) * (gameState.eventConfig.difficultyMultiplier || 1));
      // DASH-01: Floor cash at 0
      team.cash = Math.max(0, team.cash - penalty);

      // For aihuman/reasoning/L2 zones, mark as completed even on wrong answer so it doesn't reappear
      const markCompletedOnWrong = ['aihuman', 'reasoning', 'easy', 'medium', 'hard'];
      if (markCompletedOnWrong.includes(zone)) {
        progress[levelKey][zone].push(challengeId);
      }
      
      io.emit('leaderboardUpdate', getLeaderboard());
      io.to(teamId).emit('teamUpdate', { team: sanitizeTeam(team), powerUps: gameState.powerUps[teamId] });
      
      res.json({ success: true, correct: false, penalty, newCash: team.cash });
    }
  } finally {
    submissionLocks.delete(lockKey);
  }
});

// L3-06: Helper to fail a heist (reusable for timer expiry, max attempts, and cleanup)
function failHeist(heist, reason) {
  const attacker = gameState.teams[heist.attackerId];
  const target = gameState.teams[heist.targetTeamId];
  
  if (!attacker || !target || heist.status !== 'active') return 0;
  
  const transferAmount = Math.floor(attacker.cash * 0.3);
  attacker.cash = Math.max(0, attacker.cash - transferAmount);
  target.cash += transferAmount;
  
  heist.status = 'failed';
  attacker.heistStatus = 'none';
  target.heistStatus = 'none';
  
  io.emit('heistResult', { 
    success: false, 
    attackerName: attacker.name, 
    targetName: target.name,
    transferAmount,
    reason
  });
  io.emit('leaderboardUpdate', getLeaderboard());
  // Release target lock
  io.emit('targetLockUpdate', { targetTeamId: heist.targetTeamId, locked: false });
  return transferAmount;
}

// GET /api/heist/locks — return current target locks for all teams
app.get('/api/heist/locks', authenticateToken, (req, res) => {
  // Return which targets are locked and active heists
  const locks = {};
  Object.values(gameState.heists).forEach(h => {
    if (h.status === 'active') {
      locks[h.targetTeamId] = { attackerId: h.attackerId, heistId: h.id };
    }
  });
  res.json({ locks });
});

// POST /api/heist/use-powerup — defender uses powerup during heist
app.post('/api/heist/use-powerup', authenticateToken, (req, res) => {
  const { powerUpType } = req.body;
  const teamId = req.user.teamId;
  const team = gameState.teams[teamId];
  if (!team) return res.status(404).json({ error: 'Team not found' });

  // Find the active heist where this team is defending
  const heist = Object.values(gameState.heists).find(
    h => h.targetTeamId === teamId && h.status === 'active'
  );
  if (!heist) return res.status(400).json({ error: 'No active heist against your team' });

  if (powerUpType === 'FREEZE_TIMER') {
    // Reduce attacker timer by 30 seconds
    heist.timeLimit = Math.max(30, heist.timeLimit - 30);
    heist.freezeApplied = (heist.freezeApplied || 0) + 1;
    io.to(heist.attackerId).emit('heistTimerFreeze', { reduction: 30, newTimeLimit: heist.timeLimit });
    io.to(teamId).emit('notification', { type: 'success', message: 'Freeze Timer activated! Attacker lost 30 seconds.' });
    return res.json({ success: true, effect: 'freeze_timer', reduction: 30 });
  }

  if (powerUpType === 'GUARDIAN_ANGEL') {
    // Reduce stolen money by 25%
    heist.guardianAngelStacks = (heist.guardianAngelStacks || 0) + 1;
    io.to(teamId).emit('notification', { type: 'success', message: 'Guardian Angel activated! Stolen money reduced by 25%.' });
    return res.json({ success: true, effect: 'guardian_angel', stacks: heist.guardianAngelStacks });
  }

  return res.status(400).json({ error: 'Invalid power-up type' });
});

app.post('/api/heist/initiate', authenticateToken, (req, res) => {
  const { targetTeamId } = req.body;
  const attackerId = req.user.teamId;
  
  if (attackerId === targetTeamId) {
    return res.status(400).json({ error: 'Cannot heist your own team' });
  }
  
  const attacker = gameState.teams[attackerId];
  const target = gameState.teams[targetTeamId];
  
  if (!attacker || !target) {
    return res.status(404).json({ error: 'Team not found' });
  }

  // L3-04: Prevent concurrent heists on same target (Target Lock)
  const activeHeistOnTarget = Object.values(gameState.heists).find(
    h => h.targetTeamId === targetTeamId && h.status === 'active'
  );
  if (activeHeistOnTarget) {
    return res.status(400).json({ error: 'Target Locked — another team is already heisting them', locked: true });
  }

  // Prevent attacker from running two heists at once
  const activeHeistByAttacker = Object.values(gameState.heists).find(
    h => h.attackerId === attackerId && h.status === 'active'
  );
  if (activeHeistByAttacker) {
    return res.status(400).json({ error: 'You already have an active heist' });
  }
  
  // Check if target has shield
  const shieldIndex = gameState.powerUps[targetTeamId].findIndex(p => p.id === 'SHIELD');
  if (shieldIndex !== -1) {
    gameState.powerUps[targetTeamId].splice(shieldIndex, 1);
    io.to(targetTeamId).emit('heistBlocked', { attackerName: attacker.name });
    io.to(targetTeamId).emit('teamUpdate', { team: sanitizeTeam(target), powerUps: gameState.powerUps[targetTeamId] });
    return res.json({ blocked: true, message: 'Target had a shield! Heist blocked.' });
  }
  
  let timeLimit = gameState.eventConfig.heistTimeLimit; // 600s = 10 minutes
  
  // PU-02: Check for TIME_FREEZE on attacker — adds 60s to their heist timer
  const timeFreezeIndex = gameState.powerUps[attackerId].findIndex(p => p.id === 'TIME_FREEZE');
  if (timeFreezeIndex !== -1) {
    timeLimit += POWER_UPS.TIME_FREEZE.effect.addTime;
    gameState.powerUps[attackerId].splice(timeFreezeIndex, 1);
    io.to(attackerId).emit('teamUpdate', { team: sanitizeTeam(attacker), powerUps: gameState.powerUps[attackerId] });
  }
  
  // Pick 5 random compound challenges for this heist
  const heistId = uuidv4();
  const shuffled = seededShuffle(challenges.level3.compound, heistId + attackerId);
  const heistCompoundChallenges = shuffled.slice(0, 5);

  gameState.heists[heistId] = {
    id: heistId,
    attackerId,
    targetTeamId,
    stage: 'compound',
    compoundProgress: [],
    compoundWrongAnswers: 0, // Track wrong answers (3 = fail)
    safeAttempts: 0,
    safeChallengeIndex: null,
    timeLimit,
    startTime: Date.now(),
    status: 'active',
    guardianAngelStacks: 0, // Defender powerup stacks
    freezeApplied: 0,
    compoundChallengeIds: heistCompoundChallenges.map(c => c.id) // Which questions were assigned
  };
  
  attacker.heistStatus = 'attacking';
  target.heistStatus = 'defending';
  
  io.to(targetTeamId).emit('heistAlert', { attackerName: attacker.name, heistId });
  io.emit('heistStarted', { attackerName: attacker.name, targetName: target.name, heistId });
  // Broadcast lock update
  io.emit('targetLockUpdate', { targetTeamId, locked: true, attackerId });
  
  res.json({ 
    heistId, 
    timeLimit,
    totalCompoundQuestions: heistCompoundChallenges.length,
    compoundChallenges: heistCompoundChallenges.map(c => ({ id: c.id, question: c.question }))
  });
});

app.post('/api/heist/compound', authenticateToken, (req, res) => {
  const { heistId, challengeId, answer } = req.body;
  const heist = gameState.heists[heistId];
  
  if (!heist || heist.attackerId !== req.user.teamId) {
    return res.status(400).json({ error: 'Invalid heist' });
  }

  // L3-01: Server-side timer validation
  const elapsed = Date.now() - heist.startTime;
  if (elapsed > (heist.timeLimit + 5) * 1000) {
    failHeist(heist, 'Time expired');
    return res.status(400).json({ error: 'Heist time expired', heistFailed: true });
  }
  
  const challenge = challenges.level3.compound.find(c => c.id === challengeId);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  
  const isCorrect = answer.toLowerCase().trim() === challenge.answer.toLowerCase().trim();
  
  if (isCorrect) {
    heist.compoundProgress.push(challengeId);
    const totalNeeded = heist.compoundChallengeIds ? heist.compoundChallengeIds.length : challenges.level3.compound.length;
    
    if (heist.compoundProgress.length >= totalNeeded) {
      heist.stage = 'safe';
      const safeIndex = Math.floor(Math.random() * challenges.level3.safe.length);
      heist.safeChallengeIndex = safeIndex;
      const safeChallenge = challenges.level3.safe[safeIndex];
      return res.json({ 
        success: true, 
        correct: true,
        stageComplete: true, 
        nextStage: 'safe',
        safeChallenge: {
          id: safeChallenge.id,
          question: safeChallenge.question,
          codes: safeChallenge.codes // Send all 4 codes; player must pick right one
        }
      });
    }
    
    res.json({ success: true, correct: true, progress: heist.compoundProgress.length, total: totalNeeded });
  } else {
    // Wrong answer tracking
    heist.compoundWrongAnswers = (heist.compoundWrongAnswers || 0) + 1;
    
    // Alert defending team
    const attacker = gameState.teams[heist.attackerId];
    io.to(heist.targetTeamId).emit('heistWrongAnswer', { 
      attackerName: attacker?.name, 
      wrongCount: heist.compoundWrongAnswers,
      message: 'Your vault is being robbed!' 
    });
    
    // 3 wrong answers = heist fails
    if (heist.compoundWrongAnswers >= 3) {
      const transferAmount = failHeist(heist, 'Too many wrong answers in compound stage');
      return res.json({ 
        success: true, 
        correct: false, 
        heistFailed: true, 
        wrongCount: heist.compoundWrongAnswers,
        transferAmount,
        message: '3 wrong answers! Heist failed!' 
      });
    }
    
    res.json({ 
      success: true, 
      correct: false, 
      wrongCount: heist.compoundWrongAnswers,
      wrongRemaining: 3 - heist.compoundWrongAnswers 
    });
  }
});

app.post('/api/heist/safe', authenticateToken, (req, res) => {
  const { heistId, answer } = req.body;
  const heist = gameState.heists[heistId];
  
  if (!heist || heist.attackerId !== req.user.teamId || heist.stage !== 'safe') {
    return res.status(400).json({ error: 'Invalid heist state' });
  }

  // L3-01: Server-side timer validation
  const elapsed = Date.now() - heist.startTime;
  if (elapsed > (heist.timeLimit + 5) * 1000) {
    failHeist(heist, 'Time expired');
    return res.status(400).json({ error: 'Heist time expired', heistFailed: true });
  }
  
  // L3-03: Use the safe challenge that was actually assigned to this heist
  const safeChallenge = challenges.level3.safe[heist.safeChallengeIndex ?? 0];
  // L3-02: Strict equality match instead of .includes()
  const isCorrect = answer.toLowerCase().trim() === safeChallenge.answer.toLowerCase().trim();
  
  heist.safeAttempts++;
  
  const attacker = gameState.teams[heist.attackerId];
  const target = gameState.teams[heist.targetTeamId];
  
  if (isCorrect) {
    // Calculate money percentage based on elapsed time (100% -> -5% per minute)
    const elapsedMs = Date.now() - heist.startTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const moneyPercent = Math.max(50, 100 - (elapsedMinutes * 5)); // min 50%
    
    // Apply guardian angel stacks (each reduces by 25%)
    let guardianReduction = 1;
    for (let i = 0; i < (heist.guardianAngelStacks || 0); i++) {
      guardianReduction *= 0.75; // Each stack reduces by 25%
    }
    
    const baseSteal = Math.floor(target.cash * (moneyPercent / 100));
    const stolenAmount = Math.floor(baseSteal * guardianReduction);
    target.cash -= stolenAmount;
    attacker.cash += stolenAmount;
    
    heist.status = 'success';
    attacker.heistStatus = 'none';
    target.heistStatus = 'none';
    
    io.emit('heistResult', { 
      success: true, 
      attackerName: attacker.name, 
      targetName: target.name,
      stolenAmount 
    });
    io.emit('leaderboardUpdate', getLeaderboard());
    // Release target lock
    io.emit('targetLockUpdate', { targetTeamId: heist.targetTeamId, locked: false });
    
    res.json({ success: true, heistSuccess: true, stolenAmount, moneyPercent, guardianReduction });
  } else if (heist.safeAttempts >= 3) {
    // Heist failed - use shared helper
    const transferAmount = failHeist(heist, 'Max safe attempts exceeded');
    // Alert defender they can use Guardian Angel
    io.to(heist.targetTeamId).emit('heistWrongCode', { wrongCount: heist.safeAttempts });
    res.json({ success: true, heistSuccess: false, transferAmount });
  } else {
    // Wrong code — alert defender
    io.to(heist.targetTeamId).emit('heistWrongCode', { wrongCount: heist.safeAttempts });
    res.json({ success: true, correct: false, attemptsRemaining: 3 - heist.safeAttempts });
  }
});

// L3-06: Server-side heist timeout cleanup — check every 15s for expired heists
setInterval(() => {
  const now = Date.now();
  Object.values(gameState.heists).forEach(heist => {
    if (heist.status === 'active' && (now - heist.startTime) > (heist.timeLimit + 10) * 1000) {
      console.log(`[HEIST-CLEANUP] Auto-expiring heist ${heist.id} (elapsed: ${Math.round((now - heist.startTime)/1000)}s)`);
      failHeist(heist, 'Time expired (server cleanup)');
    }
  });
}, 15000);

// ── Fullscreen enforcement routes ────────────────────────────────────
app.get('/api/team/fullscreen-status', authenticateToken, (req, res) => {
  const teamId = req.user.teamId;
  if (!teamId) return res.status(400).json({ error: 'Not a team user' });
  const record = gameState.fullscreenViolations[teamId] || { violations: 0, disqualified: false };
  res.json(record);
});

app.post('/api/team/fullscreen-violation', authenticateToken, (req, res) => {
  const teamId = req.user.teamId;
  if (!teamId) return res.status(400).json({ error: 'Not a team user' });
  const { violations } = req.body;
  if (!gameState.fullscreenViolations[teamId]) {
    gameState.fullscreenViolations[teamId] = { violations: 0, disqualified: false };
  }
  gameState.fullscreenViolations[teamId].violations = violations;
  const team = gameState.teams[teamId];
  console.log(`[FULLSCREEN] Team ${team?.name || teamId} violation #${violations}`);
  // Alert admins in real-time
  io.to('admin').emit('fullscreenViolation', { teamId, teamName: team?.name, violations });
  res.json({ success: true, violations });
});

app.post('/api/team/fullscreen-disqualify', authenticateToken, (req, res) => {
  const teamId = req.user.teamId;
  if (!teamId) return res.status(400).json({ error: 'Not a team user' });
  if (!gameState.fullscreenViolations[teamId]) {
    gameState.fullscreenViolations[teamId] = { violations: 3, disqualified: true };
  } else {
    gameState.fullscreenViolations[teamId].disqualified = true;
  }
  const team = gameState.teams[teamId];
  console.log(`[FULLSCREEN] Team ${team?.name || teamId} DISQUALIFIED`);
  io.to('admin').emit('teamDisqualified', { teamId, teamName: team?.name });
  res.json({ success: true });
});

// Admin routes
app.post('/api/admin/add-cash', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  const { teamId, amount } = req.body;
  const team = gameState.teams[teamId];
  
  if (!team) return res.status(404).json({ error: 'Team not found' });
  
  team.cash = Math.max(0, team.cash + amount); // DASH-01: Cash floor at 0
  logAdminAction('add-cash', { teamId, teamName: team.name, amount, newCash: team.cash });
  io.emit('leaderboardUpdate', getLeaderboard());
  io.to(teamId).emit('teamUpdate', { team: sanitizeTeam(team), powerUps: gameState.powerUps[teamId] });
  io.to(teamId).emit('notification', { type: 'cash', message: `Admin ${amount >= 0 ? 'added' : 'deducted'} $${Math.abs(amount)}` });
  
  res.json({ success: true, newCash: team.cash });
});

app.post('/api/admin/drop-powerup', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  const { teamId, powerUpId } = req.body;
  const team = gameState.teams[teamId];
  
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (!POWER_UPS[powerUpId]) return res.status(400).json({ error: 'Invalid power-up' });
  
  // PU-03: Limit stacking — max 2 of the same power-up per team
  const sameCount = gameState.powerUps[teamId].filter(p => p.id === powerUpId).length;
  if (sameCount >= 2) {
    return res.status(400).json({ error: `Team already has ${sameCount}x ${POWER_UPS[powerUpId].name}. Max 2 per type.` });
  }
  
  gameState.powerUps[teamId].push(POWER_UPS[powerUpId]);
  logAdminAction('drop-powerup', { teamId, teamName: team.name, powerUpId });
  io.to(teamId).emit('powerUpReceived', POWER_UPS[powerUpId]);
  io.to(teamId).emit('teamUpdate', { team: sanitizeTeam(team), powerUps: gameState.powerUps[teamId] });
  
  res.json({ success: true });
});

app.post('/api/admin/remove-powerup', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  const { teamId, powerUpId } = req.body;
  const team = gameState.teams[teamId];
  
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (!POWER_UPS[powerUpId]) return res.status(400).json({ error: 'Invalid power-up' });
  
  const idx = gameState.powerUps[teamId].findIndex(p => p.id === powerUpId);
  if (idx === -1) return res.status(404).json({ error: 'Power-up not found' });
  
  gameState.powerUps[teamId].splice(idx, 1);
  logAdminAction('remove-powerup', { teamId, teamName: team.name, powerUpId });
  io.to(teamId).emit('teamUpdate', { team: sanitizeTeam(team), powerUps: gameState.powerUps[teamId] });
  io.to(teamId).emit('notification', { type: 'info', message: `Admin removed power-up: ${POWER_UPS[powerUpId].name}` });
  
  res.json({ success: true });
});

app.post('/api/admin/set-level', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  const { level } = req.body;
  gameState.eventConfig.currentLevel = level;
  
  // Update all teams to new level
  Object.values(gameState.teams).forEach(team => {
    team.currentLevel = level;
  });
  
  logAdminAction('set-level', { level });
  io.emit('levelChange', { level });
  io.emit('leaderboardUpdate', getLeaderboard());
  
  res.json({ success: true, currentLevel: level });
});

app.post('/api/admin/delete-team', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  const { teamId } = req.body;
  if (!teamId || !gameState.teams[teamId]) {
    return res.status(404).json({ error: 'Team not found' });
  }
  
  const teamName = gameState.teams[teamId].name;
  delete gameState.teams[teamId];
  delete gameState.powerUps[teamId];
  delete gameState.levelProgress[teamId];
  
  // Remove any active heists involving this team
  for (const [heistId, heist] of Object.entries(gameState.heists)) {
    if (heist.attackerId === teamId || heist.targetTeamId === teamId) {
      delete gameState.heists[heistId];
    }
  }
  
  logAdminAction('delete-team', { teamId, teamName });
  io.emit('leaderboardUpdate', getLeaderboard());
  
  res.json({ success: true });
});

app.post('/api/admin/create-team', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  const { name } = req.body;
  const teamId = uuidv4();
  // Generate sequential access code GDGTEAM01, GDGTEAM02, etc.
  const existingCodes = Object.values(gameState.teams)
    .map(t => t.accessCode)
    .filter(c => /^GDGTEAM\d{2}$/.test(c))
    .map(c => parseInt(c.replace('GDGTEAM', ''), 10));
  const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
  const accessCode = 'GDGTEAM' + String(nextNum).padStart(2, '0');
  
  gameState.teams[teamId] = {
    id: teamId,
    name: name,
    accessCode: accessCode,
    cash: 0,
    currentLevel: gameState.eventConfig.currentLevel,
    completedChallenges: [],
    powerUps: [],
    heistStatus: 'none',
    isOnline: false,
    lastActive: new Date()
  };
  gameState.powerUps[teamId] = [];
  gameState.levelProgress[teamId] = {
    level1: { logo: [], aihuman: [], reasoning: [] },
    level2: { brain: [], nocode: [], prompt: [], attempted: false },
    level3: { compound: [], heistTarget: null, heistStatus: 'none' }
  };
  
  logAdminAction('create-team', { teamId, teamName: name, accessCode });
  io.emit('leaderboardUpdate', getLeaderboard());
  
  res.json({ success: true, team: gameState.teams[teamId] });
});

app.get('/api/admin/event-state', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  res.json({
    teams: Object.values(gameState.teams).map(team => ({
      ...team,
      powerUps: gameState.powerUps[team.id] || []
    })),
    eventConfig: gameState.eventConfig,
    heists: Object.values(gameState.heists).filter(h => h.status === 'active'),
    powerUps: POWER_UPS,
    powerUpsByTeam: gameState.powerUps,
    fullscreenViolations: gameState.fullscreenViolations
  });
});

app.post('/api/admin/disqualify-team', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { teamId } = req.body;
  const team = gameState.teams[teamId];
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (!gameState.fullscreenViolations[teamId]) {
    gameState.fullscreenViolations[teamId] = { violations: 3, disqualified: true };
  } else {
    gameState.fullscreenViolations[teamId].disqualified = true;
  }
  logAdminAction('disqualify-team', { teamId, teamName: team.name });
  // Notify the team in real-time
  io.to(teamId).emit('disqualified', { reason: 'Admin disqualification' });
  res.json({ success: true });
});

app.post('/api/admin/undisqualify-team', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { teamId } = req.body;
  const team = gameState.teams[teamId];
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (gameState.fullscreenViolations[teamId]) {
    gameState.fullscreenViolations[teamId].disqualified = false;
    gameState.fullscreenViolations[teamId].violations = 0;
  }
  logAdminAction('undisqualify-team', { teamId, teamName: team.name });
  io.to(teamId).emit('undisqualified', {});
  res.json({ success: true });
});

app.post('/api/admin/announcement', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  const { message, type } = req.body;
  // SEC-05: Basic input sanitization — strip HTML tags
  const sanitizedMessage = (message || '').replace(/<[^>]*>/g, '').trim();
  if (!sanitizedMessage) return res.status(400).json({ error: 'Message cannot be empty' });
  const sanitizedType = ['info', 'warning', 'success', 'error'].includes(type) ? type : 'info';
  
  const announcement = { id: uuidv4(), message: sanitizedMessage, type: sanitizedType, timestamp: new Date() };
  gameState.announcements.push(announcement);
  
  logAdminAction('announcement', { message, type });
  io.emit('announcement', announcement);
  
  res.json({ success: true });
});

// Helper functions
function sanitizeTeam(team) {
  return {
    id: team.id,
    name: team.name,
    cash: team.cash,
    currentLevel: team.currentLevel,
    heistStatus: team.heistStatus,
    isOnline: team.isOnline
  };
}

function getLeaderboard() {
  return Object.values(gameState.teams)
    .map(t => ({
      id: t.id,
      name: t.name,
      cash: t.cash,
      currentLevel: t.currentLevel,
      isOnline: t.isOnline,
      heistStatus: t.heistStatus
    }))
    .sort((a, b) => b.cash - a.cash);
}

function checkAndGrantPowerUps(teamId) {
  const team = gameState.teams[teamId];
  const progress = gameState.levelProgress[teamId];
  
  // Grant power-ups based on achievements
  const totalCompleted = 
    progress.level1.logo.length + 
    progress.level1.aihuman.length + 
    progress.level1.reasoning.length;
  
  if (totalCompleted === 3 && !team.completedChallenges.includes('first_three')) {
    gameState.powerUps[teamId].push(POWER_UPS.HINT_MASTER);
    team.completedChallenges.push('first_three');
    io.to(teamId).emit('powerUpReceived', POWER_UPS.HINT_MASTER);
  }
  
  if (team.cash >= 2000 && !team.completedChallenges.includes('cash_2k')) {
    gameState.powerUps[teamId].push(POWER_UPS.GUARDIAN_ANGEL);
    team.completedChallenges.push('cash_2k');
    io.to(teamId).emit('powerUpReceived', POWER_UPS.GUARDIAN_ANGEL);
  }
  
  if (team.cash >= 5000 && !team.completedChallenges.includes('cash_5k')) {
    gameState.powerUps[teamId].push(POWER_UPS.SHIELD);
    team.completedChallenges.push('cash_5k');
    io.to(teamId).emit('powerUpReceived', POWER_UPS.SHIELD);
  }
}

// AUTH-08/SEC-03: Socket.IO authentication middleware (skip on Vercel)
if (!IS_VERCEL) io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Socket.io connection handling (skip on Vercel)
if (!IS_VERCEL) io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, '| user:', socket.user?.teamId || socket.user?.role);
  
  socket.on('joinTeamRoom', (teamId) => {
    // AUTH-08: Verify socket user matches the team room they're joining
    if (socket.user.role !== 'admin' && socket.user.teamId !== teamId) {
      console.warn(`[SOCKET-AUTH] Rejected: ${socket.id} tried to join room ${teamId} but is ${socket.user.teamId}`);
      return;
    }
    // AUTH-06: Limit concurrent connections per team (max 5 sockets)
    const existingConnections = [...socketTeamMap.values()].filter(id => id === teamId).length;
    if (existingConnections >= 5) {
      console.warn(`[AUTH-06] Team ${teamId} exceeded max connections (${existingConnections})`);
      socket.emit('sessionLimit', { message: 'Too many active sessions for this team. Close other tabs/devices.' });
      return;
    }
    socket.join(teamId);
    // AUTH-09: Track which team this socket belongs to
    socketTeamMap.set(socket.id, teamId);
    if (gameState.teams[teamId]) {
      gameState.teams[teamId].online = true;
      io.to('admin').emit('teamStatusUpdate', { teamId, online: true });
    }
    console.log(`Socket ${socket.id} joined team room ${teamId}`);
  });
  
  socket.on('joinAdminRoom', () => {
    // AUTH-08: Only admins can join admin room
    if (socket.user.role !== 'admin') {
      console.warn(`[SOCKET-AUTH] Rejected: ${socket.id} tried to join admin room but is not admin`);
      return;
    }
    socket.join('admin');
    console.log(`Socket ${socket.id} joined admin room`);
  });
  
  socket.on('disconnect', () => {
    // AUTH-09: Clear online status on disconnect
    const teamId = socketTeamMap.get(socket.id);
    if (teamId) {
      socketTeamMap.delete(socket.id);
      // Only mark offline if no other sockets for this team
      const stillConnected = [...socketTeamMap.values()].includes(teamId);
      if (!stillConnected && gameState.teams[teamId]) {
        gameState.teams[teamId].online = false;
        io.to('admin').emit('teamStatusUpdate', { teamId, online: false });
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

// PERF-01: Best-effort periodic auto-save to JSON file (no database per constraints)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAVE_FILE = path.join(__dirname, 'gamestate-backup.json');

function autoSaveState() {
  try {
    const saveData = {
      teams: gameState.teams,
      powerUps: gameState.powerUps,
      levelProgress: gameState.levelProgress,
      eventConfig: gameState.eventConfig,
      announcements: gameState.announcements,
      savedAt: new Date().toISOString()
    };
    fs.writeFileSync(SAVE_FILE, JSON.stringify(saveData, null, 2));
    console.log(`[AUTO-SAVE] State saved at ${saveData.savedAt}`);
  } catch (err) {
    console.error('[AUTO-SAVE] Failed:', err.message);
  }
}

// Auto-save every 60 seconds (disable on serverless)
if (!IS_VERCEL) {
  setInterval(autoSaveState, 60000);
}

// Load saved state on startup if available (skip on Vercel — filesystem is read-only)
if (!IS_VERCEL) try {
  if (fs.existsSync(SAVE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf-8'));
    if (saved.teams && Object.keys(saved.teams).length > 0) {
      console.log(`[AUTO-SAVE] Restoring state from ${saved.savedAt}`);
      gameState.teams = saved.teams;
      gameState.powerUps = saved.powerUps || gameState.powerUps;
      gameState.levelProgress = saved.levelProgress || gameState.levelProgress;
      gameState.eventConfig = saved.eventConfig || gameState.eventConfig;
      gameState.announcements = saved.announcements || gameState.announcements;
    }
  }
} catch (err) {
  console.warn('[AUTO-SAVE] Could not restore state:', err.message);
}

const PORT = process.env.PORT || 3001;

if (!IS_VERCEL) {
  server.listen(PORT, () => {
    console.log(`🎮 LEVEL UP Server running on port ${PORT}`);
    console.log(`📊 ${Object.keys(gameState.teams).length} teams initialized`);
    // Save on startup to confirm file is writable
    autoSaveState();
  });
}

export { app };
