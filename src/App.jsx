import { useRef } from "react";
import Camera from "./components/Camera.jsx";
import Hud from "./components/Hud.jsx";
import { useWebcam } from "./hooks/useWebcam.js";
import { useHandLandmarker } from "./hooks/useHandLandmarker.js";
import { useGestureDetection } from "./hooks/useGestureDetection.js";
import { useGame } from "./hooks/useGame.js";

// App connects all the pieces together. It has no game logic of its own.
function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const { cameraReady, cameraError } = useWebcam(videoRef);
  const { handLandmarker, modelError } = useHandLandmarker();
  const gesture = useGestureDetection({
    videoRef,
    canvasRef,
    handLandmarker,
    cameraReady,
  });
  const game = useGame(gesture);

  const error = cameraError || modelError;
  const loading = !error && (!cameraReady || !handLandmarker);

  return (
    <div className="app">
      <h1>Gesture Arena</h1>

      <Camera videoRef={videoRef} canvasRef={canvasRef} />

      {error && <p className="error">{error}</p>}
      {loading && <p>Loading camera and hand model...</p>}

      {!error && !loading && (
        <Hud
          status={game.status}
          enemy={game.enemy}
          timeLeft={game.timeLeft}
          defeated={game.defeated}
          score={game.score}
          best={game.best}
          gesture={gesture}
          onStart={game.startGame}
        />
      )}
    </div>
  );
}

export default App;
