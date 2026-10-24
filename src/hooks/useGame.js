import { useEffect, useRef, useState } from "react";
import {
  HOLD_MS,
  START_TIME_LIMIT_MS,
  TIME_STEP_MS,
  MIN_TIME_LIMIT_MS,
  START_SPAWN_DELAY_MS,
  SPAWN_DELAY_STEP_MS,
  MIN_SPAWN_DELAY_MS,
  GESTURE_KEYS,
} from "../constants.js";

// --- Difficulty curve: both shrink as you defeat more enemies ---
// Example with the default settings:
//   0 defeated -> 5000 ms to react, 800 ms pause
//   5 defeated -> 4000 ms to react, 550 ms pause
//  17+ defeated -> 1600 ... 1500 ms (the floor), 150 ms pause
function getTimeLimit(defeated) {
  return Math.max(MIN_TIME_LIMIT_MS, START_TIME_LIMIT_MS - defeated * TIME_STEP_MS);
}

function getSpawnDelay(defeated) {
  return Math.max(MIN_SPAWN_DELAY_MS, START_SPAWN_DELAY_MS - defeated * SPAWN_DELAY_STEP_MS);
}

// Pick a random gesture, never the same one twice in a row.
function pickGesture(previous) {
  const options = GESTURE_KEYS.filter((key) => key !== previous);
  return options[Math.floor(Math.random() * options.length)];
}

// All the game rules live here. It receives the current gesture from the
// camera and decides when an enemy dies or the player loses.
export function useGame(gesture) {
  const [status, setStatus] = useState("idle"); // "idle" | "playing" | "over"
  const [enemy, setEnemy] = useState(null); // { id, gesture, timeLimit } or null
  const [timeLeft, setTimeLeft] = useState(0); // ms left for the current enemy
  const [defeated, setDefeated] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0); // best score since the page loaded

  // Refs hold values we need to READ inside timers without restarting them.
  const timeLeftRef = useRef(0);
  const lastGestureRef = useRef(null);

  function startGame() {
    setScore(0);
    setDefeated(0);
    setEnemy(null);
    setTimeLeft(0);
    lastGestureRef.current = null;
    setStatus("playing");
  }

  // 1) SPAWN: whenever there is no enemy, wait a short pause, then create one.
  //    The pause gets shorter as `defeated` grows.
  useEffect(() => {
    if (status !== "playing" || enemy !== null) return;

    const id = setTimeout(() => {
      const timeLimit = getTimeLimit(defeated);
      const gestureKey = pickGesture(lastGestureRef.current);
      lastGestureRef.current = gestureKey;

      timeLeftRef.current = timeLimit;
      setTimeLeft(timeLimit);
      setEnemy({ id: Date.now(), gesture: gestureKey, timeLimit });
    }, getSpawnDelay(defeated));

    return () => clearTimeout(id);
  }, [status, enemy, defeated]);

  // 2) ENEMY TIMER: count down toward a deadline. If it is reached before
  //    the enemy is defeated, the player loses.
  //    We compare against the real clock (performance.now) instead of
  //    subtracting 50 each tick, so the timer stays accurate.
  useEffect(() => {
    if (status !== "playing" || enemy === null) return;

    const deadline = performance.now() + enemy.timeLimit;
    const id = setInterval(() => {
      const remaining = deadline - performance.now();
      if (remaining <= 0) {
        timeLeftRef.current = 0;
        setTimeLeft(0);
        setStatus("over"); // GAME OVER
      } else {
        timeLeftRef.current = remaining;
        setTimeLeft(remaining);
      }
    }, 50);

    // When the enemy is defeated (enemy becomes null) this cleanup stops it.
    return () => clearInterval(id);
  }, [status, enemy]);

  // 3) DEFEAT: if you show the enemy's gesture, hold it for HOLD_MS to hit.
  //    If your gesture changes first, the cleanup cancels the timer.
  useEffect(() => {
    if (status !== "playing" || enemy === null || gesture !== enemy.gesture) return;

    const id = setTimeout(() => {
      // 10 points per enemy, plus up to 10 bonus points for being fast.
      const speedBonus = Math.round((10 * timeLeftRef.current) / enemy.timeLimit);
      setScore((s) => s + 10 + speedBonus);
      setDefeated((d) => d + 1);
      setEnemy(null); // triggers the spawn effect for the next enemy
    }, HOLD_MS);

    return () => clearTimeout(id);
  }, [status, enemy, gesture]);

  // 4) Remember the best score once the game ends.
  useEffect(() => {
    if (status === "over") setBest((b) => Math.max(b, score));
  }, [status, score]);

  return { status, enemy, timeLeft, defeated, score, best, startGame };
}
