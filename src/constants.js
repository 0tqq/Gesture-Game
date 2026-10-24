// Settings you can tweak. Times are in milliseconds (1000 ms = 1 second).

// How long you must hold the right gesture before it counts as a hit.
// Short on purpose: it only filters out accidental flickers.
export const HOLD_MS = 300;

// --- Difficulty curve -------------------------------------------------
// Enemy #1 gives you START_TIME_LIMIT_MS to react. Every enemy you defeat
// takes TIME_STEP_MS off the next one, until MIN_TIME_LIMIT_MS is reached.
export const START_TIME_LIMIT_MS = 5000;
export const TIME_STEP_MS = 200;
export const MIN_TIME_LIMIT_MS = 1500;

// The pause between killing one enemy and the next one appearing.
// It also shrinks as you win, so enemies arrive faster and faster.
export const START_SPAWN_DELAY_MS = 800;
export const SPAWN_DELAY_STEP_MS = 50;
export const MIN_SPAWN_DELAY_MS = 150;

// Every gesture the game knows about. The key (e.g. "FIST") is what
// gestures.js returns and what the game compares against.
export const GESTURES = {
  FIST: { label: "Fist", emoji: "✊" },
  OPEN_PALM: { label: "Open Palm", emoji: "✋" },
  POINT: { label: "Point", emoji: "☝️" },
  PEACE: { label: "Peace", emoji: "✌️" },
  THUMBS_UP: { label: "Thumbs Up", emoji: "👍" },
  ROCK: { label: "Rock On", emoji: "🤘" },
};

// Just the keys, handy for picking a random one.
export const GESTURE_KEYS = Object.keys(GESTURES);
