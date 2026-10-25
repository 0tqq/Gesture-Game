import { GESTURES } from "../constants.js";

// The start screen (right half before a game): title, instructions,
// the gesture list, camera / model status with Retry buttons, Start button.

function StatusRow({ state, text, onRetry }) {
  // state: "ok" | "wait" | "bad"
  const icon = state === "ok" ? "✔" : state === "bad" ? "✖" : "…";
  return (
    <li className={`check ${state}`}>
      <span className="check-icon">{icon}</span>
      <span className="check-text">{text}</span>
      {onRetry && (
        <button className="small" onClick={onRetry}>
          Retry
        </button>
      )}
    </li>
  );
}

function cameraRow(cameraStatus, cameraError) {
  switch (cameraStatus) {
    case "ready":
      return ["ok", "Camera ready"];
    case "denied":
      return [
        "bad",
        "Camera permission denied. Click the camera icon in the address bar, allow access, then press Retry.",
      ];
    case "unavailable":
      return ["bad", cameraError || "Camera unavailable."];
    case "granted":
      return ["wait", "Permission granted, starting the video..."];
    case "requesting":
      return ["wait", "Waiting for camera permission. Click Allow in the browser prompt."];
    default:
      return ["wait", "Starting the camera..."];
  }
}

function StartScreen({
  cameraStatus,
  cameraError,
  onRetryCamera,
  modelStatus,
  modelError,
  onRetryModel,
  handDetected,
  canStart,
  onStart,
}) {
  const [camState, camText] = cameraRow(cameraStatus, cameraError);
  const cameraFailed = cameraStatus === "denied" || cameraStatus === "unavailable";

  return (
    <div className="start-screen">
      <h2>Defend with your hands</h2>
      <ul className="instructions">
        <li>Enemies walk toward your defence line. Each one shows a gesture.</li>
        <li>Make that gesture and hold it a moment to hit the closest matching enemy.</li>
        <li>Change or lower your hand between attacks. One held gesture hits once.</li>
        <li>Enemies that reach you cost health. At 0 health the game is over.</li>
        <li>After the normal enemies, a boss asks for a sequence of gestures.</li>
      </ul>

      <h3>Gestures</h3>
      <ul className="gesture-list">
        {Object.entries(GESTURES).map(([key, g]) => (
          <li key={key}>
            <span className="gesture-list-emoji">{g.emoji}</span>
            <span>
              <strong>{g.label}</strong>
              <br />
              <small>{g.hint}</small>
            </span>
          </li>
        ))}
      </ul>

      <h3>Before you start</h3>
      <ul className="checks">
        <StatusRow
          state={camState}
          text={camText}
          onRetry={cameraFailed ? onRetryCamera : null}
        />
        <StatusRow
          state={modelStatus === "ready" ? "ok" : modelStatus === "error" ? "bad" : "wait"}
          text={
            modelStatus === "ready"
              ? "Hand model ready"
              : modelStatus === "error"
              ? modelError
              : "Loading the hand model (needs internet, a few seconds)..."
          }
          onRetry={modelStatus === "error" ? onRetryModel : null}
        />
        {canStart && (
          <StatusRow
            state={handDetected ? "ok" : "wait"}
            text={
              handDetected
                ? "Hand detected"
                : "Hand not detected yet. Hold a hand up to try the gestures."
            }
          />
        )}
      </ul>

      <button className="start-button" onClick={onStart} disabled={!canStart}>
        Start Game
      </button>
    </div>
  );
}

export default StartScreen;
