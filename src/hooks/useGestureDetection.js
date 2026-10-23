import { useEffect, useState } from "react";
import { detectGesture } from "../utils/gestures.js";
import { drawHand } from "../utils/drawHand.js";

// Runs on every screen refresh: looks at the video, finds the hand,
// draws the dots, and returns the current gesture name.
export function useGestureDetection({
  videoRef,
  canvasRef,
  handLandmarker,
  cameraReady,
}) {
  const [gesture, setGesture] = useState("NONE");

  useEffect(() => {
    // Wait until both the camera and the model are ready.
    if (!handLandmarker || !cameraReady) return;

    let frameId;
    let lastVideoTime = -1;

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Only analyse when the video has a NEW frame.
      if (video && canvas && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;

        const result = handLandmarker.detectForVideo(video, performance.now());
        const hand = result.landmarks[0]; // undefined if no hand found

        drawHand(canvas, video, hand);
        setGesture(hand ? detectGesture(hand) : "NONE");
      }

      frameId = requestAnimationFrame(loop); // run again next frame
    }

    loop();

    return () => cancelAnimationFrame(frameId); // stop the loop on cleanup
  }, [videoRef, canvasRef, handLandmarker, cameraReady]);

  return gesture;
}
