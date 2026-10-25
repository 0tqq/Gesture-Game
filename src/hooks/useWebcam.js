import { useCallback, useEffect, useState } from "react";

// Asks the browser for webcam access and connects it to the <video> element.
//
// cameraStatus is one of:
//   "initializing"  hook just started
//   "requesting"    waiting for the camera / the permission prompt
//   "granted"       permission given, waiting for the first video frame
//   "ready"         video is playing
//   "denied"        the user (or browser) blocked camera access
//   "unavailable"   no camera, camera busy, unsupported browser, or unplugged
export function useWebcam(videoRef) {
  const [cameraStatus, setCameraStatus] = useState("initializing");
  const [cameraError, setCameraError] = useState(null);
  const [attempt, setAttempt] = useState(0); // bump this to try again

  useEffect(() => {
    let stream = null;
    let cancelled = false;

    async function startCamera() {
      setCameraError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("unavailable");
        setCameraError(
          "This browser cannot use the camera. Use a current Chrome or Edge on localhost or https."
        );
        return;
      }

      setCameraStatus("requesting");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        // If the component was removed while we waited, shut the camera again.
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        setCameraStatus("granted");

        const video = videoRef.current;
        video.srcObject = stream;
        video.onloadeddata = () => {
          if (!cancelled) setCameraStatus("ready");
        };

        // If the camera is unplugged or taken away while playing.
        stream.getVideoTracks()[0]?.addEventListener("ended", () => {
          if (cancelled) return;
          setCameraStatus("unavailable");
          setCameraError("The camera was disconnected.");
        });
      } catch (err) {
        if (cancelled) return;
        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError" ||
          err.name === "SecurityError"
        ) {
          setCameraStatus("denied");
          setCameraError("Camera permission was denied.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraStatus("unavailable");
          setCameraError("No camera was found on this computer.");
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setCameraStatus("unavailable");
          setCameraError("The camera is busy. Close other apps using it (Zoom, Teams...).");
        } else {
          setCameraStatus("unavailable");
          setCameraError("Could not open the webcam: " + err.message);
        }
      }
    }

    startCamera();

    // Cleanup: runs when the component goes away or we retry. Turns the camera off.
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.onloadeddata = null;
    };
  }, [videoRef, attempt]);

  const retryCamera = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    cameraStatus,
    cameraReady: cameraStatus === "ready",
    cameraError,
    retryCamera,
  };
}
