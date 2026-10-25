import { useEffect, useRef } from "react";
import Camera from "./components/Camera.jsx";
import Hud from "./components/Hud.jsx";
import Arena from "./components/Arena.jsx";
import StartScreen from "./components/StartScreen.jsx";
import { useWebcam } from "./hooks/useWebcam.js";
import { useHandLandmarker } from "./hooks/useHandLandmarker.js";
import { useGestureDetection } from "./hooks/useGestureDetection.js";
import { useGame } from "./hooks/useGame.js";

// App connects all the pieces together. It has no game logic of its own.
//
//   camera + model  ->  gesture detection  --(accepted gesture)-->  game
//
// The webcam <video> lives in the left column ALL the time (also on the
// start screen), so the camera is started once and never restarted.
function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const { cameraStatus, cameraReady, cameraError, retryCamera } = useWebcam(videoRef);
  const { handLandmarker, modelStatus, modelError, retryModel } = useHandLandmarker();
  const { state: game, best, isNewBest, start, restart, attack, pause, resume } = useGame();

  const detection = useGestureDetection({
    videoRef,
    canvasRef,
    handLandmarker,
    cameraReady,
    onAccept: attack, // the detector only reports; the game decides
  });

  const canStart = cameraReady && modelStatus === "ready";

  // If the camera drops out mid-game, pause instead of letting enemies win.
  useEffect(() => {
    if (!cameraReady) pause();
  }, [cameraReady, pause]);

  return (
    <div className="app">
      <h1>Gesture Arena</h1>

      <div className="play">
        <section className="panel left-panel">
          <Camera videoRef={videoRef} canvasRef={canvasRef} />
          <Hud
            game={game}
            detection={detection}
            cameraStatus={cameraStatus}
            onPause={pause}
            onResume={resume}
            onRestart={restart}
          />
        </section>

        <section className="panel right-panel">
          {game.phase === "idle" ? (
            <StartScreen
              cameraStatus={cameraStatus}
              cameraError={cameraError}
              onRetryCamera={retryCamera}
              modelStatus={modelStatus}
              modelError={modelError}
              onRetryModel={retryModel}
              handDetected={detection.handDetected}
              canStart={canStart}
              onStart={start}
            />
          ) : (
            <Arena
              game={game}
              best={best}
              isNewBest={isNewBest}
              onResume={resume}
              onRestart={restart}
            />
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
