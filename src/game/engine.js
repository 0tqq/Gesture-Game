// The combat engine: ALL the game rules, with no React in it.
//
// Every function takes the current game state and returns a NEW state
// (or the very same object if nothing changed). That makes the rules easy
// to test and easy to pause: if nothing calls tick(), nothing moves.
//
// Phases:  idle -> countdown -> playing <-> paused -> over
//
// Enemy positions: x = 1 is the far spawn edge, x = 0 is the player's
// defence line. Enemies walk from 1 down to 0.

import {
  GESTURES,
  GESTURE_KEYS,
  START_GESTURE_COUNT,
  COUNTDOWN_FROM,
  COUNTDOWN_STEP_MS,
  COUNTDOWN_GO_MS,
  PLAYER_MAX_HEALTH,
  PLAYER_ATTACK_DAMAGE,
  DAMAGE_COOLDOWN_MS,
  DAMAGE_FLASH_MS,
  ATTACK_FEEDBACK_MS,
  ENEMY_HEALTH,
  ENEMY_HEALTH_EVERY_ROUNDS,
  ENEMY_DAMAGE,
  ENEMY_BASE_SPEED,
  MAX_ENEMY_SPEED,
  SPEED_GROWTH,
  HIT_FLASH_MS,
  HIT_KNOCKBACK,
  ENEMY_DYING_MS,
  ENEMY_REACHED_MS,
  LANE_COUNT,
  MAX_ACTIVE_ENEMIES,
  BASE_SPAWN_INTERVAL_MS,
  SPAWN_INTERVAL_DECAY_MS,
  MIN_SPAWN_INTERVAL_MS,
  FIRST_SPAWN_DELAY_MS,
  PRESSURE_AFTER_MS,
  PRESSURE_FACTOR,
  ENEMIES_PER_ROUND_BASE,
  ENEMIES_PER_ROUND_GROWTH,
  MAX_ENEMIES_PER_ROUND,
  ROUND_BANNER_MS,
  INTERMISSION_MS,
  BOSS_HEALTH,
  BOSS_HEALTH_PER_ROUND,
  BOSS_DAMAGE,
  BOSS_SPEED_FACTOR,
  BOSS_RESET_X,
  BOSS_DYING_MS,
  BOSS_SEQUENCES,
  SCORE_ENEMY,
  SCORE_BOSS,
  SCORE_BOSS_PER_ROUND,
  MAX_TICK_MS,
} from "../constants.js";

// ---------------------------------------------------------------------
// Difficulty helpers (pure functions of the round number)
// ---------------------------------------------------------------------

export function getRoundEnemyCount(round) {
  const count = ENEMIES_PER_ROUND_BASE + (round - 1) * ENEMIES_PER_ROUND_GROWTH;
  return Math.min(MAX_ENEMIES_PER_ROUND, count);
}

export function getEnemyHealth(round) {
  return ENEMY_HEALTH + Math.floor((round - 1) / ENEMY_HEALTH_EVERY_ROUNDS);
}

export function getBossHealth(round) {
  return BOSS_HEALTH + (round - 1) * BOSS_HEALTH_PER_ROUND;
}

// Round 1 uses the first few gestures; each round unlocks one more.
export function getRoundGesturePool(round) {
  const count = Math.min(GESTURE_KEYS.length, START_GESTURE_COUNT + round - 1);
  return GESTURE_KEYS.slice(0, count);
}

// One number that grows smoothly: 0 at the start of round 1,
// 1 at the start of round 2, 1.5 half way through round 2, ...
export function getDifficulty(state) {
  const progress = state.roundEnemyCount ? state.spawned / state.roundEnemyCount : 0;
  return state.round - 1 + progress;
}

export function getEnemySpeed(difficulty) {
  return Math.min(MAX_ENEMY_SPEED, ENEMY_BASE_SPEED * (1 + SPEED_GROWTH * difficulty));
}

