import { useState, useEffect, useRef } from 'react';

/**
 * Hacker-style typewriter that types each line character-by-character
 * with a blinking cursor.
 *
 * Props:
 *   lines     – [{ text, className, delay (ms before this line starts) }]
 *   charSpeed – ms per character (default 30)
 *   onComplete – called when all lines finish typing
 */
export default function HackerTypewriter({ lines = [], charSpeed = 30, onComplete }) {
  // displayed[i] = how many characters of lines[i] are visible
  const [displayed, setDisplayed] = useState(() => lines.map(() => 0));
  const [activeLine, setActiveLine] = useState(-1); // which line is currently typing
  const timeouts = useRef([]);

  useEffect(() => {
    // Clean up on unmount
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    // Schedule each line to start typing after its delay
    lines.forEach((line, idx) => {
      const t = setTimeout(() => {
        setActiveLine(prev => Math.max(prev, idx));
      }, line.delay || 0);
      timeouts.current.push(t);
    });
  }, []);

  // When activeLine advances, start typing that line character by character
  useEffect(() => {
    if (activeLine < 0 || activeLine >= lines.length) return;

    const text = lines[activeLine].text;
    let charIdx = 0;

    const interval = setInterval(() => {
      charIdx++;
      setDisplayed(prev => {
        const next = [...prev];
        next[activeLine] = charIdx;
        return next;
      });
      if (charIdx >= text.length) {
        clearInterval(interval);
        // If this was the last line, fire onComplete
        if (activeLine === lines.length - 1 && onComplete) {
          onComplete();
        }
      }
    }, charSpeed);

    return () => clearInterval(interval);
  }, [activeLine]);

  return (
    <div className="text-left">
      {lines.map((line, idx) => {
        const charsShown = displayed[idx] || 0;
        if (idx > activeLine && activeLine >= 0) return null; // not started yet
        if (activeLine < 0) return null;

        const isTyping = idx === activeLine && charsShown < line.text.length;

        return (
          <p key={idx} className={line.className}>
            <span>{line.text.slice(0, charsShown)}</span>
            {isTyping && (
              <span className="inline-block w-2 h-[1.1em] bg-gta-green/80 ml-px align-middle animate-pulse" />
            )}
          </p>
        );
      })}
    </div>
  );
}
