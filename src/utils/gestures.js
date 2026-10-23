// Turns 21 hand landmarks into a gesture name.
//
// MediaPipe gives us 21 points per hand. Each point has x and y between
// 0 and 1, where y = 0 is the TOP of the image and y = 1 is the BOTTOM.
//
// Fingertip / middle-joint (PIP) indices:
//   index  : tip 8,  pip 6
//   middle : tip 12, pip 10
//   ring   : tip 16, pip 14
//   pinky  : tip 20, pip 18
//
// Idea: a finger is "up" if its tip is HIGHER on screen (smaller y)
// than its middle joint. This works when your hand is held upright.

function isFingerUp(landmarks, tipIndex, pipIndex) {
  return landmarks[tipIndex].y < landmarks[pipIndex].y;
}

export function detectGesture(landmarks) {
  const index = isFingerUp(landmarks, 8, 6);
  const middle = isFingerUp(landmarks, 12, 10);
  const ring = isFingerUp(landmarks, 16, 14);
  const pinky = isFingerUp(landmarks, 20, 18);

  const upCount = [index, middle, ring, pinky].filter(Boolean).length;

  if (upCount === 0) return "FIST";
  if (upCount === 4) return "OPEN_PALM";
  if (index && !middle && !ring && !pinky) return "POINT";
  if (index && middle && !ring && !pinky) return "PEACE";
  return "NONE";
}