export function getSpawnInterval(difficulty, sinceLastKill = 0) {
  let interval = BASE_SPAWN_INTERVAL_MS - SPAWN_INTERVAL_DECAY_MS * difficulty;
  if (sinceLastKill > PRESSURE_AFTER_MS) interval *= PRESSURE_FACTOR;
  return Math.max(MIN_SPAWN_INTERVAL_MS, interval);
}

// ---------------------------------------------------------------------
// Creating state
// ---------------------------------------------------------------------

export function createState() {
  return {
    phase: "idle", // "idle" | "countdown" | "playing" | "paused" | "over"
    pausedFrom: null, // which phase to return to on resume
    countdownLeft: 0,

    round: 1,
    roundEnemyCount: 0, // normal enemies this round
    spawned: 0, // normal enemies spawned so far this round
    bossSpawned: false,
    intermissionLeft: 0, // > 0 while the "round complete" pause runs

    spawnTimer: 0,
    sinceLastKill: 0,
    lastLane: -1,
    lastSpawnGesture: null,

    enemies: [],
    nextId: 1,

    playerHealth: PLAYER_MAX_HEALTH,
    damageCooldownLeft: 0,
    damageFlash: 0,

    score: 0,
    enemiesDefeated: 0,
    bossesDefeated: 0,

    banner: null, // { text, sub, kind, left } big message in the arena
    lastAttack: null, // { gesture, hit, left } feedback for the last attack
  };
}

// A fresh game that begins with the 3-2-1-GO countdown.
// Used by both "Start Game" and "Restart", so both reset everything.
export function startCountdown() {
  return {
    ...createState(),
    phase: "countdown",
    countdownLeft: COUNTDOWN_FROM * COUNTDOWN_STEP_MS + COUNTDOWN_GO_MS,
  };
}

export function getCountdownLabel(countdownLeft) {
  const number = Math.ceil((countdownLeft - COUNTDOWN_GO_MS) / COUNTDOWN_STEP_MS);
  return number > 0 ? String(number) : "GO!";
}

// Builds an enemy object. Tests use this too, so the shape lives in one place.
export function createEnemy(fields = {}) {
  return {
    id: 0,
    type: "normal", // "normal" | "boss"
    gesture: "FIST", // the gesture needed to hurt it right now
    health: 1,
    maxHealth: 1,
    x: 1,
    lane: 0,
    speed: ENEMY_BASE_SPEED,
    damage: ENEMY_DAMAGE,
    sequence: null, // boss: the list of gestures it cycles through
    hits: 0, // how many times it has been hit
    status: "alive", // "alive" | "dying"
    reached: false, // true if it died by reaching the player
    hitFlash: 0, // ms left of the "just got hit" effect
    dyingLeft: 0, // ms left of the death animation
    ...fields,
  };
}

export function aliveEnemies(state) {
  return state.enemies.filter((e) => e.status === "alive");
}

// ---------------------------------------------------------------------
// Internal helpers (they change a COPY of the state, never the original)
// ---------------------------------------------------------------------

function cloneState(state) {
  return {
    ...state,
    enemies: state.enemies.map((e) => ({ ...e })),
    banner: state.banner && { ...state.banner },
    lastAttack: state.lastAttack && { ...state.lastAttack },
  };
}

function pickGesture(pool, avoid, rng) {
  const options = pool.filter((g) => g !== avoid);
  const list = options.length > 0 ? options : pool;
  return list[Math.floor(rng() * list.length)];
}

function pickLane(state, rng) {
  const lanes = [];
  for (let i = 0; i < LANE_COUNT; i++) if (i !== state.lastLane) lanes.push(i);
  return lanes[Math.floor(rng() * lanes.length)];
}

function beginRound(s, round) {
  s.round = round;
  s.roundEnemyCount = getRoundEnemyCount(round);
  s.spawned = 0;
  s.bossSpawned = false;
  s.intermissionLeft = 0;
  s.spawnTimer = FIRST_SPAWN_DELAY_MS;
  s.sinceLastKill = 0;
  s.banner = { text: `ROUND ${round}`, sub: "", kind: "round", left: ROUND_BANNER_MS };
}

