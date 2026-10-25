import { GESTURES, PLAYER_MAX_HEALTH } from "../constants.js";

// Short camera status text for the left panel.
const CAMERA_LABELS = {
  initializing: "Starting camera...",
  requesting: "Waiting for camera permission...",
  granted: "Permission granted, starting video...",
  ready: "Camera ready",
  denied: "Camera permission denied",
  unavailable: "Camera unavailable",
};

// The left-side information panel (sits under the webcam):
// camera status, detected gesture + stability, and, once a game is running,
// player health, score and the Pause / Resume / Restart buttons.
function Hud({
  game, // the game state from the engine
  detection, // { handDetected, candidate, stable, count, required, progress }
  cameraStatus,
  onPause,
  onResume,
  onRestart,
}) {
  const inGame = game.phase !== "idle";
  const canPause = game.phase === "playing" || game.phase === "countdown";
  const healthPercent = (game.playerHealth / PLAYER_MAX_HEALTH) * 100;

  const candidate = GESTURES[detection.candidate];
  const stable = detection.stable !== null && detection.stable === detection.candidate;

  return (
    <div className={game.damageFlash > 0 ? "hud damaged" : "hud"}>
      <p className="status-line">
        <span className={cameraStatus === "ready" ? "dot ok" : "dot bad"} />
        {CAMERA_LABELS[cameraStatus]}
        <span className="sep">|</span>
        <span className={detection.handDetected ? "dot ok" : "dot bad"} />
        {detection.handDetected ? "Hand detected" : "Hand not detected"}
      </p>

      {/* Detected gesture and how stable it is */}
      <div className="gesture-box">
        {!detection.handDetected ? (
          <p className="no-hand">Hand not detected. Hold a hand up to the camera.</p>
        ) : (
          <>
            <div className="gesture-name">
              {candidate ? `${candidate.emoji} ${candidate.label}` : "Unknown shape"}
            </div>
            <div className="stability-track">
              <div
                className={stable ? "stability-bar stable" : "stability-bar"}
                style={{ width: `${Math.round(detection.progress * 100)}%` }}
              />
            </div>
            <div className="stability-text">
              {stable
                ? "Stable (ready to attack)"
                : `Stabilizing ${detection.count}/${detection.required}...`}
            </div>
          </>
        )}
      </div>

      {inGame && (
        <>
          <div className="player-hp" aria-label="Player health">
            <div className="player-hp-label">
              <span>❤ HEALTH</span>
              <span>
                {game.playerHealth} / {PLAYER_MAX_HEALTH}
              </span>
            </div>
            <div className="player-hp-track">
              <div
                className={healthPercent <= 30 ? "player-hp-fill low" : "player-hp-fill"}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>

          <div className="stats">
            <span>Score: {game.score}</span>
            <span>Defeated: {game.enemiesDefeated}</span>
            <span>Bosses: {game.bossesDefeated}</span>
          </div>

          <p className="attack-feedback">
            {game.lastAttack
              ? `${GESTURES[game.lastAttack.gesture].emoji} ${game.lastAttack.hit ? "Hit!" : "No target"}`
              : " "}
          </p>

          <div className="controls">
            {canPause && <button onClick={onPause}>Pause</button>}
            {game.phase === "paused" && <button onClick={onResume}>Resume</button>}
            <button className="secondary" onClick={onRestart}>
              Restart
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Hud;
