import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Lock picking animation for the Safe Cracking stage.
 * Shows a rotating lock with pick attempts.
 */
export default function LockPickAnimation({ attempting, success }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const now = Date.now();

      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, W, H);

      // Outer ring
      ctx.beginPath();
      ctx.arc(cx, cy, 90, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(212,175,55,0.3)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(212,175,55,0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tick marks
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const innerR = i % 3 === 0 ? 82 : 86;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
        ctx.lineTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90);
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(212,175,55,0.5)' : 'rgba(212,175,55,0.2)';
        ctx.lineWidth = i % 3 === 0 ? 2 : 1;
        ctx.stroke();
      }

      // Keyhole
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fillStyle = success ? 'rgba(0,255,156,0.3)' : 'rgba(212,175,55,0.2)';
      ctx.fill();
      ctx.strokeStyle = success ? '#00FF9C' : 'rgba(212,175,55,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Keyhole slot
      ctx.beginPath();
      ctx.roundRect(cx - 3, cy - 2, 6, 20, 2);
      ctx.fillStyle = '#0a0a0a';
      ctx.fill();

      if (attempting && !success) {
        // Lock pick (animated)
        const pickAngle = Math.sin(now / 200) * 0.4;
        const pickLen = 55;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(pickAngle);
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(0, pickLen);
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // Pick tip
        ctx.beginPath();
        ctx.moveTo(-4, pickLen);
        ctx.lineTo(0, pickLen + 8);
        ctx.lineTo(4, pickLen);
        ctx.fillStyle = '#D4AF37';
        ctx.fill();
        ctx.restore();

        // Tension wrench
        const wrenchAngle = Math.sin(now / 300) * 0.15 - 1.2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(wrenchAngle);
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(0, 45);
        ctx.lineTo(-8, 45);
        ctx.strokeStyle = 'rgba(212,175,55,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Vibration effect on dial
        const vibX = (Math.random() - 0.5) * 1.5;
        const vibY = (Math.random() - 0.5) * 1.5;
        ctx.beginPath();
        ctx.arc(cx + vibX, cy + vibY, 30, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(212,175,55,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (success) {
        // Green glow
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100);
        glow.addColorStop(0, 'rgba(0,255,156,0.15)');
        glow.addColorStop(1, 'rgba(0,255,156,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        // UNLOCKED text
        ctx.font = 'bold 14px "Orbitron", monospace';
        ctx.fillStyle = '#00FF9C';
        ctx.textAlign = 'center';
        ctx.fillText('UNLOCKED', cx, cy + 50);
      }

      // Status text
      ctx.font = '10px "Orbitron", monospace';
      ctx.fillStyle = success ? 'rgba(0,255,156,0.7)' : 'rgba(212,175,55,0.5)';
      ctx.textAlign = 'center';
      const status = success ? 'SAFE OPENED' : (attempting ? 'PICKING LOCK...' : 'AWAITING INPUT');
      ctx.fillText(status, cx, H - 10);

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, [attempting, success]);

  return (
    <div className="lock-pick-container">
      <div className="text-center mb-3">
        <span className="text-xs font-digital text-gta-gold/70 tracking-[3px] uppercase">
          Safe Mechanism
        </span>
      </div>
      <div className="border border-gta-gold/20 rounded bg-black p-1">
        <canvas
          ref={canvasRef}
          width={220}
          height={220}
          className="mx-auto block rounded"
        />
      </div>
    </div>
  );
}