function spawnEnemy(s, rng) {
  const difficulty = getDifficulty(s);
  const health = getEnemyHealth(s.round);
  const gesture = pickGesture(getRoundGesturePool(s.round), s.lastSpawnGesture, rng);
  const lane = pickLane(s, rng);

  s.enemies.push(
    createEnemy({
      id: s.nextId++,
      gesture,
      health,
      maxHealth: health,
      lane,
      speed: getEnemySpeed(difficulty),
    })
  );
  s.spawned += 1;
  s.lastLane = lane;
  s.lastSpawnGesture = gesture;
  // The next spawn does NOT wait for this enemy to die. That is what makes
  // delaying dangerous: the longer you wait, the more enemies pile up.
  s.spawnTimer = getSpawnInterval(difficulty, s.sinceLastKill);
}

function spawnBoss(s) {
  const sequence = BOSS_SEQUENCES[(s.round - 1) % BOSS_SEQUENCES.length];
  const health = getBossHealth(s.round);

  s.enemies.push(
    createEnemy({
      id: s.nextId++,
      type: "boss",
      gesture: sequence[0],
      sequence,
      health,
      maxHealth: health,
      lane: (LANE_COUNT - 1) / 2, // the middle of the arena
      speed: getEnemySpeed(getDifficulty(s)) * BOSS_SPEED_FACTOR,
      damage: BOSS_DAMAGE,
    })
  );
  s.bossSpawned = true;
  s.banner = { text: "BOSS!", sub: "Follow its gesture sequence", kind: "boss", left: ROUND_BANNER_MS };
}

function decayTimers(s, dt) {
  s.damageCooldownLeft = Math.max(0, s.damageCooldownLeft - dt);
  s.damageFlash = Math.max(0, s.damageFlash - dt);

  if (s.banner) {
    s.banner.left -= dt;
    if (s.banner.left <= 0) s.banner = null;
  }
  if (s.lastAttack) {
    s.lastAttack.left -= dt;
    if (s.lastAttack.left <= 0) s.lastAttack = null;
  }

  for (const e of s.enemies) {
    e.hitFlash = Math.max(0, e.hitFlash - dt);
    if (e.status === "dying") e.dyingLeft -= dt;
  }
  s.enemies = s.enemies.filter((e) => e.status === "alive" || e.dyingLeft > 0);
}

function updateSpawning(s, dt, rng) {
  if (s.bossSpawned) return;

  const alive = aliveEnemies(s);

  // All normal enemies are out: wait until they are all gone, then the boss.
  if (s.spawned >= s.roundEnemyCount) {
    if (alive.length === 0) spawnBoss(s);
    return;
  }

  s.spawnTimer = Math.max(0, s.spawnTimer - dt);
  // At the cap we simply wait; the spawn happens when a slot frees up.
  if (s.spawnTimer <= 0 && alive.length < MAX_ACTIVE_ENEMIES) {
    spawnEnemy(s, rng);
  }
}

function hurtPlayer(s, damage) {
  s.playerHealth = Math.max(0, s.playerHealth - damage); // never negative
  s.damageCooldownLeft = DAMAGE_COOLDOWN_MS;
  s.damageFlash = DAMAGE_FLASH_MS;
}

function moveEnemies(s, dt) {
  for (const e of s.enemies) {
    if (e.status !== "alive") continue;
    e.x = Math.max(0, e.x - (e.speed * dt) / 1000);
  }

  // Enemies standing on the defence line wait for the damage cooldown.
  // Only one can hurt the player per cooldown, and a normal enemy is removed
  // the moment it does, so one collision can never hurt twice.
  if (s.damageCooldownLeft > 0) return;
  const arrived = s.enemies.find((e) => e.status === "alive" && e.x <= 0);
  if (!arrived) return;

  hurtPlayer(s, arrived.damage);
  if (arrived.type === "boss") {
    arrived.x = BOSS_RESET_X; // the boss keeps its health and walks in again
  } else {
    arrived.status = "dying";
    arrived.reached = true;
    arrived.dyingLeft = ENEMY_REACHED_MS;
  }
}

