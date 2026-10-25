import { memo } from "react";

// Shows the webcam video with the hand dots drawn on top.
// The refs are created in App.jsx so the hooks can use them too.
// memo() stops this from re-rendering every time the game state changes.

function Camera({ videoRef, canvasRef }) {
  return (
    <div className="camera-box">
      <video ref={videoRef} className="layer" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="layer" />
    </div>
  );
}

export default memo(Camera);
