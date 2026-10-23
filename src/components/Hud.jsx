import { GESTURES } from "../constants.js";

// The score board: target gesture, what the camera sees, score, time, button.
function Hud({ status, score, timeLeft, target, gesture, onStart }) {
  const matching = status === "playing" && gesture === target;
  const seen = GESTURES[gesture];

  return (
    <div className="hud">
      <div className="stats">
        <span>Score: {score}</span>
        <span>Time: {timeLeft}s</span>
      </div>

      {status === "playing" && (
        <div className={matching ? "target matching" : "target"}>
          <div className="target-emoji">{GESTURES[target].emoji}</div>
          <div>Show: {GESTURES[target].label}</div>
        </div>
      )}

      <p className="seen">
        I see: {seen ? `${seen.emoji} ${seen.label}` : "no gesture"}
      </p>

      {status === "idle" && <button onClick={onStart}>Start Game</button>}
      {status === "over" && (
        <div>
          <h2>Time's up! Final score: {score}</h2>
          <button onClick={onStart}>Play Again</button>
        </div>
      )}
    </div>
  );
}

export default Hud;
