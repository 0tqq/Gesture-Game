// Run with:  npm test
// Builds fake hands (21 points) and checks detectGesture's answers.

import assert from "node:assert";
import { angleAt, detectGesture } from "./gestures.js";

// --- angleAt: check the math itself first ---
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 0.001, `${actual} != ${expected}`);

near(angleAt({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: -1 }), 180); // straight
near(angleAt({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }), 90); // right angle
near(angleAt({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 2 }), 0); // folded flat
console.log("PASS angleAt");

// --- fake hands ---
// Each finger is 4 points: base, middle joint, joint near the tip, tip.
// Straight finger = four points in a vertical line (angle 180).
// Curled finger   = tip folded back down next to the base (small angle).
const FINGER_X = { index: 0.55, middle: 0.5, ring: 0.45, pinky: 0.4 };
const FINGER_FIRST_POINT = { index: 5, middle: 9, ring: 13, pinky: 17 };

function setFinger(hand, name, extended) {
  const x = FINGER_X[name];
  const first = FINGER_FIRST_POINT[name];
  hand[first] = { x, y: 0.6 }; // base
  hand[first + 1] = { x, y: 0.5 }; // middle joint
  if (extended) {
    hand[first + 2] = { x, y: 0.4 };
    hand[first + 3] = { x, y: 0.3 }; // tip far up
  } else {
    hand[first + 2] = { x: x + 0.02, y: 0.55 };
    hand[first + 3] = { x: x + 0.02, y: 0.62 }; // tip folded down
  }
}

function setThumb(hand, mode) {
  if (mode === "up") {
    // straight and pointing up, above the index knuckle (y 0.6)
    hand[2] = { x: 0.38, y: 0.75 };
    hand[3] = { x: 0.38, y: 0.65 };
    hand[4] = { x: 0.38, y: 0.55 };
  } else if (mode === "side") {
    // straight but pointing sideways (like in an open hand)
    hand[2] = { x: 0.42, y: 0.78 };
    hand[3] = { x: 0.33, y: 0.76 };
    hand[4] = { x: 0.24, y: 0.74 };
  } else {
    // tucked across the palm (bent)
    hand[2] = { x: 0.4, y: 0.75 };
    hand[3] = { x: 0.45, y: 0.7 };
    hand[4] = { x: 0.5, y: 0.72 };
  }
}

function makeHand({ index, middle, ring, pinky, thumb = "tucked" }) {
  const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  hand[0] = { x: 0.5, y: 0.9 }; // wrist
  setFinger(hand, "index", index);
  setFinger(hand, "middle", middle);
  setFinger(hand, "ring", ring);
  setFinger(hand, "pinky", pinky);
  setThumb(hand, thumb);
  return hand;
}

const T = true;
const F = false;

const tests = [
  ["FIST (thumb tucked)", "FIST", { index: F, middle: F, ring: F, pinky: F, thumb: "tucked" }],
  ["FIST (thumb sideways)", "FIST", { index: F, middle: F, ring: F, pinky: F, thumb: "side" }],
  ["THUMBS_UP", "THUMBS_UP", { index: F, middle: F, ring: F, pinky: F, thumb: "up" }],
  ["OPEN_PALM", "OPEN_PALM", { index: T, middle: T, ring: T, pinky: T, thumb: "side" }],
  ["POINT", "POINT", { index: T, middle: F, ring: F, pinky: F }],
  ["PEACE", "PEACE", { index: T, middle: T, ring: F, pinky: F }],
  ["ROCK", "ROCK", { index: T, middle: F, ring: F, pinky: T }],
  ["NONE (odd shape)", "NONE", { index: F, middle: T, ring: F, pinky: T }],
];

for (const [name, expected, fingers] of tests) {
  assert.strictEqual(detectGesture(makeHand(fingers)), expected, name);
  console.log("PASS", name);
}

// Rotation check: turn a peace sign upside down. Angle math should not care.
const flipped = makeHand({ index: T, middle: T, ring: F, pinky: F }).map((p) => ({
  x: p.x,
  y: 1 - p.y,
}));
assert.strictEqual(detectGesture(flipped), "PEACE");
console.log("PASS PEACE (upside down)");

console.log("All gesture tests passed!");
