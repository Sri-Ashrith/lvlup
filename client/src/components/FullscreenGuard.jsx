import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Maximize, AlertTriangle, ShieldOff, Monitor } from 'lucide-react';
import axios from 'axios';

const configuredApiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE_URL = import.meta.env.DEV
  ? (configuredApiBase || 'http://localhost:3001')
  : configuredApiBase;
const API_URL = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

/* ── helpers ─────────────────────────────────────────────────── */
/** Cross-browser: is the document currently in fullscreen? */
function isDocumentFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

/** Heuristic fallback: screen matches viewport → "browser fullscreen" (F11). */
function isWindowFullscreen() {
  const heightMatch = window.innerHeight >= screen.height - 10;
  const widthMatch = window.innerWidth >= screen.width - 10;
  return heightMatch && widthMatch;
}

/** Combined check. */
function checkFullscreen() {
  return isDocumentFullscreen() || isWindowFullscreen();
}

/** Cross-browser request fullscreen. */
async function requestFS() {
  const el = document.documentElement;
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
  if (el.msRequestFullscreen) return el.msRequestFullscreen();
}

/* ── component ───────────────────────────────────────────────── */
/**
 * FullscreenGuard — wraps the entire app for team users.
 * - On load: blurs screen and asks user to enter fullscreen.
 * - Tracks fullscreen exits. 3 exits = disqualification.
 * - Reports violations to the server.
 * - Admins and unauthenticated users bypass the guard entirely.
 *
 * Supports: Fullscreen API, vendor-prefixed variants, F11 / browser
 * fullscreen via resize heuristic.
 */
