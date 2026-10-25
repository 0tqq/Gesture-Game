// Best score saved in the browser's localStorage.
// The storage object is a parameter so tests can use a fake one.

import { STORAGE_KEY } from "../constants.js";

function getDefaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // some browsers throw when storage is blocked
  }
}

// Returns the saved best score, or 0 if it is missing / invalid / unreadable.
export function loadBestScore(storage = getDefaultStorage()) {
  try {
    if (!storage) return 0;
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) return 0;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

// Saves `score` only if it beats the stored best. Returns the best score.
export function saveBestScore(score, storage = getDefaultStorage()) {
  const best = loadBestScore(storage);
  if (!Number.isFinite(score) || score <= best) return best;

  const newBest = Math.floor(score);
  try {
    storage?.setItem(STORAGE_KEY, String(newBest));
  } catch {
    // Could not save (private mode, full storage). The game still works.
  }
  return newBest;
}
