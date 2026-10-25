import { useCallback, useEffect, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

// The version in this URL must match "@mediapipe/tasks-vision" in package.json.
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// Downloads and starts the MediaPipe hand model (takes a few seconds).
// modelStatus is "loading", "ready" or "error". retryModel() tries again.
export function useHandLandmarker() {
  const [handLandmarker, setHandLandmarker] = useState(null);
  const [modelStatus, setModelStatus] = useState("loading");
  const [modelError, setModelError] = useState(null);
  const [attempt, setAttempt] = useState(0); // bump this to try again

  useEffect(() => {
    let cancelled = false;
    let created = null;

    async function loadModel() {
      setModelStatus("loading");
      setModelError(null);
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO", // we feed it video frames
          numHands: 1, // one hand is enough for this game
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        created = landmarker;
        setHandLandmarker(landmarker);
        setModelStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setModelStatus("error");
        setModelError("Could not load the hand model: " + err.message);
      }
    }

    loadModel();

    return () => {
      cancelled = true;
      if (created) created.close();
      setHandLandmarker(null);
    };
  }, [attempt]);

  const retryModel = useCallback(() => setAttempt((n) => n + 1), []);

  return { handLandmarker, modelStatus, modelError, retryModel };
}
