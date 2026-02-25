import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// ── Config ──────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'level-up-event-secret-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// ── CORS helper ─────────────────────────────────────────────────────────────
function getAllowedOrigins() {
  const origins = ['http://localhost:5173'];
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.CLIENT_ORIGIN) {
    process.env.CLIENT_ORIGIN.split(',').map(o => o.trim()).filter(Boolean).forEach(o => origins.push(o));
  }
  return origins;
}

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = getAllowedOrigins();
  const isAllowed = !origin || allowed.includes(origin) || /\.vercel\.app$/i.test(origin);
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ── Power-ups ───────────────────────────────────────────────────────────────
const POWER_UPS = {
  GUARDIAN_ANGEL: { id: 'GUARDIAN_ANGEL', name: 'Guardian Angel', description: 'Reduces enemy heist time by 30 seconds', effect: { heistTimeReduction: 30 } },
  DOUBLE_CASH:   { id: 'DOUBLE_CASH',   name: 'Double Cash',    description: 'Next successful challenge gives 2x cash', effect: { cashMultiplier: 2 } },
  SHIELD:        { id: 'SHIELD',        name: 'Shield',         description: 'Blocks one incoming heist attempt', effect: { blockHeist: true } },
  HINT_MASTER:   { id: 'HINT_MASTER',   name: 'Hint Master',    description: 'Reveals hint for current challenge', effect: { revealHint: true } },
  TIME_FREEZE:   { id: 'TIME_FREEZE',   name: 'Time Freeze',    description: 'Adds 60 seconds to current challenge timer', effect: { addTime: 60 } }
};

// ── Challenges ──────────────────────────────────────────────────────────────
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
      { id: 'tech_1', question: 'What does HTML stand for?', answer: 'HyperText Markup Language', reward: 200, hint: "It's about marking up hypertext" },
      { id: 'tech_2', question: 'Which programming language is known as the backbone of web interactivity?', answer: 'JavaScript', reward: 300, hint: 'Not to be confused with Java' },
      { id: 'tech_3', question: 'What does API stand for?', answer: 'Application Programming Interface', reward: 350, hint: "It's an interface for programming applications" }
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
      { id: 'nc_2', question: 'What no-code tool is commonly used for database management?', answer: 'Airtable', reward: 550, penalty: 100, hint: "It's like a table in the air" },
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

// ── In-memory game state (resets on each cold start) ────────────────────────
const gameState = {
  teams: {},
  powerUps: {},
  heists: {},
  eventConfig: { currentLevel: 1, isEventActive: true, levelTimers: { 1: 2700, 2: 3600, 3: 2700 }, heistTimeLimit: 180, difficultyMultiplier: 1 },
  levelProgress: {},
  announcements: []
};

function initTeams() {
  const names = ['Cyber Wolves', 'Digital Pirates', 'Neon Raiders', 'Shadow Coders', 'Quantum Thieves'];
  names.forEach((name, i) => {
    const id = uuidv4();
    const code = `TEAM${String(i + 1).padStart(3, '0')}`;
    gameState.teams[id] = { id, name, accessCode: code, cash: 0, currentLevel: 1, completedChallenges: [], powerUps: [], heistStatus: 'none', isOnline: false, lastActive: new Date().toISOString() };
    gameState.powerUps[id] = [];
    gameState.levelProgress[id] = { level1: { logic: [], ai: [], tech: [] }, level2: { brain: [], nocode: [], prompt: [], attempted: false }, level3: { compound: [], heistTarget: null, heistStatus: 'none' } };
  });
}
initTeams();

// ── Helpers ─────────────────────────────────────────────────────────────────
function sanitizeTeam(t) { return { id: t.id, name: t.name, cash: t.cash, currentLevel: t.currentLevel, heistStatus: t.heistStatus, isOnline: t.isOnline }; }
function getLeaderboard() { return Object.values(gameState.teams).map(sanitizeTeam).sort((a, b) => b.cash - a.cash); }

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

