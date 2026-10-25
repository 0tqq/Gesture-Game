// Every setting for the game lives here. Times are in milliseconds
// (1000 ms = 1 second). Speeds are "fractions of the arena per second":
// 0.1 means an enemy crosses the whole arena in 10 seconds.

// --- Gestures ---------------------------------------------------------
// The key (e.g. "FIST") is what gestures.js returns and what the game
// compares against. The ORDER matters: harder-to-do gestures come later,
// because early rounds only use the first few (see START_GESTURE_COUNT).
export const GESTURES = {
  FIST: { label: "Fist", emoji: "✊", hint: "Close all fingers" },
  OPEN_PALM: { label: "Open Palm", emoji: "✋", hint: "All four fingers straight" },
  POINT: { label: "Point", emoji: "☝️", hint: "Only the index finger up" },
  PEACE: { label: "Peace", emoji: "✌️", hint: "Index and middle fingers up" },
  THUMBS_UP: { label: "Thumbs Up", emoji: "👍", hint: "Fist with the thumb pointing up" },
  ROCK: { label: "Rock On", emoji: "🤘", hint: "Index and pinky up" },
  THREE: { label: "Three", emoji: "3️⃣", hint: "Index, middle and ring up, pinky down" },
  PINKY: { label: "Pinky", emoji: "🤙", hint: "Only the pinky up (thumb can be out)" },
  THUMB_DOWN: { label: "Thumb Down", emoji: "👎", hint: "Fist with the thumb pointing down" },
};

// Just the keys, handy for picking a random one.
export const GESTURE_KEYS = Object.keys(GESTURES);

// Round 1 uses the first 4 gestures, every new round unlocks one more.
export const START_GESTURE_COUNT = 4;

// --- Gesture stability ------------------------------------------------
// A gesture only counts after it is seen in this many camera frames in a
// row (about 130 ms for a 30 fps webcam). Higher = fewer accidents, more delay.
export const STABILITY_FRAMES = 4;
// If the hand disappears for this many frames or fewer, we treat it as a
// tracking hiccup and keep the current state instead of resetting.
export const HAND_LOST_GRACE_FRAMES = 8;

// --- Countdown --------------------------------------------------------
export const COUNTDOWN_FROM = 3; // shows 3, 2, 1 ...
export const COUNTDOWN_STEP_MS = 1000; // ... one second each ...
export const COUNTDOWN_GO_MS = 700; // ... then "GO!" for this long

// --- Player -----------------------------------------------------------
export const PLAYER_MAX_HEALTH = 100;
export const PLAYER_ATTACK_DAMAGE = 1; // health an enemy loses per hit
// After taking damage the player is protected for this long, so several
// enemies arriving together cannot drain all health in one instant.
export const DAMAGE_COOLDOWN_MS = 700;
export const DAMAGE_FLASH_MS = 400; // how long the red damage effect shows
export const ATTACK_FEEDBACK_MS = 700; // how long "Hit!" / "No target" shows

// --- Normal enemies ---------------------------------------------------
export const ENEMY_HEALTH = 1; // hits needed in round 1
export const ENEMY_HEALTH_EVERY_ROUNDS = 2; // +1 health every N rounds
export const ENEMY_DAMAGE = 10; // player health lost when one arrives
export const ENEMY_BASE_SPEED = 0.09;
export const MAX_ENEMY_SPEED = 0.3;
export const SPEED_GROWTH = 0.2; // +20% speed per difficulty step
export const HIT_FLASH_MS = 250;
export const HIT_KNOCKBACK = 0.04; // a hit pushes the enemy back a little
export const ENEMY_DYING_MS = 500; // defeat animation length
export const ENEMY_REACHED_MS = 400; // "hit the player" animation length
export const LANE_COUNT = 4; // enemies walk along one of these lanes

// --- Spawning ---------------------------------------------------------
export const MAX_ACTIVE_ENEMIES = 5; // never more than this alive at once
export const BASE_SPAWN_INTERVAL_MS = 3500;
export const SPAWN_INTERVAL_DECAY_MS = 300; // shorter per difficulty step
export const MIN_SPAWN_INTERVAL_MS = 900; // never faster than this
export const FIRST_SPAWN_DELAY_MS = 1500; // pause at the start of a round
// If you have not defeated anything for PRESSURE_AFTER_MS, enemies spawn
// PRESSURE_FACTOR times as often (0.7 = 30% faster). Delay = more enemies.
export const PRESSURE_AFTER_MS = 5000;
export const PRESSURE_FACTOR = 0.7;

// --- Rounds -----------------------------------------------------------
export const ENEMIES_PER_ROUND_BASE = 4;
export const ENEMIES_PER_ROUND_GROWTH = 2; // +2 enemies every round
export const MAX_ENEMIES_PER_ROUND = 20;
export const ROUND_BANNER_MS = 1500;
export const INTERMISSION_MS = 3000; // pause after a boss falls

// --- Boss -------------------------------------------------------------
export const BOSS_HEALTH = 6; // hits needed in round 1
export const BOSS_HEALTH_PER_ROUND = 2;
export const BOSS_DAMAGE = 30;
export const BOSS_SPEED_FACTOR = 0.4; // bosses are slower than normal enemies
export const BOSS_RESET_X = 1; // after hurting you, the boss walks in again
export const BOSS_DYING_MS = 1200;
// The boss asks for these gestures in order, over and over, one per hit.
// Round 1 uses the first list, round 2 the second, and so on (then it loops).
// Rule: neighbours must differ, and so must the last and first of a list.
export const BOSS_SEQUENCES = [
  ["FIST", "OPEN_PALM", "PEACE"],
  ["POINT", "THUMBS_UP", "ROCK", "FIST"],
  ["THREE", "PINKY", "THUMB_DOWN", "OPEN_PALM"],
];

// --- Score ------------------------------------------------------------
export const SCORE_ENEMY = 10;
export const SCORE_BOSS = 100;
export const SCORE_BOSS_PER_ROUND = 50;

// --- Misc -------------------------------------------------------------
// The game loop never simulates more than this in one step, so switching
// browser tabs and coming back does not teleport enemies to the player.
export const MAX_TICK_MS = 100;
export const STORAGE_KEY = "gestureArena.bestScore";
