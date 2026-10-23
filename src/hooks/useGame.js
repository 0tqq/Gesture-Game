import { useEffect, useState } from "react";
import { GAME_SECONDS, HOLD_MS, GESTURE_KEYS } from "../constants.js";

// Pick a random gesture, never the same one twice in a row.
function pickGesture(previous) {
  const options = GESTURE_KEYS.filter((key) => key !== previous);
  return options[Math.floor(Math.random() * options.length)];
}

// All the game rules live here. It receives the current gesture from the
// camera and decides when you score.
export function useGame(gesture) {
  const [status, setStatus] = useState("idle"); // "idle" | "playing" | "over"
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [target, setTarget] = useState(() => pickGesture(null));

  function startGame() {
    setScore(0);
    setTimeLeft(GAME_SECONDS);
    setTarget(pickGesture(null));
    setStatus("playing");
  }

  // 1) Countdown: subtract one second, every second, while playing.
  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  // 2) When time runs out, the game is over.
  useEffect(() => {
    if (status === "playing" && timeLeft <= 0) setStatus("over");
  }, [status, timeLeft]);

  // 3) Scoring: if you are showing the target gesture, start a timer.
  //    If your gesture changes before it finishes, the cleanup cancels it,
  //    so you have to HOLD the gesture for HOLD_MS.
  useEffect(() => {
    if (status !== "playing" || gesture !== target) return;
    const id = setTimeout(() => {
      setScore((s) => s + 1);
      setTarget((previous) => pickGesture(previous));
    }, HOLD_MS);
    return () => clearTimeout(id);
  }, [status, gesture, target]);

  return { status, score, timeLeft, target, startGame };
}
