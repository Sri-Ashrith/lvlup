import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// ── Config ──────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'level-up-event-secret-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) console.error('[API] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// ── CORS ────────────────────────────────────────────────────────────────────
function setCors(req, res) {
  const origin = req.headers.origin || '';
  const ok = !origin || /\.vercel\.app$/i.test(origin) || origin === 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', ok ? (origin || '*') : '');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ── Power-ups (static definitions) ─────────────────────────────────────────
const POWER_UPS = {
  GUARDIAN_ANGEL: { id: 'GUARDIAN_ANGEL', name: 'Guardian Angel', description: 'Reduces enemy heist time by 30 seconds', effect: { heistTimeReduction: 30 } },
  DOUBLE_CASH:   { id: 'DOUBLE_CASH',   name: 'Double Cash',    description: 'Next successful challenge gives 2x cash', effect: { cashMultiplier: 2 } },
  SHIELD:        { id: 'SHIELD',        name: 'Shield',         description: 'Blocks one incoming heist attempt', effect: { blockHeist: true } },
  HINT_MASTER:   { id: 'HINT_MASTER',   name: 'Hint Master',    description: 'Reveals hint for current challenge', effect: { revealHint: true } },
  TIME_FREEZE:   { id: 'TIME_FREEZE',   name: 'Time Freeze',    description: 'Adds 60 seconds to current challenge timer', effect: { addTime: 60 } }
};

// ── Seeded random shuffle - deterministic per team ─────────────────────────
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

// ── Challenges (static, kept in code) ──────────────────────────────────────
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
      { id: 'logo_9', question: 'Identify this logo', answer: 'Google Maps', reward: 150, image: '/logos/googlemaps.png', options: ['Subway', 'Google Maps', 'MapMyIndia', 'Apple Maps'] },
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

// ── Helpers ─────────────────────────────────────────────────────────────────
function verifyToken(req) {
  const h = req.headers.authorization;
  if (!h) return null;
  const token = h.split(' ')[1];
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body !== undefined) return resolve(req.body);
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
  });
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function requireDb(res) {
  if (!supabase) { json(res, 503, { error: 'Database not configured' }); return false; }
  return true;
}

// ── DB helpers ──────────────────────────────────────────────────────────────
async function getTeamById(id) {
  const { data } = await supabase.from('teams').select('*').eq('id', id).single();
  return data;
}

async function getTeamPowerUps(teamId) {
  const { data } = await supabase.from('team_powerups').select('powerup_id').eq('team_id', teamId);
  return (data || []).map(r => POWER_UPS[r.powerup_id]).filter(Boolean);
}

async function getCompletedChallenges(teamId, levelKey, zone) {
  const { data } = await supabase.from('level_progress').select('challenge_id').eq('team_id', teamId).eq('level_key', levelKey).eq('zone', zone);
  return (data || []).map(r => r.challenge_id);
}

async function getEventConfig() {
  const { data } = await supabase.from('event_config').select('*').eq('id', 1).single();
  if (!data) return { currentLevel: 1, isEventActive: true, levelTimers: { 1: 2700, 2: 3600, 3: 2700 }, heistTimeLimit: 180, difficultyMultiplier: 1 };
  return {
    currentLevel: data.current_level,
    isEventActive: data.is_event_active,
    levelTimers: { 1: data.level1_timer, 2: data.level2_timer, 3: data.level3_timer },
    heistTimeLimit: data.heist_time_limit,
    difficultyMultiplier: Number(data.difficulty_multiplier)
  };
}

function sanitizeTeam(t) {
  return { id: t.id, name: t.name, cash: t.cash, currentLevel: t.current_level, heistStatus: t.heist_status, isOnline: t.is_online };
}

async function checkAndGrantPowerUps(teamId) {
  const team = await getTeamById(teamId);
  if (!team) return;
  const completed = team.completed_challenges || [];

  // Count total level1 completed
  const { count: l1Count } = await supabase.from('level_progress').select('*', { count: 'exact', head: true }).eq('team_id', teamId).eq('level_key', 'level1');

  if ((l1Count || 0) >= 3 && !completed.includes('first_three')) {
    await supabase.from('team_powerups').insert({ team_id: teamId, powerup_id: 'HINT_MASTER' });
    await supabase.from('teams').update({ completed_challenges: [...completed, 'first_three'] }).eq('id', teamId);
  }
  if (team.cash >= 2000 && !completed.includes('cash_2k')) {
    await supabase.from('team_powerups').insert({ team_id: teamId, powerup_id: 'GUARDIAN_ANGEL' });
    const fresh = (await getTeamById(teamId)).completed_challenges || [];
    await supabase.from('teams').update({ completed_challenges: [...fresh, 'cash_2k'] }).eq('id', teamId);
  }
  if (team.cash >= 5000 && !completed.includes('cash_5k')) {
    await supabase.from('team_powerups').insert({ team_id: teamId, powerup_id: 'SHIELD' });
    const fresh = (await getTeamById(teamId)).completed_challenges || [];
    await supabase.from('teams').update({ completed_challenges: [...fresh, 'cash_5k'] }).eq('id', teamId);
  }
}