function checkAndGrantPowerUps(teamId) {
  const team = gameState.teams[teamId];
  const p = gameState.levelProgress[teamId];
  const total = p.level1.logic.length + p.level1.ai.length + p.level1.tech.length;
  if (total === 3 && !team.completedChallenges.includes('first_three')) { gameState.powerUps[teamId].push(POWER_UPS.HINT_MASTER); team.completedChallenges.push('first_three'); }
  if (team.cash >= 2000 && !team.completedChallenges.includes('cash_2k')) { gameState.powerUps[teamId].push(POWER_UPS.GUARDIAN_ANGEL); team.completedChallenges.push('cash_2k'); }
  if (team.cash >= 5000 && !team.completedChallenges.includes('cash_5k')) { gameState.powerUps[teamId].push(POWER_UPS.SHIELD); team.completedChallenges.push('cash_5k'); }
}

function failHeist(heist) {
  const a = gameState.teams[heist.attackerId], t = gameState.teams[heist.targetTeamId];
  if (!a || !t || heist.status !== 'active') return 0;
  const amt = Math.floor(a.cash * 0.3);
  a.cash = Math.max(0, a.cash - amt); t.cash += amt;
  heist.status = 'failed'; a.heistStatus = 'none'; t.heistStatus = 'none';
  return amt;
}

