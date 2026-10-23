import { useEffect, useState } from "react";

// Asks the browser for webcam access and connects it to the <video> element.
export function useWebcam(videoRef) {
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    let stream = null;
    let cancelled = false;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        // If the component was removed while we waited, shut the camera again.
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        video.onloadeddata = () => setCameraReady(true);
      } catch (err) {
        setCameraError("Could not open the webcam: " + err.message);
      }
    }

    startCamera();

    // Cleanup: runs when the component goes away. Turns the camera off.
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [videoRef]);

  return { cameraReady, cameraError };
}