function killEnemy(s, enemy) {
  enemy.status = "dying";
  enemy.dyingLeft = enemy.type === "boss" ? BOSS_DYING_MS : ENEMY_DYING_MS;
  s.sinceLastKill = 0;

  if (enemy.type === "boss") {
    s.bossesDefeated += 1;
    const points = SCORE_BOSS + s.round * SCORE_BOSS_PER_ROUND;
    s.score += points;
    s.intermissionLeft = INTERMISSION_MS; // next round starts when this ends
    s.banner = {
      text: "BOSS DEFEATED!",
      sub: `Round ${s.round} complete  +${points}`,
      kind: "boss-defeated",
      left: INTERMISSION_MS,
    };
  } else {
    s.enemiesDefeated += 1;
    s.score += SCORE_ENEMY;
  }
}

// ---------------------------------------------------------------------
// The public API: tick, attack, pause, resume, startCountdown
// ---------------------------------------------------------------------

// Moves the game forward by dtMs milliseconds. Call it from ONE loop.
export function tick(state, dtMs, rng = Math.random) {
  // Idle, paused and over never change: this IS the pause.
  if (state.phase !== "countdown" && state.phase !== "playing") return state;

  const dt = Math.max(0, Math.min(dtMs, MAX_TICK_MS));
  const s = cloneState(state);

  // During the countdown nothing spawns, moves or deals damage.
  if (s.phase === "countdown") {
    s.countdownLeft -= dt;
    if (s.countdownLeft <= 0) {
      s.countdownLeft = 0;
      s.phase = "playing";
      beginRound(s, 1);
    }
    return s;
  }

  decayTimers(s, dt);

  // The short "round complete" pause after a boss falls.
  if (s.intermissionLeft > 0) {
    s.intermissionLeft -= dt;
    if (s.intermissionLeft <= 0) beginRound(s, s.round + 1);
    return s;
  }

  s.sinceLastKill += dt;
  updateSpawning(s, dt, rng);
  moveEnemies(s, dt);

  if (s.playerHealth <= 0) {
    s.phase = "over";
    s.banner = null; // do not leave "ROUND 2" hanging behind the Game Over screen
  }
  return s;
}

// A gesture was accepted (it became stable). Hit the closest enemy that is
// asking for exactly that gesture. No matching enemy = nothing happens.
// The caller sends ONE attack per accepted gesture, and a hit always changes
// what the enemy asks for next, so a held gesture cannot hit twice.
export function attack(state, gesture, rng = Math.random) {
  if (state.phase !== "playing" || state.intermissionLeft > 0) return state;
  if (!GESTURES[gesture]) return state; // "NONE" or anything unknown

  const s = cloneState(state);

  let target = null;
  for (const e of s.enemies) {
    if (e.status !== "alive" || e.gesture !== gesture) continue;
    if (target === null || e.x < target.x) target = e; // closest to the player
  }

  if (target === null) {
    s.lastAttack = { gesture, hit: false, left: ATTACK_FEEDBACK_MS };
    return s;
  }

  s.lastAttack = { gesture, hit: true, left: ATTACK_FEEDBACK_MS };
  target.health -= PLAYER_ATTACK_DAMAGE;
  target.hitFlash = HIT_FLASH_MS;
  target.x = Math.min(1, target.x + HIT_KNOCKBACK);

  if (target.health <= 0) {
    killEnemy(s, target);
  } else {
    target.hits += 1;
    target.gesture = target.sequence
      ? target.sequence[target.hits % target.sequence.length] // boss: next in list
      : pickGesture(getRoundGesturePool(s.round), target.gesture, rng);
  }
  return s;
}

export function pause(state) {
  if (state.phase !== "playing" && state.phase !== "countdown") return state;
  return { ...state, phase: "paused", pausedFrom: state.phase };
}

export function resume(state) {
  if (state.phase !== "paused") return state;
  return { ...state, phase: state.pausedFrom, pausedFrom: null };
}
