// Full-panel messages that sit on top of the arena.

export function CountdownOverlay({ label }) {
  // key={label} makes React restart the pop animation for every number.
  return (
    <div className="overlay">
      <div key={label} className="countdown">
        {label}
      </div>
    </div>
  );
}

export function PausedOverlay({ onResume, onRestart }) {
  return (
    <div className="overlay">
      <h2>PAUSED</h2>
      <p>Enemies and timers are frozen. The camera is still running.</p>
      <div className="controls">
        <button onClick={onResume}>Resume</button>
        <button className="secondary" onClick={onRestart}>
          Restart
        </button>
      </div>
    </div>
  );
}

export function GameOverOverlay({ game, best, isNewBest, onRestart }) {
  return (
    <div className="overlay game-over">
      <h2>GAME OVER</h2>
      <p className="big">Score: {game.score}</p>
      {isNewBest && <p className="new-best">New best score!</p>}
      <ul className="result-list">
        <li>Highest round: {game.round}</li>
        <li>Enemies defeated: {game.enemiesDefeated}</li>
        <li>Bosses defeated: {game.bossesDefeated}</li>
        <li>Best score: {best}</li>
      </ul>
      <button onClick={onRestart}>Restart</button>
    </div>
  );
}
