import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/**
 * GTA V-style fingerprint cloning animation.
 * Draws realistic fingerprint ridge patterns that reveal progressively.
 * Progress is driven by correct answers (0 to total).
 */
export default function FingerprintHackAnimation({ progress, total }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const pct = total > 0 ? Math.min(progress / total, 1) : 0;
  const pctRef = useRef(pct);
  pctRef.current = pct;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2 - 8;
    let running = true;

    // Pre-compute fingerprint ridge paths (only once)
    const ridges = [];

    // --- Core whorl: tight concentric U-shapes at the center ---
    const coreCount = 8;
    for (let i = 0; i < coreCount; i++) {
      const t = (i + 1) / coreCount;
      const rx = 6 + t * 28;
      const ry = 4 + t * 22;
      ridges.push({ type: 'ellipse', cx, cy: cy + 2, rx, ry, startAngle: -Math.PI, endAngle: Math.PI, dist: t * 30 });
    }

    // --- Loop ridges: arch-shaped curves flowing upward ---
    const loopCount = 18;
    for (let i = 0; i < loopCount; i++) {
      const t = (i + 1) / loopCount;
      const spread = 38 + t * 72;
      const height = 30 + t * 90;
      const yOff = -10 + t * 18;
      // Upper arch ridges
      ridges.push({
        type: 'bezier',
        x0: cx - spread, y0: cy + height * 0.4 + yOff,
        cp1x: cx - spread * 0.5, cp1y: cy - height + yOff,
        cp2x: cx + spread * 0.5, cp2y: cy - height + yOff,
        x1: cx + spread, y1: cy + height * 0.4 + yOff,
        dist: 30 + t * 100
      });
    }

    // --- Bottom ridges: gentle curves flowing downward ---
    const bottomCount = 12;
    for (let i = 0; i < bottomCount; i++) {
      const t = (i + 1) / bottomCount;
      const spread = 32 + t * 68;
      const depth = 20 + t * 60;
      const yOff = 15 + t * 12;
      ridges.push({
        type: 'bezier',
        x0: cx - spread, y0: cy + yOff,
        cp1x: cx - spread * 0.3, cp1y: cy + depth + yOff,
        cp2x: cx + spread * 0.3, cp2y: cy + depth + yOff,
        x1: cx + spread, y1: cy + yOff,
        dist: 25 + t * 95
      });
    }

    // Sort by distance from center for reveal order
    const maxDist = Math.max(...ridges.map(r => r.dist));

    function drawFrame() {
      if (!running) return;
      const p = pctRef.current;

      ctx.clearRect(0, 0, W, H);

      // Dark background
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, W, H);

      // Subtle radial vignette
      const vignette = ctx.createRadialGradient(cx, cy, 30, cx, cy, W * 0.7);
      vignette.addColorStop(0, 'rgba(0,255,156,0.02)');
      vignette.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // Fine grid dots
      ctx.fillStyle = 'rgba(0,255,156,0.04)';
      for (let x = 10; x < W; x += 16) {
        for (let y = 10; y < H - 24; y += 16) {
          ctx.fillRect(x, y, 1, 1);
        }
      }

      // Reveal threshold: ridges within this distance are visible
      const revealDist = p * maxDist * 1.15;

      // Draw each ridge
      for (const ridge of ridges) {
        const revealed = ridge.dist <= revealDist;
        const fadeDist = maxDist * 0.15;
        let alpha = 0;

        if (revealed) {
          // Fade in near the edge of reveal
          const overshoot = revealDist - ridge.dist;
          alpha = Math.min(1, overshoot / fadeDist);
        }

        if (ridge.type === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse(ridge.cx, ridge.cy, ridge.rx, ridge.ry, 0, ridge.startAngle, ridge.endAngle);
          if (revealed) {
            ctx.strokeStyle = `rgba(0,255,156,${0.35 + alpha * 0.45})`;
            ctx.lineWidth = 1.4;
          } else {
            ctx.strokeStyle = 'rgba(0,255,156,0.04)';
            ctx.lineWidth = 0.5;
          }
          ctx.stroke();
        } else if (ridge.type === 'bezier') {
          ctx.beginPath();
          ctx.moveTo(ridge.x0, ridge.y0);
          ctx.bezierCurveTo(ridge.cp1x, ridge.cp1y, ridge.cp2x, ridge.cp2y, ridge.x1, ridge.y1);
          if (revealed) {
            ctx.strokeStyle = `rgba(0,255,156,${0.3 + alpha * 0.4})`;
            ctx.lineWidth = 1.2;
          } else {
            ctx.strokeStyle = 'rgba(0,255,156,0.03)';
            ctx.lineWidth = 0.5;
          }
          ctx.stroke();
        }
      }

      // Scanning line (only when not complete)
      if (p < 1) {
        const scanY = ((Date.now() % 2500) / 2500) * (H - 24);
        const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
        grad.addColorStop(0, 'rgba(0,255,156,0)');
        grad.addColorStop(0.3, 'rgba(0,255,156,0.06)');
        grad.addColorStop(0.5, 'rgba(0,255,156,0.12)');
        grad.addColorStop(0.7, 'rgba(0,255,156,0.06)');
        grad.addColorStop(1, 'rgba(0,255,156,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, scanY - 30, W, 60);

        // Scan line core
        ctx.strokeStyle = 'rgba(0,255,156,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, scanY);
        ctx.lineTo(W - 20, scanY);
        ctx.stroke();
      }

      // Outer fingerprint oval boundary (like a thumb outline)
      ctx.beginPath();
      ctx.ellipse(cx, cy, W * 0.38, H * 0.4, 0, 0, Math.PI * 2);
      ctx.strokeStyle = p >= 1 ? 'rgba(0,255,156,0.4)' : 'rgba(0,255,156,0.08)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Status text at bottom
      ctx.font = '11px "Orbitron", monospace';
      ctx.textAlign = 'center';
      if (p >= 1) {
        ctx.fillStyle = 'rgba(0,255,156,0.9)';
        ctx.fillText('FINGERPRINT CLONED', cx, H - 10);
      } else {
        ctx.fillStyle = 'rgba(0,255,156,0.6)';
        ctx.fillText(`CLONING... ${Math.round(p * 100)}%`, cx, H - 10);
      }

      frameRef.current = requestAnimationFrame(drawFrame);
    }

    frameRef.current = requestAnimationFrame(drawFrame);
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center"
    >
      <div className="text-center mb-2">
        <span className="text-xs font-digital text-gta-green/70 tracking-[3px] uppercase">
          Fingerprint Scanner
        </span>
      </div>
      <div className="relative border border-gta-green/15 rounded-lg bg-[#060608] p-1 shadow-[0_0_20px_rgba(0,255,156,0.05)]">
        <canvas
          ref={canvasRef}
          width={260}
          height={320}
          className="block rounded-lg"
        />
        {pct >= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-gta-green text-xl font-digital mb-1"
              >
                ACCESS GRANTED
              </motion.div>
              <div className="text-gta-green/50 text-xs font-mono">Fingerprint match 100%</div>
            </div>
          </motion.div>
        )}
      </div>
      {/* Progress bar */}
      <div className="mt-3 w-full h-1.5 bg-gta-dark rounded-full overflow-hidden border border-gta-green/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-gta-green/60 to-gta-green"
        />
      </div>
    </motion.div>
  );
}