// ── Route handler ───────────────────────────────────────────────────────────
async function handleRequest(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return json(res, 204, null);

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api/, '') || '/';

  // ── Public routes ─────────────────────────────────────────────────────
  if (req.method === 'GET' && (path === '/' || path === '')) return json(res, 200, { ok: true, service: 'level-up-backend' });
  if (req.method === 'GET' && path === '/healthz') return json(res, 200, { ok: true });

  if (req.method === 'GET' && path === '/db-ping') {
    if (!supabase) return json(res, 503, { ok: false, error: 'Supabase not configured' });
    const { data, error } = await supabase.from('event_config').select('*').limit(1);
    return error ? json(res, 500, { ok: false, error: error.message }) : json(res, 200, { ok: true, data });
  }

  if (req.method === 'GET' && path === '/leaderboard') return json(res, 200, getLeaderboard());

  // ── Auth routes ───────────────────────────────────────────────────────
  if (req.method === 'POST' && path === '/auth/team-login') {
    const body = await parseBody(req);
    const team = Object.values(gameState.teams).find(t => t.accessCode === body.accessCode);
    if (!team) return json(res, 401, { error: 'Invalid access code' });
    const token = jwt.sign({ teamId: team.id, role: 'team' }, JWT_SECRET, { expiresIn: '8h' });
    team.isOnline = true;
    return json(res, 200, { token, team: sanitizeTeam(team), powerUps: gameState.powerUps[team.id] });
  }

  if (req.method === 'POST' && path === '/auth/admin-login') {
    const body = await parseBody(req);
    if (body.password !== ADMIN_PASSWORD) return json(res, 401, { error: 'Invalid admin password' });
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    return json(res, 200, { token, role: 'admin' });
  }

  // ── Everything below requires auth ────────────────────────────────────
  const user = verifyToken(req);
  if (!user) return json(res, 401, { error: 'Unauthorized' });

  if (req.method === 'GET' && path === '/teams') {
    if (user.role !== 'admin') return json(res, 403, { error: 'Admin only' });
    return json(res, 200, Object.values(gameState.teams));
  }

  const teamMatch = path.match(/^\/team\/([^/]+)$/);
  if (req.method === 'GET' && teamMatch) {
    const teamId = teamMatch[1];
    if (user.role === 'team' && user.teamId !== teamId) return json(res, 403, { error: 'Access denied' });
    const team = gameState.teams[teamId];
    if (!team) return json(res, 404, { error: 'Team not found' });
    return json(res, 200, { team: sanitizeTeam(team), powerUps: gameState.powerUps[team.id], progress: gameState.levelProgress[team.id] });
  }

  if (req.method === 'GET' && path === '/announcements') return json(res, 200, { announcements: gameState.announcements.slice(-10).reverse() });
  if (req.method === 'GET' && path === '/event-config') return json(res, 200, { eventConfig: gameState.eventConfig });

  const chMatch = path.match(/^\/challenges\/(\d+)\/([^/]+)$/);
  if (req.method === 'GET' && chMatch) {
    const [, level, zone] = chMatch;
    const key = `level${level}`;
    if (!challenges[key]?.[zone]) return json(res, 404, { error: 'Zone not found' });
    const completed = gameState.levelProgress[user.teamId]?.[key]?.[zone] || [];
    const hasHint = gameState.powerUps[user.teamId]?.some(p => p.id === 'HINT_MASTER');
    const list = challenges[key][zone].filter(c => !completed.includes(c.id)).map(c => ({ ...c, answer: undefined, hint: hasHint ? c.hint : undefined }));
    return json(res, 200, { challenges: list, completed, hasHintMaster: hasHint });
  }

  if (req.method === 'POST' && path === '/challenges/submit') {
    const body = await parseBody(req);
    const { challengeId, answer, level, zone } = body;
    const teamId = user.teamId;
    const team = gameState.teams[teamId];
    if (!team) return json(res, 404, { error: 'Team not found' });
    const key = `level${level}`;
    const ch = challenges[key]?.[zone]?.find(c => c.id === challengeId);
    if (!ch) return json(res, 404, { error: 'Challenge not found' });
    const prog = gameState.levelProgress[teamId];
    if (prog[key][zone].includes(challengeId)) return json(res, 400, { error: 'Already completed' });
    if (String(level) === '2') {
      const l2 = prog.level2;
      const tracks = Object.keys(challenges.level2);
      if ((l2[zone] || []).length >= 1) {
        const empty = tracks.filter(t => t !== zone && (l2[t] || []).length === 0);
        if (empty.length > 0) return json(res, 400, { error: `Complete at least 1 in: ${empty.join(', ')}`, requiredTracks: empty });
      }
    }
    const correct = answer.toLowerCase().trim() === ch.answer.toLowerCase().trim();
    if (correct) {
      let reward = Math.round(ch.reward * (gameState.eventConfig.difficultyMultiplier || 1));
      const dcIdx = gameState.powerUps[teamId].findIndex(p => p.id === 'DOUBLE_CASH');
      if (dcIdx !== -1) { reward *= 2; gameState.powerUps[teamId].splice(dcIdx, 1); }
      team.cash += reward;
      prog[key][zone].push(challengeId);
      checkAndGrantPowerUps(teamId);
      return json(res, 200, { success: true, correct: true, reward, newCash: team.cash });
    } else {
      const penalty = Math.round((ch.penalty || 0) * (gameState.eventConfig.difficultyMultiplier || 1));
      team.cash = Math.max(0, team.cash - penalty);
      return json(res, 200, { success: true, correct: false, penalty, newCash: team.cash });
    }
  }

  // ── Heist routes ──────────────────────────────────────────────────────
  if (req.method === 'POST' && path === '/heist/initiate') {
    const body = await parseBody(req);
    const { targetTeamId } = body;
    const attackerId = user.teamId;
    if (attackerId === targetTeamId) return json(res, 400, { error: 'Cannot heist yourself' });
    const attacker = gameState.teams[attackerId], target = gameState.teams[targetTeamId];
    if (!attacker || !target) return json(res, 404, { error: 'Team not found' });
    if (Object.values(gameState.heists).some(h => h.targetTeamId === targetTeamId && h.status === 'active')) return json(res, 400, { error: 'Target already being heisted' });
    if (Object.values(gameState.heists).some(h => h.attackerId === attackerId && h.status === 'active')) return json(res, 400, { error: 'You already have an active heist' });
    const shieldIdx = gameState.powerUps[targetTeamId].findIndex(p => p.id === 'SHIELD');
    if (shieldIdx !== -1) { gameState.powerUps[targetTeamId].splice(shieldIdx, 1); return json(res, 200, { blocked: true, message: 'Target had a shield!' }); }
    let timeLimit = gameState.eventConfig.heistTimeLimit;
    const tfIdx = gameState.powerUps[attackerId].findIndex(p => p.id === 'TIME_FREEZE');
    if (tfIdx !== -1) { timeLimit += 60; gameState.powerUps[attackerId].splice(tfIdx, 1); }
    const gaIdx = gameState.powerUps[targetTeamId].findIndex(p => p.id === 'GUARDIAN_ANGEL');
    if (gaIdx !== -1) { timeLimit -= 30; gameState.powerUps[targetTeamId].splice(gaIdx, 1); }
    const heistId = uuidv4();
    gameState.heists[heistId] = { id: heistId, attackerId, targetTeamId, stage: 'compound', compoundProgress: [], safeAttempts: 0, safeChallengeIndex: null, timeLimit, startTime: Date.now(), status: 'active' };
    attacker.heistStatus = 'attacking'; target.heistStatus = 'defending';
    return json(res, 200, { heistId, timeLimit, compoundChallenges: challenges.level3.compound.map(c => ({ ...c, answer: undefined })) });
  }

  if (req.method === 'POST' && path === '/heist/compound') {
    const body = await parseBody(req);
    const heist = gameState.heists[body.heistId];
    if (!heist || heist.attackerId !== user.teamId) return json(res, 400, { error: 'Invalid heist' });
    if (Date.now() - heist.startTime > (heist.timeLimit + 5) * 1000) { failHeist(heist); return json(res, 400, { error: 'Time expired', heistFailed: true }); }
    const ch = challenges.level3.compound.find(c => c.id === body.challengeId);
    if (!ch) return json(res, 404, { error: 'Challenge not found' });
    if (body.answer.toLowerCase().trim() === ch.answer.toLowerCase().trim()) {
      heist.compoundProgress.push(body.challengeId);
      if (heist.compoundProgress.length >= challenges.level3.compound.length) {
        heist.stage = 'safe';
        const si = Math.floor(Math.random() * challenges.level3.safe.length);
        heist.safeChallengeIndex = si;
        return json(res, 200, { success: true, stageComplete: true, nextStage: 'safe', safeChallenge: { ...challenges.level3.safe[si], answer: undefined } });
      }
      return json(res, 200, { success: true, correct: true, progress: heist.compoundProgress.length });
    }
    return json(res, 200, { success: true, correct: false });
  }

  if (req.method === 'POST' && path === '/heist/safe') {
    const body = await parseBody(req);
    const heist = gameState.heists[body.heistId];
    if (!heist || heist.attackerId !== user.teamId || heist.stage !== 'safe') return json(res, 400, { error: 'Invalid heist state' });
    if (Date.now() - heist.startTime > (heist.timeLimit + 5) * 1000) { failHeist(heist); return json(res, 400, { error: 'Time expired', heistFailed: true }); }
    const sc = challenges.level3.safe[heist.safeChallengeIndex ?? 0];
    const correct = body.answer.toLowerCase().trim() === sc.answer.toLowerCase().trim();
    heist.safeAttempts++;
    const attacker = gameState.teams[heist.attackerId], target = gameState.teams[heist.targetTeamId];
    if (correct) {
      const stolen = Math.floor(target.cash * 0.5);
      target.cash -= stolen; attacker.cash += stolen;
      heist.status = 'success'; attacker.heistStatus = 'none'; target.heistStatus = 'none';
      return json(res, 200, { success: true, heistSuccess: true, stolenAmount: stolen });
    }
    if (heist.safeAttempts >= 3) {
      const amt = failHeist(heist);
      return json(res, 200, { success: true, heistSuccess: false, transferAmount: amt });
    }
    return json(res, 200, { success: true, correct: false, attemptsRemaining: 3 - heist.safeAttempts });
  }

  // ── Admin routes ──────────────────────────────────────────────────────
  if (user.role !== 'admin' && path.startsWith('/admin/')) return json(res, 403, { error: 'Admin only' });

  if (req.method === 'POST' && path === '/admin/add-cash') {
    const body = await parseBody(req);
    const team = gameState.teams[body.teamId];
    if (!team) return json(res, 404, { error: 'Team not found' });
    team.cash = Math.max(0, team.cash + body.amount);
    return json(res, 200, { success: true, newCash: team.cash });
  }

  if (req.method === 'POST' && path === '/admin/drop-powerup') {
    const body = await parseBody(req);
    const team = gameState.teams[body.teamId];
    if (!team) return json(res, 404, { error: 'Team not found' });
    if (!POWER_UPS[body.powerUpId]) return json(res, 400, { error: 'Invalid power-up' });
    const cnt = gameState.powerUps[body.teamId].filter(p => p.id === body.powerUpId).length;
    if (cnt >= 2) return json(res, 400, { error: 'Max 2 per type' });
    gameState.powerUps[body.teamId].push(POWER_UPS[body.powerUpId]);
    return json(res, 200, { success: true });
  }

  if (req.method === 'POST' && path === '/admin/remove-powerup') {
    const body = await parseBody(req);
    const team = gameState.teams[body.teamId];
    if (!team) return json(res, 404, { error: 'Team not found' });
    const idx = gameState.powerUps[body.teamId].findIndex(p => p.id === body.powerUpId);
    if (idx === -1) return json(res, 404, { error: 'Power-up not found' });
    gameState.powerUps[body.teamId].splice(idx, 1);
    return json(res, 200, { success: true });
  }

  if (req.method === 'POST' && path === '/admin/set-level') {
    const body = await parseBody(req);
    gameState.eventConfig.currentLevel = body.level;
    Object.values(gameState.teams).forEach(t => { t.currentLevel = body.level; });
    return json(res, 200, { success: true, currentLevel: body.level });
  }

  if (req.method === 'POST' && path === '/admin/create-team') {
    const body = await parseBody(req);
    const id = uuidv4();
    const code = 'GDG-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    gameState.teams[id] = { id, name: body.name, accessCode: code, cash: 0, currentLevel: gameState.eventConfig.currentLevel, completedChallenges: [], powerUps: [], heistStatus: 'none', isOnline: false, lastActive: new Date().toISOString() };
    gameState.powerUps[id] = [];
    gameState.levelProgress[id] = { level1: { logic: [], ai: [], tech: [] }, level2: { brain: [], nocode: [], prompt: [], attempted: false }, level3: { compound: [], heistTarget: null, heistStatus: 'none' } };
    return json(res, 200, { success: true, team: gameState.teams[id] });
  }

  if (req.method === 'GET' && path === '/admin/event-state') {
    return json(res, 200, {
      teams: Object.values(gameState.teams).map(t => ({ ...t, powerUps: gameState.powerUps[t.id] || [] })),
      eventConfig: gameState.eventConfig,
      heists: Object.values(gameState.heists).filter(h => h.status === 'active'),
      powerUps: POWER_UPS,
      powerUpsByTeam: gameState.powerUps
    });
  }

  if (req.method === 'POST' && path === '/admin/announcement') {
    const body = await parseBody(req);
    const msg = (body.message || '').replace(/<[^>]*>/g, '').trim();
    if (!msg) return json(res, 400, { error: 'Empty message' });
    const type = ['info', 'warning', 'success', 'error'].includes(body.type) ? body.type : 'info';
    const a = { id: uuidv4(), message: msg, type, timestamp: new Date().toISOString() };
    gameState.announcements.push(a);
    return json(res, 200, { success: true });
  }

  // ── 404 fallback ──────────────────────────────────────────────────────
  return json(res, 404, { error: 'Not found', path });
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
