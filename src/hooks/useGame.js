import { useCallback, useEffect, useRef, useState } from "react";
import {
  createState,
  startCountdown,
  tick,
  attack,
  pause as pauseState,
  resume as resumeState,
} from "../game/engine.js";
import { loadBestScore, saveBestScore } from "../utils/storage.js";

// Connects the pure game rules (game/engine.js) to React.
//
// The latest game state lives in a ref, so callbacks (attack, pause ...)
// always see the newest state and can never use a stale copy. Every change
// is also copied into React state so the screen re-renders.
//
// There is exactly ONE game loop. It only runs while the phase is
// "countdown" or "playing"; pausing or game over stops it completely.
export function useGame() {
  const stateRef = useRef(null);
  if (stateRef.current === null) stateRef.current = createState();

  const [state, setState] = useState(stateRef.current);
  const [best, setBest] = useState(() => loadBestScore());
  const [isNewBest, setIsNewBest] = useState(false);

  // Every state change goes through here.
  const publish = useCallback((next) => {
    const previous = stateRef.current;
    if (next === previous) return; // nothing changed, no re-render

    stateRef.current = next;

    // The moment the game ends, save the best score (only if it was beaten).
    if (previous.phase !== "over" && next.phase === "over") {
      const before = loadBestScore();
      const after = saveBestScore(next.score);
      setBest(after);
      setIsNewBest(after > before);
    }
    setState(next);
  }, []);

  // The one game loop.
  const running = state.phase === "countdown" || state.phase === "playing";
  useEffect(() => {
    if (!running) return;

    let last = performance.now();
    let frameId;

    function frame(now) {
      const dt = now - last;
      last = now;
      publish(tick(stateRef.current, dt));
      frameId = requestAnimationFrame(frame);
    }
    frameId = requestAnimationFrame(frame);

    return () => cancelAnimationFrame(frameId);
  }, [running, publish]);

  // Start and Restart do the same thing: a brand-new game with a countdown.
  // No page reload, and no new loop is created (the effect above keeps ONE).
  const start = useCallback(() => {
    setIsNewBest(false);
    publish(startCountdown());
  }, [publish]);

  const attackWith = useCallback(
    (gesture) => publish(attack(stateRef.current, gesture)),
    [publish]
  );
  const pause = useCallback(() => publish(pauseState(stateRef.current)), [publish]);
  const resume = useCallback(() => publish(resumeState(stateRef.current)), [publish]);

  return {
    state,
    best,
    isNewBest,
    start,
    restart: start,
    attack: attackWith,
    pause,
    resume,
  };
}
