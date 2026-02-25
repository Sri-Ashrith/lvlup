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
  eventConfig: {
    currentLevel: 1,
    isEventActive: true,
    levelTimers: {
      1: 45 * 60, // 45 minutes
      2: 60 * 60, // 60 minutes
      3: 45 * 60  // 45 minutes
    },
    heistTimeLimit: 180, // 3 minutes
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

// Challenge data for each level
const challenges = {
  level1: {
    logic: [
      { id: 'l1_1', question: 'A man has 53 socks in his drawer: 21 identical blue, 15 identical black, and 17 identical red. The room is dark, how many socks must he pull out to be sure he has a matching pair?', answer: '4', reward: 500, hint: 'Think about worst case scenario with colors' },
      { id: 'l1_2', question: 'What comes next: 1, 1, 2, 3, 5, 8, ?', answer: '13', reward: 400, hint: 'Fibonacci sequence' },
      { id: 'l1_3', question: 'What is 1+1?', answer: '2', reward: 600, hint: 'Basic arithmetic' }
    ],
    ai: [
      { id: 'ai_1', question: 'What does GPT stand for?', answer: 'Generative Pre-trained Transformer', reward: 300, hint: 'Three words starting with G, P, T' },
      { id: 'ai_2', question: 'Which company created ChatGPT?', answer: 'OpenAI', reward: 250, hint: 'They also made DALL-E' },
      { id: 'ai_3', question: 'What is the process called when an AI model learns from labeled data?', answer: 'Supervised Learning', reward: 400, hint: 'The AI has a supervisor/teacher' }
    ],
    tech: [
      { id: 'tech_1', question: 'What does HTML stand for?', answer: 'HyperText Markup Language', reward: 200, hint: 'It\'s about marking up hypertext' },
      { id: 'tech_2', question: 'Which programming language is known as the backbone of web interactivity?', answer: 'JavaScript', reward: 300, hint: 'Not to be confused with Java' },
      { id: 'tech_3', question: 'What does API stand for?', answer: 'Application Programming Interface', reward: 350, hint: 'It\'s an interface for programming applications' }
    ]
  },
  level2: {
    brain: [
      { id: 'brain_1', question: 'Write a function to check if a string is a palindrome (describe the logic)', answer: 'Compare string with its reverse', reward: 1000, penalty: 200, hint: 'Think about string reversal' },
      { id: 'brain_2', question: 'What is the time complexity of binary search?', answer: 'O(log n)', reward: 800, penalty: 150, hint: 'Divides the search space in half each time' },
      { id: 'brain_3', question: 'Explain the difference between stack and queue', answer: 'Stack is LIFO, Queue is FIFO', reward: 900, penalty: 180, hint: 'Think about order of removal' }
    ],
    nocode: [
      { id: 'nc_1', question: 'Name a popular no-code platform for building websites', answer: 'Webflow', reward: 600, penalty: 100, hint: 'Flows on the web' },
      { id: 'nc_2', question: 'What no-code tool is commonly used for database management?', answer: 'Airtable', reward: 550, penalty: 100, hint: 'It\'s like a table in the air' },
      { id: 'nc_3', question: 'Which platform allows you to automate workflows between apps without coding?', answer: 'Zapier', reward: 650, penalty: 120, hint: 'Zaps things together' }
    ],
    prompt: [
      { id: 'pr_1', question: 'What technique involves giving AI examples before the actual task?', answer: 'Few-shot prompting', reward: 400, penalty: 80, hint: 'You give a few shots/examples' },
      { id: 'pr_2', question: 'What is it called when you ask AI to explain its reasoning step by step?', answer: 'Chain of thought', reward: 450, penalty: 90, hint: 'A chain of thinking' },
      { id: 'pr_3', question: 'What type of prompt injection attempts to make AI ignore its instructions?', answer: 'Jailbreak', reward: 500, penalty: 100, hint: 'Breaking out of jail' }
    ]
  },
  level3: {
    compound: [
      { id: 'c_1', question: 'What keyword is used to define a function in Python?', answer: 'def', reward: 200 },
      { id: 'c_2', question: 'How do you create a list in Python?', answer: '[]', reward: 200 },
      { id: 'c_3', question: 'What method adds an element to the end of a list?', answer: 'append', reward: 200 }
    ],
    safe: [
      { id: 's_1', question: 'Write a one-liner to reverse a string in Python', answer: 's[::-1]', attempts: 3, timeLimit: 120 },
      { id: 's_2', question: 'What is the output of: print(type([]) == list)', answer: 'True', attempts: 3, timeLimit: 120 },
      { id: 's_3', question: 'How do you get the last element of a list named arr?', answer: 'arr[-1]', attempts: 3, timeLimit: 120 }
    ]
  }
};

// Initialize sample teams
function initializeSampleTeams() {
  const teamNames = ['Cyber Wolves', 'Digital Pirates', 'Neon Raiders', 'Shadow Coders', 'Quantum Thieves'];
  teamNames.forEach((name, index) => {
    const teamId = uuidv4();
    const accessCode = `TEAM${(index + 1).toString().padStart(3, '0')}`;
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
      level1: { logic: [], ai: [], tech: [] },
      level2: { brain: [], nocode: [], prompt: [], attempted: false },
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
  const completed = progress?.[levelKey]?.[zone] || [];
  
  // PU-01: Check if team has HINT_MASTER — if so, include hints in response
  const hasHintMaster = gameState.powerUps[teamId]?.some(p => p.id === 'HINT_MASTER');
  
  const availableChallenges = challenges[levelKey][zone]
    .filter(c => !completed.includes(c.id))
    .map(c => ({ ...c, answer: undefined, hint: hasHintMaster ? c.hint : undefined }));
  
  res.json({ challenges: availableChallenges, completed, hasHintMaster });
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
  if (progress[levelKey][zone].includes(challengeId)) {
    return res.status(400).json({ error: 'Challenge already completed' });
  }
  
  // L2-01: For Level 2, enforce minimum 1 question per track before allowing
  // a team to complete more than 1 question in any single track
  if (level === 2 || level === '2') {
    const l2 = progress.level2;
    const trackKeys = Object.keys(challenges.level2); // ['brain', 'nocode', 'prompt']
    const thisTrackCompleted = (l2[zone] || []).length;
    // If attempting 2nd+ question in this track, ensure all other tracks have at least 1
    if (thisTrackCompleted >= 1) {
      const emptyTracks = trackKeys.filter(t => t !== zone && (l2[t] || []).length === 0);
      if (emptyTracks.length > 0) {
        return res.status(400).json({ 
          error: `Complete at least 1 question in: ${emptyTracks.join(', ')} before continuing this track.`,
          requiredTracks: emptyTracks
        });
      }
    }
  }
  
  // RT-01: Prevent double-submit race condition with a lock
  const lockKey = `${teamId}:${challengeId}`;
  if (submissionLocks.has(lockKey)) {
    return res.status(409).json({ error: 'Submission already in progress' });
  }
  submissionLocks.add(lockKey);
  
  try {
    const isCorrect = answer.toLowerCase().trim() === challenge.answer.toLowerCase().trim();
    
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
  return transferAmount;
}

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

  // L3-04: Prevent concurrent heists on same target
  const activeHeistOnTarget = Object.values(gameState.heists).find(
    h => h.targetTeamId === targetTeamId && h.status === 'active'
  );
  if (activeHeistOnTarget) {
    return res.status(400).json({ error: 'This team is already being heisted' });
  }

  // Also prevent attacker from running two heists at once
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
  
  let timeLimit = gameState.eventConfig.heistTimeLimit;
  
  // PU-02: Check for TIME_FREEZE on attacker — adds 60s to their heist timer
  const timeFreezeIndex = gameState.powerUps[attackerId].findIndex(p => p.id === 'TIME_FREEZE');
  if (timeFreezeIndex !== -1) {
    timeLimit += POWER_UPS.TIME_FREEZE.effect.addTime;
    gameState.powerUps[attackerId].splice(timeFreezeIndex, 1);
    io.to(attackerId).emit('teamUpdate', { team: sanitizeTeam(attacker), powerUps: gameState.powerUps[attackerId] });
  }
  
  // Check for guardian angel on target — reduces heist time
  const guardianIndex = gameState.powerUps[targetTeamId].findIndex(p => p.id === 'GUARDIAN_ANGEL');
  if (guardianIndex !== -1) {
    timeLimit -= POWER_UPS.GUARDIAN_ANGEL.effect.heistTimeReduction;
    gameState.powerUps[targetTeamId].splice(guardianIndex, 1);
  }
  
  const heistId = uuidv4();
  gameState.heists[heistId] = {
    id: heistId,
    attackerId,
    targetTeamId,
    stage: 'compound',
    compoundProgress: [],
    safeAttempts: 0,
    safeChallengeIndex: null, // L3-03: Will store which safe question was assigned
    timeLimit,
    startTime: Date.now(),
    status: 'active'
  };
  
  attacker.heistStatus = 'attacking';
  target.heistStatus = 'defending';
  
  io.to(targetTeamId).emit('heistAlert', { attackerName: attacker.name, heistId });
  io.emit('heistStarted', { attackerName: attacker.name, targetName: target.name, heistId });
  
  res.json({ 
    heistId, 
    timeLimit,
    compoundChallenges: challenges.level3.compound.map(c => ({ ...c, answer: undefined }))
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
  if (elapsed > (heist.timeLimit + 5) * 1000) { // 5s grace for network latency
    failHeist(heist, 'Time expired');
    return res.status(400).json({ error: 'Heist time expired', heistFailed: true });
  }
  
  const challenge = challenges.level3.compound.find(c => c.id === challengeId);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
  
  const isCorrect = answer.toLowerCase().trim() === challenge.answer.toLowerCase().trim();
  
  if (isCorrect) {
    heist.compoundProgress.push(challengeId);
    
    if (heist.compoundProgress.length >= challenges.level3.compound.length) {
      heist.stage = 'safe';
      // L3-03: Pick random safe challenge and store the INDEX in heist state
      const safeIndex = Math.floor(Math.random() * challenges.level3.safe.length);
      heist.safeChallengeIndex = safeIndex;
      const safeChallenge = challenges.level3.safe[safeIndex];
      return res.json({ 
        success: true, 
        stageComplete: true, 
        nextStage: 'safe',
        safeChallenge: { ...safeChallenge, answer: undefined }
      });
    }
    
    res.json({ success: true, correct: true, progress: heist.compoundProgress.length });
  } else {
    res.json({ success: true, correct: false });
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
    // Heist successful - steal 50% of target's cash
    const stolenAmount = Math.floor(target.cash * 0.5);
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
    
    res.json({ success: true, heistSuccess: true, stolenAmount });
  } else if (heist.safeAttempts >= 3) {
    // Heist failed - use shared helper
    const transferAmount = failHeist(heist, 'Max safe attempts exceeded');
    res.json({ success: true, heistSuccess: false, transferAmount });
  } else {
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

app.post('/api/admin/create-team', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  
  const { name } = req.body;
  const teamId = uuidv4();
  // ADM-02: Generate unique random access code instead of predictable TEAM001 pattern
  const accessCode = 'GDG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
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
    level1: { logic: [], ai: [], tech: [] },
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
    powerUpsByTeam: gameState.powerUps
  });
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
    progress.level1.logic.length + 
    progress.level1.ai.length + 
    progress.level1.tech.length;
  
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
