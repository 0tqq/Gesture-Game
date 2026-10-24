import { GESTURES } from "../constants.js";

// The heads-up display: enemy, countdown bar, score, game over screen.
function Hud({ status, enemy, timeLeft, defeated, score, best, gesture, onStart }) {
  const seen = GESTURES[gesture];

  // Idle: before the first game.
  if (status === "idle") {
    return (
      <div className="hud">
        <p>Enemies keep coming. Copy the gesture they show before their timer runs out.</p>
        <p>One miss and it is game over!</p>
        <button onClick={onStart}>Start Game</button>
      </div>
    );
  }

  // Game over screen.
  if (status === "over") {
    return (
      <div className="hud game-over">
        <h2>GAME OVER</h2>
        <p className="big">Score: {score}</p>
        <p>Enemies defeated: {defeated}</p>
        <p>Best score: {best}</p>
        {enemy && (
          <p className="seen">
            You needed: {GESTURES[enemy.gesture].emoji} {GESTURES[enemy.gesture].label}
          </p>
        )}
        <button onClick={onStart}>Play Again</button>
      </div>
    );
  }

  // Playing.
  const percent = enemy ? Math.max(0, (timeLeft / enemy.timeLimit) * 100) : 0;
  const danger = percent < 30; // bar turns red when time is almost out
  const matching = enemy !== null && gesture === enemy.gesture;

  return (
    <div className="hud">
      <div className="stats">
        <span>Score: {score}</span>
        <span>Streak: {defeated}</span>
      </div>

      {enemy ? (
        <div className={matching ? "enemy matching" : "enemy"}>
          <div className="enemy-face">👾</div>
          <div className="enemy-need">
            <span className="need-emoji">{GESTURES[enemy.gesture].emoji}</span>
            <span>Show: {GESTURES[enemy.gesture].label}</span>
          </div>

          <div className="timer-track">
            <div
              className={danger ? "timer-bar danger" : "timer-bar"}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="timer-text">{(timeLeft / 1000).toFixed(1)}s</div>
        </div>
      ) : (
        <div className="enemy waiting">
          <div className="enemy-face">...</div>
          <div>Next enemy incoming!</div>
        </div>
      )}

      <p className="seen">
        I see: {seen ? `${seen.emoji} ${seen.label}` : "no gesture"}
      </p>
    </div>
  );
}

export default Hud;