export default function FullscreenGuard({ children }) {
  const { user, team, token } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState(checkFullscreen);
  const [hasEnteredOnce, setHasEnteredOnce] = useState(false);
  const [violations, setViolations] = useState(0);
  const [disqualified, setDisqualified] = useState(false);
  const violationsRef = useRef(0);
  const wasFullscreenRef = useRef(false);
  const MAX_VIOLATIONS = 3;

  const isTeamUser = user?.role === 'team' && !!team;

  /* ── Mark entered / detect exit ───────────────────────────── */
  const syncFullscreen = (fs) => {
    setIsFullscreen(fs);
    if (fs) {
      setHasEnteredOnce(true);
      wasFullscreenRef.current = true;
    }
  };

  const recordViolation = () => {
    if (disqualified) return;
    const newCount = violationsRef.current + 1;
    violationsRef.current = newCount;
    setViolations(newCount);
    reportViolation(newCount);
    if (newCount >= MAX_VIOLATIONS) {
      setDisqualified(true);
      reportDisqualification();
    }
  };

  /* ── Fullscreen API event (standard + vendor) ─────────────── */
  useEffect(() => {
    const handler = () => {
      const fs = checkFullscreen();
      if (!fs && wasFullscreenRef.current && isTeamUser) {
        recordViolation();
      }
      syncFullscreen(fs);
    };

    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange',
    ];
    events.forEach((e) => document.addEventListener(e, handler));
    return () => events.forEach((e) => document.removeEventListener(e, handler));
  }, [isTeamUser, disqualified]);

  /* ── Resize fallback (catches F11 browser-fullscreen) ─────── */
  useEffect(() => {
    let timer;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const fs = checkFullscreen();
        if (fs && !wasFullscreenRef.current) {
          // Just entered fullscreen (probably F11)
          syncFullscreen(true);
        } else if (!fs && wasFullscreenRef.current && isTeamUser) {
          recordViolation();
          syncFullscreen(false);
        } else {
          setIsFullscreen(fs);
        }
      }, 200); // debounce
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(timer);
    };
  }, [isTeamUser, disqualified]);

  /* ── Check DQ status on mount ─────────────────────────────── */
  useEffect(() => {
    if (isTeamUser && token) {
      (async () => {
        try {
          const res = await axios.get(`${API_URL}/team/fullscreen-status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data.disqualified) {
            setDisqualified(true);
            violationsRef.current = res.data.violations || MAX_VIOLATIONS;
            setViolations(res.data.violations || MAX_VIOLATIONS);
          } else {
            violationsRef.current = res.data.violations || 0;
            setViolations(res.data.violations || 0);
          }
        } catch (_) {
          /* server may not support endpoint yet */
        }
      })();
    }
  }, [isTeamUser, token]);

  /* ── Server helpers ───────────────────────────────────────── */
  const reportViolation = async (count) => {
    try {
      await axios.post(
        `${API_URL}/team/fullscreen-violation`,
        { violations: count },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (_) {}
  };
  const reportDisqualification = async () => {
    try {
      await axios.post(
        `${API_URL}/team/fullscreen-disqualify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (_) {}
  };

  /* ── Enter fullscreen (button) ────────────────────────────── */
  const enterFullscreen = async () => {
    try {
      await requestFS();
      // API should trigger fullscreenchange → syncFullscreen.
      // As an extra safety net, set state directly too:
      syncFullscreen(true);
    } catch (e) {
      // requestFullscreen failed — check if we're actually fullscreen anyway
      if (checkFullscreen()) {
        syncFullscreen(true);
      } else {
        console.warn('Fullscreen request failed. Please press F11.');
      }
    }
  };

  /* ── Bypass for non-team users ────────────────────────────── */
  if (!isTeamUser) return children;

  /* ── Style override: show native cursor on guard overlays ── */
  const cursorOverride = (
    <style>{`
      .fs-guard-overlay, .fs-guard-overlay *, .fs-guard-overlay *::before, .fs-guard-overlay *::after {
        cursor: default !important;
      }
      .fs-guard-overlay button, .fs-guard-overlay button * {
        cursor: pointer !important;
      }
    `}</style>
  );

  /* ── DISQUALIFIED — hard block ────────────────────────────── */
  if (disqualified) {
    return (
      <div className="fs-guard-overlay fixed inset-0 z-[99999] bg-black flex items-center justify-center">
        {cursorOverride}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md px-6"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <ShieldOff className="w-24 h-24 text-gta-red mx-auto mb-6" />
          </motion.div>
          <h1
            className="text-4xl font-bold text-gta-red mb-4 uppercase tracking-[4px]"
            style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}
          >
            DISQUALIFIED
          </h1>
          <p className="text-gray-400 font-mono text-sm mb-4">
            Your team has been disqualified for exiting fullscreen {MAX_VIOLATIONS} times.
          </p>
          <p className="text-gray-500 font-mono text-xs mb-8">
            Contact an admin if you believe this was an error.
          </p>
          <div className="p-4 rounded-lg border border-gta-red/30 bg-gta-red/5">
            <p className="text-gta-red font-digital text-sm">TEAM: {team?.name || 'Unknown'}</p>
            <p className="text-gta-red/60 font-mono text-xs mt-1">
              Violations: {violations}/{MAX_VIOLATIONS}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── INITIAL PROMPT — ask user to go fullscreen ───────────── */
  if (!isFullscreen && !hasEnteredOnce) {
    return (
      <div className="fs-guard-overlay fixed inset-0 z-[99999] bg-black/95 backdrop-blur-xl flex items-center justify-center">
        {cursorOverride}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-lg px-6"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          >
            <Monitor className="w-20 h-20 text-gta-green mx-auto mb-6" />
          </motion.div>

          <h1
            className="text-3xl font-bold text-white mb-3 uppercase tracking-[3px]"
            style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}
          >
            FULLSCREEN REQUIRED
          </h1>

          <p className="text-gray-400 font-mono text-sm mb-2">
            This event requires fullscreen mode for fair play.
          </p>
          <p className="text-gray-500 font-mono text-xs mb-8">
            You will be disqualified if you exit fullscreen {MAX_VIOLATIONS} times.
          </p>

          <button
            onClick={enterFullscreen}
            className="gta-button gta-button-success px-8 py-4 text-lg mb-4 w-full max-w-xs mx-auto flex items-center justify-center gap-3"
          >
            <Maximize className="w-5 h-5" />
            ENTER FULLSCREEN
          </button>

          <p className="text-gray-600 font-mono text-xs">
            Or press{' '}
            <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-400 border border-gray-700">
              F11
            </kbd>{' '}
            on your keyboard
          </p>
        </motion.div>
      </div>
    );
  }

  /* ── EXITED FULLSCREEN — warning overlay ──────────────────── */
  if (!isFullscreen && hasEnteredOnce) {
    return (
      <>
        <div className="filter blur-xl pointer-events-none select-none opacity-30">{children}</div>

        <div className="fs-guard-overlay fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center">
          {cursorOverride}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md px-6"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <AlertTriangle className="w-16 h-16 text-gta-red mx-auto mb-4" />
            </motion.div>

            <h2
              className="text-2xl font-bold text-gta-red mb-3 uppercase tracking-[3px]"
              style={{ fontFamily: "'Pricedown', 'Impact', sans-serif" }}
            >
              FULLSCREEN EXIT DETECTED
            </h2>

            <p className="text-gray-400 font-mono text-sm mb-2">
              You have exited fullscreen mode.
            </p>

            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-gray-500 font-mono text-xs">Violations:</span>
              <div className="flex gap-1">
                {Array.from({ length: MAX_VIOLATIONS }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-8 h-2.5 rounded-full transition-all duration-300 ${
                      i < violations ? 'bg-gta-red' : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gta-red font-digital text-sm">
                {violations}/{MAX_VIOLATIONS}
              </span>
            </div>

            {violations < MAX_VIOLATIONS && (
              <p className="text-yellow-500/80 font-mono text-xs mb-6">
                {MAX_VIOLATIONS - violations} more exit
                {MAX_VIOLATIONS - violations !== 1 ? 's' : ''} and your team will be disqualified!
              </p>
            )}

            <button
              onClick={enterFullscreen}
              className="gta-button gta-button-danger px-8 py-4 text-lg w-full max-w-xs mx-auto flex items-center justify-center gap-3"
            >
              <Maximize className="w-5 h-5" />
              RETURN TO FULLSCREEN
            </button>

            <p className="text-gray-600 font-mono text-xs mt-4">
              Press{' '}
              <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-400 border border-gray-700">
                F11
              </kbd>{' '}
              to re-enter
            </p>
          </motion.div>
        </div>
      </>
    );
  }

  /* ── IN FULLSCREEN — render app normally ──────────────────── */
  return children;
}
