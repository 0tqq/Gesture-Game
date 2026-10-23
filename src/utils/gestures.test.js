// A tiny test you can run with:  npm test
// It builds fake hands and checks that detectGesture gives the right answer.

import assert from "node:assert";
import { detectGesture } from "./gestures.js";

// Build a fake hand: 21 points, all in the middle of the image.
// Then move each fingertip above (up) or below (down) its middle joint.
function makeHand({ index, middle, ring, pinky }) {
  const hand = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5 }));
  const fingers = [
    [index, 8],
    [middle, 12],
    [ring, 16],
    [pinky, 20],
  ];
  for (const [isUp, tipIndex] of fingers) {
    hand[tipIndex].y = isUp ? 0.3 : 0.7; // smaller y = higher on screen
  }
  return hand;
}

const tests = [
  ["FIST", { index: false, middle: false, ring: false, pinky: false }],
  ["OPEN_PALM", { index: true, middle: true, ring: true, pinky: true }],
  ["POINT", { index: true, middle: false, ring: false, pinky: false }],
  ["PEACE", { index: true, middle: true, ring: false, pinky: false }],
  ["NONE", { index: false, middle: true, ring: false, pinky: true }],
];

for (const [expected, fingers] of tests) {
  assert.strictEqual(detectGesture(makeHand(fingers)), expected);
  console.log("PASS", expected);
}

console.log("All gesture tests passed!");
