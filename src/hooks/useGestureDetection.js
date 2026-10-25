import { useEffect, useRef, useState } from "react";
import { STABILITY_FRAMES } from "../constants.js";
import { detectGesture } from "../utils/gestures.js";
import { drawHand } from "../utils/drawHand.js";
import { createStabilizer } from "../utils/gestureStability.js";

const EMPTY = {
  handDetected: false,
  candidate: null, // what the camera sees right now
  stable: null, // the accepted gesture
  count: 0,
  required: STABILITY_FRAMES,
  progress: 0, // 0..1, how close the candidate is to being accepted
};

// Only the fields the screen shows. If they did not change, we skip
// setState, so React does not re-render for every single video frame.
function sameInfo(a, b) {
  return (
    a.handDetected === b.handDetected &&
    a.candidate === b.candidate &&
    a.stable === b.stable &&
    a.count === b.count
  );
}

// ONE loop that runs on every screen refresh: looks at the video, finds the
// hand, draws the dots, and filters the result through the stability filter.
//
// It knows nothing about enemies or rounds. When a gesture becomes stable it
// just calls onAccept(gestureName) and the game decides what that means.
// Returns { handDetected, candidate, stable, count, required, progress }.
export function useGestureDetection({
  videoRef,
  canvasRef,
  handLandmarker,
  cameraReady,
  onAccept,
}) {
  const [info, setInfo] = useState(EMPTY);

  // Keep the newest onAccept in a ref so the loop never calls a stale one
  // and never has to restart when the callback changes.
  const onAcceptRef = useRef(onAccept);
  useEffect(() => {
    onAcceptRef.current = onAccept;
  }, [onAccept]);

  useEffect(() => {
    // Wait until both the camera and the model are ready.
    if (!handLandmarker || !cameraReady) {
      setInfo(EMPTY); // clears any old values
      return;
    }

    const stabilizer = createStabilizer();
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

        const out = stabilizer.update(hand ? detectGesture(hand) : null);
        if (out.accepted && out.accepted !== "NONE") {
          onAcceptRef.current?.(out.accepted);
        }
        setInfo((prev) => (sameInfo(prev, out) ? prev : out));
      }

      frameId = requestAnimationFrame(loop); // run again next frame
    }

    loop();

    return () => cancelAnimationFrame(frameId); // stop the loop on cleanup
  }, [videoRef, canvasRef, handLandmarker, cameraReady]);

  return info;
}
