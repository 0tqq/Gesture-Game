// Settings you can tweak to make the game easier or harder.

export const GAME_SECONDS = 30; // length of one round
export const HOLD_MS = 500; // how long you must hold a gesture to score

// Every gesture the game knows about. The key (e.g. "FIST") is what
// gestures.js returns and what the game compares against.
export const GESTURES = {
  FIST: { label: "Fist", emoji: "✊" },
  OPEN_PALM: { label: "Open Palm", emoji: "✋" },
  POINT: { label: "Point", emoji: "☝️" },
  PEACE: { label: "Peace", emoji: "✌️" },
};

// Just the keys, handy for picking a random one.
export const GESTURE_KEYS = Object.keys(GESTURES);