// ── Route handler ───────────────────────────────────────────────────────────
async function handleRequest(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return json(res, 204, null);

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api/, '') || '/';

  // ── Public routes ─────────────────────────────────────────────────────
  if (req.method === 'GET' && (path === '/' || path === ''))
    return json(res, 200, { ok: true, service: 'level-up-backend', db: !!supabase });

  if (req.method === 'GET' && path === '/healthz')
    return json(res, 200, { ok: true, db: !!supabase });

  if (req.method === 'GET' && path === '/db-ping') {
    if (!requireDb(res)) return;
    const { data, error } = await supabase.from('event_config').select('*').limit(1);
    return error ? json(res, 500, { ok: false, error: error.message }) : json(res, 200, { ok: true, data });
  }

  if (req.method === 'GET' && path === '/leaderboard') {
    if (!requireDb(res)) return;
    const { data } = await supabase.from('teams').select('id, name, cash, current_level, heist_status, is_online').order('cash', { ascending: false });
    return json(res, 200, (data || []).map(sanitizeTeam));
  }

  // ── Auth ──────────────────────────────────────────────────────────────
  if (req.method === 'POST' && path === '/auth/team-login') {
    if (!requireDb(res)) return;
    const body = await parseBody(req);
    const { data: team } = await supabase.from('teams').select('*').eq('access_code', body.accessCode).single();
    if (!team) return json(res, 401, { error: 'Invalid access code' });
    const token = jwt.sign({ teamId: team.id, role: 'team' }, JWT_SECRET, { expiresIn: '8h' });
    await supabase.from('teams').update({ is_online: true, last_active: new Date().toISOString() }).eq('id', team.id);
    const powerUps = await getTeamPowerUps(team.id);
    return json(res, 200, { token, team: sanitizeTeam(team), powerUps });
  }

  if (req.method === 'POST' && path === '/auth/admin-login') {
    const body = await parseBody(req);
    if (body.password !== ADMIN_PASSWORD) return json(res, 401, { error: 'Invalid admin password' });
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    return json(res, 200, { token, role: 'admin' });
  }

  // ── Auth-required routes ──────────────────────────────────────────────
  const user = verifyToken(req);
  if (!user) return json(res, 401, { error: 'Unauthorized' });
  if (!requireDb(res)) return;

  // GET /teams (admin)
  if (req.method === 'GET' && path === '/teams') {
    if (user.role !== 'admin') return json(res, 403, { error: 'Admin only' });
    const { data } = await supabase.from('teams').select('*').order('cash', { ascending: false });
    return json(res, 200, data || []);
  }

  // GET /team/:teamId
  const teamMatch = path.match(/^\/team\/([^/]+)$/);
  if (req.method === 'GET' && teamMatch) {
    const teamId = teamMatch[1];
    if (user.role === 'team' && user.teamId !== teamId) return json(res, 403, { error: 'Access denied' });
    const team = await getTeamById(teamId);
    if (!team) return json(res, 404, { error: 'Team not found' });
    const powerUps = await getTeamPowerUps(teamId);

    // Build progress object matching client expectations
    const { data: progRows } = await supabase.from('level_progress').select('level_key, zone, challenge_id').eq('team_id', teamId);
    const progress = {
      level1: { logo: [], aihuman: [], reasoning: [] },
      level2: { easy: [], medium: [], hard: [] },
      level3: { compound: [], heistTarget: null, heistStatus: 'none' }
    };
    for (const r of (progRows || [])) {
      if (progress[r.level_key]?.[r.zone]) {
        progress[r.level_key][r.zone].push(r.challenge_id);
      }
    }
    // Check if level2 has any attempts
    const l2Total = progress.level2.brain.length + progress.level2.nocode.length + progress.level2.prompt.length;
    progress.level2.attempted = l2Total > 0;

    return json(res, 200, { team: sanitizeTeam(team), powerUps, progress });
  }

  // GET /announcements
  if (req.method === 'GET' && path === '/announcements') {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(10);
    const announcements = (data || []).map(a => ({ id: a.id, message: a.message, type: a.type, timestamp: a.created_at }));
    return json(res, 200, { announcements });
  }

  // GET /event-config
  if (req.method === 'GET' && path === '/event-config') {
    const eventConfig = await getEventConfig();
    return json(res, 200, { eventConfig });
  }

  // GET /challenges/:level/:zone
  const chMatch = path.match(/^\/challenges\/(\d+)\/([^/]+)$/);
  if (req.method === 'GET' && chMatch) {
    const [, level, zone] = chMatch;
    const key = `level${level}`;
    if (!challenges[key]?.[zone]) return json(res, 404, { error: 'Zone not found' });
    const completed = await getCompletedChallenges(user.teamId, key, zone);
    const pups = await getTeamPowerUps(user.teamId);
    const hasHint = pups.some(p => p.id === 'HINT_MASTER');
    // Randomize question order per team using seeded shuffle
    const allChallenges = seededShuffle(challenges[key][zone], user.teamId);
    const list = allChallenges
      .filter(c => !completed.includes(c.id))
      .map(c => ({ ...c, answer: undefined, acceptedAnswers: undefined, hint: hasHint ? c.hint : undefined }));
    const responseData = { challenges: list, completed, hasHintMaster: hasHint };

    // For Level 2, include cross-section progress so frontend can enforce limits
    if (level === '2') {
      const sectionKeys = Object.keys(challenges.level2);
      const sectionProgress = {};
      for (const k of sectionKeys) {
        const sc = await getCompletedChallenges(user.teamId, key, k);
        sectionProgress[k] = sc.length;
      }
      const totalCompleted = Object.values(sectionProgress).reduce((a, b) => a + b, 0);
      responseData.level2Progress = { sectionProgress, totalCompleted, maxPerSection: 3, maxTotal: 6 };
    }

    return json(res, 200, responseData);
  }

  // POST /challenges/submit
  if (req.method === 'POST' && path === '/challenges/submit') {
    const body = await parseBody(req);
    const { challengeId, answer, level, zone } = body;
    const teamId = user.teamId;
    const team = await getTeamById(teamId);
    if (!team) return json(res, 404, { error: 'Team not found' });
    const key = `level${level}`;
    const ch = challenges[key]?.[zone]?.find(c => c.id === challengeId);
    if (!ch) return json(res, 404, { error: 'Challenge not found' });

    const completed = await getCompletedChallenges(teamId, key, zone);
    if (completed.includes(challengeId)) return json(res, 400, { error: 'Already completed' });

    // Level 2 enforcement: max 3 per section, max 6 total
    if (String(level) === '2') {
      const sectionKeys = Object.keys(challenges.level2);
      const thisZoneCount = (await getCompletedChallenges(teamId, key, zone)).length;
      if (thisZoneCount >= 3) {
        return json(res, 400, { error: 'You have reached the maximum of 3 questions for this section.', maxReached: true });
      }
      let totalCompleted = 0;
      for (const k of sectionKeys) {
        const sc = await getCompletedChallenges(teamId, key, k);
        totalCompleted += sc.length;
      }
      if (totalCompleted >= 6) {
        return json(res, 400, { error: 'You have answered all 6 allowed Level 2 questions.', allDone: true });
      }
    }

    const eventConfig = await getEventConfig();
    // Support acceptedAnswers array for multiple valid answers
    const userAnswer = answer.toLowerCase().trim();
    const validAnswers = ch.acceptedAnswers
      ? ch.acceptedAnswers.map(a => a.toLowerCase().trim())
      : [ch.answer.toLowerCase().trim()];
    const correct = validAnswers.includes(userAnswer);

    if (correct) {
      let reward = Math.round(ch.reward * (eventConfig.difficultyMultiplier || 1));

      // Check DOUBLE_CASH power-up
      const pups = await getTeamPowerUps(teamId);
      const dc = pups.find(p => p.id === 'DOUBLE_CASH');
      if (dc) {
        reward *= 2;
        // Remove one DOUBLE_CASH from DB
        const { data: dcRow } = await supabase.from('team_powerups').select('id').eq('team_id', teamId).eq('powerup_id', 'DOUBLE_CASH').limit(1).single();
        if (dcRow) await supabase.from('team_powerups').delete().eq('id', dcRow.id);
      }

      const newCash = team.cash + reward;
      await supabase.from('teams').update({ cash: newCash }).eq('id', teamId);
      await supabase.from('level_progress').insert({ team_id: teamId, level_key: key, zone, challenge_id: challengeId });
      await checkAndGrantPowerUps(teamId);
      return json(res, 200, { success: true, correct: true, reward, newCash });
    } else {
      const penalty = Math.round((ch.penalty || 0) * (eventConfig.difficultyMultiplier || 1));
      const newCash = Math.max(0, team.cash - penalty);
      await supabase.from('teams').update({ cash: newCash }).eq('id', teamId);

      // For aihuman/reasoning/L2 zones, mark as completed even on wrong answer so it doesn't reappear
      const markCompletedOnWrong = ['aihuman', 'reasoning', 'easy', 'medium', 'hard'];
      if (markCompletedOnWrong.includes(zone)) {
        await supabase.from('level_progress').insert({ team_id: teamId, level_key: key, zone, challenge_id: challengeId });
      }

      return json(res, 200, { success: true, correct: false, penalty, newCash });
    }
  }

  // ── Heist routes ──────────────────────────────────────────────────────
  if (req.method === 'POST' && path === '/heist/initiate') {
    const body = await parseBody(req);
    const { targetTeamId } = body;
    const attackerId = user.teamId;
    if (attackerId === targetTeamId) return json(res, 400, { error: 'Cannot heist yourself' });

    const attacker = await getTeamById(attackerId);
    const target = await getTeamById(targetTeamId);
    if (!attacker || !target) return json(res, 404, { error: 'Team not found' });

    // Check active heists
    const { data: activeTarget } = await supabase.from('heists').select('id').eq('target_team_id', targetTeamId).eq('status', 'active').limit(1);
    if (activeTarget?.length) return json(res, 400, { error: 'Target already being heisted' });
    const { data: activeAttacker } = await supabase.from('heists').select('id').eq('attacker_id', attackerId).eq('status', 'active').limit(1);
    if (activeAttacker?.length) return json(res, 400, { error: 'You already have an active heist' });

    // Shield check
    const { data: shieldRow } = await supabase.from('team_powerups').select('id').eq('team_id', targetTeamId).eq('powerup_id', 'SHIELD').limit(1).single();
    if (shieldRow) {
      await supabase.from('team_powerups').delete().eq('id', shieldRow.id);
      return json(res, 200, { blocked: true, message: 'Target had a shield!' });
    }

    const eventConfig = await getEventConfig();
    let timeLimit = eventConfig.heistTimeLimit;

    // TIME_FREEZE for attacker
    const { data: tfRow } = await supabase.from('team_powerups').select('id').eq('team_id', attackerId).eq('powerup_id', 'TIME_FREEZE').limit(1).single();
    if (tfRow) { timeLimit += 60; await supabase.from('team_powerups').delete().eq('id', tfRow.id); }

    // GUARDIAN_ANGEL for target
    const { data: gaRow } = await supabase.from('team_powerups').select('id').eq('team_id', targetTeamId).eq('powerup_id', 'GUARDIAN_ANGEL').limit(1).single();
    if (gaRow) { timeLimit -= 30; await supabase.from('team_powerups').delete().eq('id', gaRow.id); }

    const heistId = uuidv4();
    await supabase.from('heists').insert({
      id: heistId, attacker_id: attackerId, target_team_id: targetTeamId,
      stage: 'compound', compound_progress: [], safe_attempts: 0,
      time_limit: timeLimit, start_time: Date.now(), status: 'active'
    });
    await supabase.from('teams').update({ heist_status: 'attacking' }).eq('id', attackerId);
    await supabase.from('teams').update({ heist_status: 'defending' }).eq('id', targetTeamId);

    return json(res, 200, { heistId, timeLimit, compoundChallenges: challenges.level3.compound.map(c => ({ ...c, answer: undefined })) });
  }

  if (req.method === 'POST' && path === '/heist/compound') {
    const body = await parseBody(req);
    const { data: heist } = await supabase.from('heists').select('*').eq('id', body.heistId).single();
    if (!heist || heist.attacker_id !== user.teamId) return json(res, 400, { error: 'Invalid heist' });

    if (Date.now() - Number(heist.start_time) > (heist.time_limit + 5) * 1000) {
      await failHeistDb(heist);
      return json(res, 400, { error: 'Time expired', heistFailed: true });
    }

    const ch = challenges.level3.compound.find(c => c.id === body.challengeId);
    if (!ch) return json(res, 404, { error: 'Challenge not found' });

    if (body.answer.toLowerCase().trim() === ch.answer.toLowerCase().trim()) {
      const progress = [...(heist.compound_progress || []), body.challengeId];
      if (progress.length >= challenges.level3.compound.length) {
        const si = Math.floor(Math.random() * challenges.level3.safe.length);
        await supabase.from('heists').update({ compound_progress: progress, stage: 'safe', safe_challenge_index: si }).eq('id', heist.id);
        return json(res, 200, { success: true, stageComplete: true, nextStage: 'safe', safeChallenge: { ...challenges.level3.safe[si], answer: undefined } });
      }
      await supabase.from('heists').update({ compound_progress: progress }).eq('id', heist.id);
      return json(res, 200, { success: true, correct: true, progress: progress.length });
    }
    return json(res, 200, { success: true, correct: false });
  }

  if (req.method === 'POST' && path === '/heist/safe') {
    const body = await parseBody(req);
    const { data: heist } = await supabase.from('heists').select('*').eq('id', body.heistId).single();
    if (!heist || heist.attacker_id !== user.teamId || heist.stage !== 'safe') return json(res, 400, { error: 'Invalid heist state' });

    if (Date.now() - Number(heist.start_time) > (heist.time_limit + 5) * 1000) {
      await failHeistDb(heist);
      return json(res, 400, { error: 'Time expired', heistFailed: true });
    }

    const sc = challenges.level3.safe[heist.safe_challenge_index ?? 0];
    const correct = body.answer.toLowerCase().trim() === sc.answer.toLowerCase().trim();
    const newAttempts = (heist.safe_attempts || 0) + 1;
    await supabase.from('heists').update({ safe_attempts: newAttempts }).eq('id', heist.id);

    const attacker = await getTeamById(heist.attacker_id);
    const target = await getTeamById(heist.target_team_id);

    if (correct) {
      const stolen = Math.floor(target.cash * 0.5);
      await supabase.from('teams').update({ cash: target.cash - stolen }).eq('id', target.id);
      await supabase.from('teams').update({ cash: attacker.cash + stolen, heist_status: 'none' }).eq('id', attacker.id);
      await supabase.from('teams').update({ heist_status: 'none' }).eq('id', target.id);
      await supabase.from('heists').update({ status: 'success' }).eq('id', heist.id);
      return json(res, 200, { success: true, heistSuccess: true, stolenAmount: stolen });
    }

    if (newAttempts >= 3) {
      const amt = await failHeistDb(heist);
      return json(res, 200, { success: true, heistSuccess: false, transferAmount: amt });
    }

    return json(res, 200, { success: true, correct: false, attemptsRemaining: 3 - newAttempts });
  }

  // ── Admin routes ──────────────────────────────────────────────────────
  if (user.role !== 'admin' && path.startsWith('/admin/')) return json(res, 403, { error: 'Admin only' });

  if (req.method === 'POST' && path === '/admin/add-cash') {
    const body = await parseBody(req);
    const team = await getTeamById(body.teamId);
    if (!team) return json(res, 404, { error: 'Team not found' });
    const newCash = Math.max(0, team.cash + body.amount);
    await supabase.from('teams').update({ cash: newCash }).eq('id', body.teamId);
    return json(res, 200, { success: true, newCash });
  }

  if (req.method === 'POST' && path === '/admin/drop-powerup') {
    const body = await parseBody(req);
    const team = await getTeamById(body.teamId);
    if (!team) return json(res, 404, { error: 'Team not found' });
    if (!POWER_UPS[body.powerUpId]) return json(res, 400, { error: 'Invalid power-up' });
    const { count } = await supabase.from('team_powerups').select('*', { count: 'exact', head: true }).eq('team_id', body.teamId).eq('powerup_id', body.powerUpId);
    if ((count || 0) >= 2) return json(res, 400, { error: 'Max 2 per type' });
    await supabase.from('team_powerups').insert({ team_id: body.teamId, powerup_id: body.powerUpId });
    return json(res, 200, { success: true });
  }

  if (req.method === 'POST' && path === '/admin/remove-powerup') {
    const body = await parseBody(req);
    const team = await getTeamById(body.teamId);
    if (!team) return json(res, 404, { error: 'Team not found' });
    const { data: row } = await supabase.from('team_powerups').select('id').eq('team_id', body.teamId).eq('powerup_id', body.powerUpId).limit(1).single();
    if (!row) return json(res, 404, { error: 'Power-up not found' });
    await supabase.from('team_powerups').delete().eq('id', row.id);
    return json(res, 200, { success: true });
  }

  if (req.method === 'POST' && path === '/admin/set-level') {
    const body = await parseBody(req);
    await supabase.from('event_config').update({ current_level: body.level }).eq('id', 1);
    await supabase.from('teams').update({ current_level: body.level }).neq('id', '00000000-0000-0000-0000-000000000000');
    return json(res, 200, { success: true, currentLevel: body.level });
  }

  if (req.method === 'POST' && path === '/admin/create-team') {
    const body = await parseBody(req);
    const eventConfig = await getEventConfig();
    const code = 'GDG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: newTeam, error } = await supabase.from('teams').insert({
      name: body.name, access_code: code, cash: 0,
      current_level: eventConfig.currentLevel, heist_status: 'none', is_online: false
    }).select().single();
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, { success: true, team: { ...newTeam, accessCode: newTeam.access_code, currentLevel: newTeam.current_level } });
  }

  if (req.method === 'GET' && path === '/admin/event-state') {
    const [{ data: teams }, eventConfig, { data: activeHeists }] = await Promise.all([
      supabase.from('teams').select('*').order('cash', { ascending: false }),
      getEventConfig(),
      supabase.from('heists').select('*').eq('status', 'active')
    ]);

    // Fetch power-ups for all teams
    const { data: allPups } = await supabase.from('team_powerups').select('team_id, powerup_id');
    const powerUpsByTeam = {};
    for (const t of (teams || [])) { powerUpsByTeam[t.id] = []; }
    for (const r of (allPups || [])) {
      if (!powerUpsByTeam[r.team_id]) powerUpsByTeam[r.team_id] = [];
      if (POWER_UPS[r.powerup_id]) powerUpsByTeam[r.team_id].push(POWER_UPS[r.powerup_id]);
    }

    const teamsWithPups = (teams || []).map(t => ({
      ...t,
      accessCode: t.access_code,
      currentLevel: t.current_level,
      heistStatus: t.heist_status,
      isOnline: t.is_online,
      completedChallenges: t.completed_challenges || [],
      powerUps: powerUpsByTeam[t.id] || []
    }));

    return json(res, 200, {
      teams: teamsWithPups,
      eventConfig,
      heists: (activeHeists || []).map(h => ({
        id: h.id, attackerId: h.attacker_id, targetTeamId: h.target_team_id,
        stage: h.stage, status: h.status, timeLimit: h.time_limit, startTime: Number(h.start_time)
      })),
      powerUps: POWER_UPS,
      powerUpsByTeam
    });
  }

  if (req.method === 'POST' && path === '/admin/announcement') {
    const body = await parseBody(req);
    const msg = (body.message || '').replace(/<[^>]*>/g, '').trim();
    if (!msg) return json(res, 400, { error: 'Empty message' });
    const type = ['info', 'warning', 'success', 'error'].includes(body.type) ? body.type : 'info';
    await supabase.from('announcements').insert({ message: msg, type });
    return json(res, 200, { success: true });
  }

  // ── 404 fallback ──────────────────────────────────────────────────────
  return json(res, 404, { error: 'Not found', path });
}

// ── Heist failure helper (DB) ───────────────────────────────────────────────
async function failHeistDb(heist) {
  const attacker = await getTeamById(heist.attacker_id);
  const target = await getTeamById(heist.target_team_id);
  if (!attacker || !target) return 0;
  const amt = Math.floor(attacker.cash * 0.3);
  await supabase.from('teams').update({ cash: Math.max(0, attacker.cash - amt), heist_status: 'none' }).eq('id', attacker.id);
  await supabase.from('teams').update({ cash: target.cash + amt, heist_status: 'none' }).eq('id', target.id);
  await supabase.from('heists').update({ status: 'failed' }).eq('id', heist.id);
  return amt;
}

// ── Vercel entry point ──────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    await handleRequest(req, res);
  } catch (err) {
    console.error('[API ERROR]', err);
    if (!res.headersSent) json(res, 500, { error: 'Internal server error' });
  }
}
