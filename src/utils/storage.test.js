// Run with:  node src/utils/storage.test.js   (or npm test)
// Tests best-score loading and saving with a fake localStorage.

import assert from "node:assert";
import { loadBestScore, saveBestScore } from "./storage.js";
import { STORAGE_KEY } from "../constants.js";

function fakeStorage(initial) {
  const data = new Map(initial === undefined ? [] : [[STORAGE_KEY, initial]]);
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    peek: () => data.get(STORAGE_KEY),
  };
}

// Missing / invalid data is safe and reads as 0.
assert.strictEqual(loadBestScore(fakeStorage()), 0);
for (const bad of ["abc", "NaN", "-5", "Infinity", "{}", "undefined"]) {
  assert.strictEqual(loadBestScore(fakeStorage(bad)), 0, `bad value ${bad}`);
}
assert.strictEqual(loadBestScore(null), 0);
console.log("PASS missing or invalid stored data");

// Valid data loads.
assert.strictEqual(loadBestScore(fakeStorage("120")), 120);
console.log("PASS valid stored data");

// Saves only when the score is higher.
{
  const st = fakeStorage("100");
  assert.strictEqual(saveBestScore(80, st), 100);
  assert.strictEqual(st.peek(), "100"); // unchanged
  assert.strictEqual(saveBestScore(100, st), 100); // equal does not count
  assert.strictEqual(saveBestScore(150, st), 150);
  assert.strictEqual(st.peek(), "150");
  console.log("PASS best score only updates when beaten");
}

// First ever score is saved; garbage scores are ignored.
{
  const st = fakeStorage();
  assert.strictEqual(saveBestScore(40, st), 40);
  assert.strictEqual(st.peek(), "40");
  assert.strictEqual(saveBestScore(NaN, st), 40);
  assert.strictEqual(saveBestScore(undefined, st), 40);
  console.log("PASS first save and invalid scores");
}

// Persistence across "page loads": a new load sees the saved value.
{
  const st = fakeStorage();
  saveBestScore(75, st);
  assert.strictEqual(loadBestScore(st), 75);
  console.log("PASS persistence");
}

// Storage that throws must not crash the game.
{
  const broken = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  assert.strictEqual(loadBestScore(broken), 0);
  assert.strictEqual(saveBestScore(10, broken), 10);
  console.log("PASS unavailable storage is safe");
}

console.log("All storage tests passed!");
