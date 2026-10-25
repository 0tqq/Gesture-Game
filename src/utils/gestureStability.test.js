// Run with:  node src/utils/gestureStability.test.js   (or npm test)
// Tests the stability filter: flicker, release, missing hand, stale values.

import assert from "node:assert";
import { createStabilizer } from "./gestureStability.js";

// Feed a list of raw gestures (null = no hand) and collect every result.
function feed(stabilizer, frames) {
  return frames.map((raw) => stabilizer.update(raw));
}
const acceptedList = (results) => results.map((r) => r.accepted).filter(Boolean);

const make = () => createStabilizer({ requiredFrames: 3, lostGraceFrames: 2 });

// 1) A gesture is accepted only after N consistent frames, and only once.
{
  const s = make();
  const r = feed(s, ["FIST", "FIST", "FIST", "FIST", "FIST", "FIST"]);
  assert.strictEqual(r[0].accepted, null);
  assert.strictEqual(r[1].accepted, null);
  assert.strictEqual(r[2].accepted, "FIST"); // 3rd frame
  assert.deepStrictEqual(acceptedList(r), ["FIST"]); // never again while held
  assert.strictEqual(r[5].stable, "FIST");
  assert.strictEqual(r[5].progress, 1);
  console.log("PASS accepted after N frames, once per hold");
}

// 2) Progress is reported while a gesture is still unstable.
{
  const s = make();
  const r = feed(s, ["PEACE", "PEACE"]);
  assert.strictEqual(r[1].candidate, "PEACE");
  assert.strictEqual(r[1].stable, null);
  assert.ok(Math.abs(r[1].progress - 2 / 3) < 1e-9);
  console.log("PASS progress while stabilizing");
}

// 3) Alternating gestures never become stable (no accidental attacks).
{
  const s = make();
  const r = feed(s, ["FIST", "PEACE", "FIST", "PEACE", "FIST", "PEACE", "FIST", "PEACE"]);
  assert.deepStrictEqual(acceptedList(r), []);
  console.log("PASS flicker is never accepted");
}

// 4) A one-frame glitch while holding does NOT cause a second attack.
{
  const s = make();
  const r = feed(s, ["FIST", "FIST", "FIST", "NONE", "FIST", "FIST", "FIST", "FIST"]);
  assert.deepStrictEqual(acceptedList(r), ["FIST"]);
  console.log("PASS glitch while holding does not re-attack");
}

// 5) Changing gesture gives a new acceptance; releasing then re-showing
//    the same gesture also gives one (release is required).
{
  const s = make();
  const r = feed(s, [
    "FIST", "FIST", "FIST", // accepted FIST
    "PEACE", "PEACE", "PEACE", // accepted PEACE
    "NONE", "NONE", "NONE", // accepted NONE (the release)
    "PEACE", "PEACE", "PEACE", // PEACE again: accepted again
  ]);
  assert.deepStrictEqual(acceptedList(r), ["FIST", "PEACE", "NONE", "PEACE"]);
  console.log("PASS change or release allows the next attack");
}

// 6) Holding one gesture for a very long time = exactly one acceptance.
{
  const s = make();
  const frames = Array(200).fill("OPEN_PALM");
  assert.deepStrictEqual(acceptedList(feed(s, frames)), ["OPEN_PALM"]);
  console.log("PASS long hold gives a single acceptance");
}

// 7) No hand at all.
{
  const s = make();
  const r = s.update(null);
  assert.strictEqual(r.handDetected, false);
  assert.strictEqual(r.stable, null);
  assert.strictEqual(r.candidate, null);
  assert.strictEqual(r.accepted, null);
  console.log("PASS missing hand reported");
}

// 8) Short tracking interruption (<= grace): state is kept, no attack fired.
{
  const s = make();
  feed(s, ["FIST", "FIST", "FIST"]);
  const gap = feed(s, [null, null]); // 2 frames = within grace
  assert.strictEqual(gap[1].handDetected, true);
  assert.strictEqual(gap[1].stable, "FIST");
  assert.deepStrictEqual(acceptedList(gap), []);
  const after = feed(s, ["FIST", "FIST"]);
  assert.deepStrictEqual(acceptedList(after), []); // still the same hold
  console.log("PASS short interruption keeps state, no extra attack");
}

// 9) Long interruption: everything stale is cleared.
{
  const s = make();
  feed(s, ["FIST", "FIST", "FIST"]);
  const gap = feed(s, [null, null, null]); // 3 frames > grace of 2
  const last = gap[2];
  assert.strictEqual(last.handDetected, false);
  assert.strictEqual(last.stable, null);
  assert.strictEqual(last.candidate, null);
  assert.strictEqual(last.progress, 0);
  console.log("PASS stale gesture cleared when hand disappears");
}

// 10) After the hand returns, the same gesture can attack again,
//     but only after it is stable again (not instantly).
{
  const s = make();
  feed(s, ["FIST", "FIST", "FIST", null, null, null]);
  const r = feed(s, ["FIST", "FIST", "FIST"]);
  assert.strictEqual(r[0].accepted, null);
  assert.strictEqual(r[1].accepted, null);
  assert.strictEqual(r[2].accepted, "FIST");
  console.log("PASS no stale attack, re-acceptance needs fresh frames");
}

// 11) Default settings from constants.js work.
{
  const s = createStabilizer();
  const r = feed(s, Array(10).fill("ROCK"));
  assert.deepStrictEqual(acceptedList(r), ["ROCK"]);
  console.log("PASS default settings");
}

console.log("All stability tests passed!");
