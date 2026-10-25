// Turns 21 hand landmarks into a gesture name, using angles.
//
// MediaPipe gives 21 points per hand (x and y between 0 and 1, y = 0 is the
// TOP of the image). The ones we use:
//
//   Thumb : 2 = base joint, 3 = middle joint, 4 = tip
//   Index : 5 = base (MCP), 6 = middle joint (PIP), 8 = tip
//   Middle: 9,  10, 12
//   Ring  : 13, 14, 16
//   Pinky : 17, 18, 20
//
// Core idea: a straight finger makes a ~180 degree angle at its middle
// joint. A curled finger folds up and makes a small angle. Because we
// measure ANGLES (not "is the tip higher than the joint"), a finger counts
// as straight no matter how the hand is rotated.
//
// Gestures we deliberately do NOT support (they cannot be told apart
// reliably with these landmarks):
//   FOUR      looks the same as OPEN_PALM unless you judge the thumb exactly
//   CALL_ME   the same as PINKY, because we ignore the thumb there
//   OK        needs a "fingertips touching" distance check that flickers

const FINGER_STRAIGHT_ANGLE = 150; // above this, a finger is "extended"
const THUMB_STRAIGHT_ANGLE = 140; // the thumb bends less, so it is more lenient

// [base joint, middle joint, tip] for each of the four fingers.
const FINGERS = {
  index: [5, 6, 8],
  middle: [9, 10, 12],
  ring: [13, 14, 16],
  pinky: [17, 18, 20],
};

// The angle (in degrees) at point b, formed by the lines b->a and b->c.
// Worked example: a = (0,1), b = (0,0), c = (0,-1) is a straight line -> 180.
//   dot product of the two arrows = |arrow1| * |arrow2| * cos(angle)
//   so angle = acos( dot / (|arrow1| * |arrow2|) )
export function angleAt(a, b, c) {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;

  const dot = v1x * v2x + v1y * v2y;
  const lengths = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (lengths === 0) return 0; // two points on top of each other

  // Clamp to [-1, 1]: rounding errors could push it slightly outside,
  // which would make acos return NaN.
  const cos = Math.max(-1, Math.min(1, dot / lengths));
  return (Math.acos(cos) * 180) / Math.PI;
}

function isFingerExtended(landmarks, [base, middle, tip]) {
  const angle = angleAt(landmarks[base], landmarks[middle], landmarks[tip]);
  return angle > FINGER_STRAIGHT_ANGLE;
}

// The thumb is "straight" when its three joints line up.
function isThumbStraight(landmarks) {
  return angleAt(landmarks[2], landmarks[3], landmarks[4]) > THUMB_STRAIGHT_ANGLE;
}

// Thumbs up = thumb is straight AND points upward on screen:
// tip above middle joint, middle joint above base joint, and the tip is
// above the knuckle of the index finger (so it is not just resting sideways).
// This one assumes "up" means up on screen, which is what a thumbs up is.
function isThumbsUp(landmarks) {
  const base = landmarks[2];
  const middle = landmarks[3];
  const tip = landmarks[4];
  const indexKnuckle = landmarks[5];

  const pointingUp =
    tip.y < middle.y && middle.y < base.y && tip.y < indexKnuckle.y;
  return isThumbStraight(landmarks) && pointingUp;
}

// Thumb down = the mirror image of thumbs up (y grows downward).
function isThumbDown(landmarks) {
  const base = landmarks[2];
  const middle = landmarks[3];
  const tip = landmarks[4];
  const indexKnuckle = landmarks[5];

  const pointingDown =
    tip.y > middle.y && middle.y > base.y && tip.y > indexKnuckle.y;
  return isThumbStraight(landmarks) && pointingDown;
}

export function detectGesture(landmarks) {
  const index = isFingerExtended(landmarks, FINGERS.index);
  const middle = isFingerExtended(landmarks, FINGERS.middle);
  const ring = isFingerExtended(landmarks, FINGERS.ring);
  const pinky = isFingerExtended(landmarks, FINGERS.pinky);

  const allCurled = !index && !middle && !ring && !pinky;
  const allStraight = index && middle && ring && pinky;

  // Fist, thumbs up and thumb down all have four curled fingers;
  // the thumb decides which one it is.
  if (allCurled && isThumbsUp(landmarks)) return "THUMBS_UP";
  if (allCurled && isThumbDown(landmarks)) return "THUMB_DOWN";
  if (allCurled) return "FIST";

  if (allStraight) return "OPEN_PALM";

  // For the rest, the thumb is ignored (people hold it in many ways).
  if (index && !middle && !ring && !pinky) return "POINT";
  if (index && middle && !ring && !pinky) return "PEACE";
  if (index && pinky && !middle && !ring) return "ROCK";
  if (index && middle && ring && !pinky) return "THREE";
  if (pinky && !index && !middle && !ring) return "PINKY";

  return "NONE";
}
