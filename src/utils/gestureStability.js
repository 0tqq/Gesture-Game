// Gesture stability filter: decides when a gesture is "real".
//
// The raw detector can flicker (FIST, FIST, NONE, FIST ...). If every raw
// result triggered an attack, you would hit things by accident. So:
//
//  * A gesture must be seen in `requiredFrames` frames IN A ROW before it
//    becomes the "stable" gesture. That moment is reported once, as
//    `accepted`, and is the only thing that should trigger an attack.
//  * The stable gesture only changes when ANOTHER gesture becomes stable.
//    So holding a fist while one frame misreads as NONE does not count as
//    "release and re-attack".
//  * To attack again with the same gesture you must change to something
//    else (even NONE) long enough for it to become stable, then come back.
//  * If the hand vanishes for a few frames (<= lostGraceFrames) we freeze
//    everything: tracking hiccups neither attack nor reset progress.
//    After that the hand counts as gone and ALL old values are cleared,
//    so a stale gesture can never attack later.
//
// This file has no React in it, so it is easy to test.

import { STABILITY_FRAMES, HAND_LOST_GRACE_FRAMES } from "../constants.js";

export function createStabilizer({
  requiredFrames = STABILITY_FRAMES,
  lostGraceFrames = HAND_LOST_GRACE_FRAMES,
} = {}) {
  let stable = null; // the accepted gesture, or null
  let candidate = null; // what the camera currently sees
  let count = 0; // how many frames in a row we have seen `candidate`
  let missing = 0; // how many frames in a row had no hand
  let handSeen = false;

  function snapshot(accepted) {
    const holding = candidate !== null && candidate === stable;
    return {
      handDetected: handSeen,
      candidate,
      stable,
      count: holding ? requiredFrames : count,
      required: requiredFrames,
      progress: holding ? 1 : Math.min(1, count / requiredFrames),
      accepted, // a gesture name only on the frame it becomes stable
    };
  }

  return {
    // `raw` is a gesture name from detectGesture, or null when no hand.
    update(raw) {
      if (raw === null || raw === undefined) {
        missing += 1;
        if (missing > lostGraceFrames) {
          // Hand is really gone: forget everything.
          handSeen = false;
          stable = null;
          candidate = null;
          count = 0;
        }
        return snapshot(null);
      }

      missing = 0;
      handSeen = true;

      if (raw === candidate) {
        count += 1;
      } else {
        candidate = raw;
        count = 1;
      }

      let accepted = null;
      if (count >= requiredFrames && candidate !== stable) {
        stable = candidate;
        accepted = candidate;
      }
      return snapshot(accepted);
    },

    reset() {
      stable = null;
      candidate = null;
      count = 0;
      missing = 0;
      handSeen = false;
    },
  };
}
