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

// ── Challenges (static, kept in code) ──────────────────────────────────────
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
      level1: { logic: [], ai: [], tech: [] },
      level2: { brain: [], nocode: [], prompt: [], attempted: false },
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
    const list = challenges[key][zone]
      .filter(c => !completed.includes(c.id))
      .map(c => ({ ...c, answer: undefined, hint: hasHint ? c.hint : undefined }));
    return json(res, 200, { challenges: list, completed, hasHintMaster: hasHint });
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

    // Level 2 track enforcement
    if (String(level) === '2') {
      const tracks = Object.keys(challenges.level2);
      const currentZoneCount = (await getCompletedChallenges(teamId, key, zone)).length;
      if (currentZoneCount >= 1) {
        const emptyTracks = [];
        for (const t of tracks) {
          if (t === zone) continue;
          const tc = await getCompletedChallenges(teamId, key, t);
          if (tc.length === 0) emptyTracks.push(t);
        }
        if (emptyTracks.length > 0) return json(res, 400, { error: `Complete at least 1 in: ${emptyTracks.join(', ')}`, requiredTracks: emptyTracks });
      }
    }

    const eventConfig = await getEventConfig();
    const correct = answer.toLowerCase().trim() === ch.answer.toLowerCase().trim();

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
