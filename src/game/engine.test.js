// Run with:  node src/game/engine.test.js   (or npm test)
// Tests the combat rules: enemies, damage, spawning, boss, rounds,
// pause, restart, game over.

import assert from "node:assert";
import {
  createState,
  startCountdown,
  getCountdownLabel,
  createEnemy,
  aliveEnemies,
  tick,
  attack,
  pause,
  resume,
  getRoundEnemyCount,
  getEnemyHealth,
  getBossHealth,
  getRoundGesturePool,
  getDifficulty,
  getEnemySpeed,
  getSpawnInterval,
} from "./engine.js";
import {
  GESTURES,
  BOSS_SEQUENCES,
  PLAYER_MAX_HEALTH,
  ENEMY_DAMAGE,
  BOSS_DAMAGE,
  MAX_ACTIVE_ENEMIES,
  MIN_SPAWN_INTERVAL_MS,
  MAX_ENEMY_SPEED,
  DAMAGE_COOLDOWN_MS,
  INTERMISSION_MS,
  FIRST_SPAWN_DELAY_MS,
  SCORE_ENEMY,
  SCORE_BOSS,
  SCORE_BOSS_PER_ROUND,
  BOSS_RESET_X,
} from "../constants.js";

const rng = () => 0; // deterministic "random": always picks the first option
const STEP = 50;

// Advance the game by `ms` using small steps (like the real game loop).
function advance(state, ms, random = rng) {
  let s = state;
  for (let t = 0; t < ms; t += STEP) s = tick(s, STEP, random);
  return s;
}

// A game that is already in the "playing" phase, round 1, nothing spawned yet.
function playing() {
  let s = startCountdown();
  // Stop exactly when play begins, so no gameplay time has passed yet.
  while (s.phase === "countdown") s = tick(s, STEP, rng);
  assert.strictEqual(s.phase, "playing");
  return s;
}

// Same, but with spawning switched off so tests control the enemies.
function quiet(enemies = [], extra = {}) {
  return { ...playing(), spawnTimer: 1e9, spawned: 0, enemies, ...extra };
}

const enemy = (fields) => createEnemy({ id: 1, x: 0.5, ...fields });

// ---------------------------------------------------------------- config
{
  for (const seq of BOSS_SEQUENCES) {
    for (const g of seq) assert.ok(GESTURES[g], `unknown gesture ${g}`);
    for (let i = 0; i < seq.length; i++) {
      assert.notStrictEqual(seq[i], seq[(i + 1) % seq.length], "neighbours must differ");
    }
  }
  console.log("PASS boss sequences are valid and never repeat a gesture back to back");
}

// ------------------------------------------------------------- countdown
{
  assert.deepStrictEqual(
    [3700, 3000, 2700, 1700, 1000, 700, 0.1].map(getCountdownLabel),
    ["3", "3", "2", "1", "1", "GO!", "GO!"]
  );

  let s = startCountdown();
  assert.strictEqual(s.phase, "countdown");
  // Nothing spawns, moves or hurts during the countdown, even with an enemy
  // sitting on the defence line.
  s = { ...s, enemies: [enemy({ x: 0 })], spawned: 0 };
  s = advance(s, 3000);
  assert.strictEqual(s.phase, "countdown");
  assert.strictEqual(s.playerHealth, PLAYER_MAX_HEALTH);
  assert.strictEqual(s.enemies.length, 1);
  assert.strictEqual(s.enemies[0].x, 0);
  // Gestures do nothing during the countdown.
  assert.strictEqual(attack(s, "FIST", rng), s);
  // Countdown ends -> gameplay begins at round 1.
  s = advance(s, 1500);
  assert.strictEqual(s.phase, "playing");
  assert.strictEqual(s.round, 1);
  console.log("PASS countdown blocks spawning and damage, then starts play");
}

// ------------------------------------------------------ normal enemy hits
{
  let s = quiet([enemy({ gesture: "FIST", health: 1, maxHealth: 1 })]);
  const wrong = attack(s, "PEACE", rng);
  assert.strictEqual(aliveEnemies(wrong).length, 1);
  assert.strictEqual(wrong.score, 0);
  assert.strictEqual(wrong.lastAttack.hit, false);

  const right = attack(s, "FIST", rng);
  assert.strictEqual(aliveEnemies(right).length, 0);
  assert.strictEqual(right.enemiesDefeated, 1);
  assert.strictEqual(right.score, SCORE_ENEMY);
  assert.strictEqual(right.lastAttack.hit, true);
  // The input state was not modified (pure function).
  assert.strictEqual(aliveEnemies(s).length, 1);
  // Unknown gestures are ignored.
  assert.strictEqual(attack(s, "NONE", rng), s);
  console.log("PASS matching gesture defeats an enemy, wrong one does nothing");
}

// ----------------------------------------- multi-health + closest targeting
{
  const near = enemy({ id: 1, x: 0.2, gesture: "FIST" });
  const far = enemy({ id: 2, x: 0.8, gesture: "FIST" });
  let s = attack(quiet([far, near]), "FIST", rng);
  assert.strictEqual(aliveEnemies(s).length, 1);
  assert.strictEqual(aliveEnemies(s)[0].id, 2); // the closer one died
  console.log("PASS attacks hit the closest matching enemy");

  const tough = enemy({ gesture: "FIST", health: 2, maxHealth: 2 });
  s = attack(quiet([tough]), "FIST", rng);
  const e = s.enemies[0];
  assert.strictEqual(e.health, 1);
  assert.strictEqual(e.status, "alive");
  assert.notStrictEqual(e.gesture, "FIST"); // must show a new gesture now
  assert.ok(e.hitFlash > 0);
  console.log("PASS multi-health enemy changes its gesture after a hit");
}

// --------------------------------------------------- reaching the player
{
  let s = quiet([enemy({ x: 0.001, speed: 0.5 })]);
  s = advance(s, 100);
  assert.strictEqual(s.playerHealth, PLAYER_MAX_HEALTH - ENEMY_DAMAGE);
  assert.strictEqual(aliveEnemies(s).length, 0); // removed after hurting
  assert.ok(s.damageFlash > 0);
  // It cannot hurt again, however long we wait.
  s = advance(s, 5000);
  assert.strictEqual(s.playerHealth, PLAYER_MAX_HEALTH - ENEMY_DAMAGE);
  console.log("PASS enemy that reaches the player hurts once, then is removed");
}

// Two enemies arriving together: damage cooldown spaces the hits out.
{
  let s = quiet([
    enemy({ id: 1, x: 0, gesture: "FIST" }),
    enemy({ id: 2, x: 0, gesture: "PEACE" }),
  ]);
  s = advance(s, STEP);
  assert.strictEqual(s.playerHealth, PLAYER_MAX_HEALTH - ENEMY_DAMAGE);
  assert.strictEqual(aliveEnemies(s).length, 1); // second one waits
  s = advance(s, DAMAGE_COOLDOWN_MS / 2);
  assert.strictEqual(s.playerHealth, PLAYER_MAX_HEALTH - ENEMY_DAMAGE); // still protected
  s = advance(s, DAMAGE_COOLDOWN_MS);
  assert.strictEqual(s.playerHealth, PLAYER_MAX_HEALTH - 2 * ENEMY_DAMAGE);
  console.log("PASS damage cooldown protects against simultaneous hits");
}

// --------------------------------------------------------------- game over
{
  let s = quiet([enemy({ x: 0, damage: 1000 })]);
  s = advance(s, STEP);
  assert.strictEqual(s.playerHealth, 0); // never negative
  assert.strictEqual(s.phase, "over");
  assert.strictEqual(s.banner, null);
  // Everything stops: no movement, spawning, damage or attacks.
  const frozen = s;
  assert.strictEqual(tick(frozen, 1000, rng), frozen);
  assert.strictEqual(attack(frozen, "FIST", rng), frozen);
  assert.strictEqual(pause(frozen), frozen);
  assert.strictEqual(resume(frozen), frozen);
  console.log("PASS game over at zero health, health never negative, all stops");
}

// ----------------------------------------------------------------- spawning
{
  let s = playing();
  assert.strictEqual(s.enemies.length, 0);
  s = advance(s, FIRST_SPAWN_DELAY_MS - STEP);
  assert.strictEqual(s.enemies.length, 0); // not yet
  s = advance(s, 2 * STEP);
  assert.strictEqual(s.enemies.length, 1);
  assert.strictEqual(s.enemies[0].x <= 1, true);
  assert.strictEqual(s.spawned, 1);
  console.log("PASS first enemy spawns after the round start delay");
}

// Delaying attacks => several enemies approach at once.
{
  let s = playing();
  s = advance(s, 9000); // never attack
  assert.ok(aliveEnemies(s).length >= 2, "expected several enemies alive");
  assert.ok(aliveEnemies(s).length <= MAX_ACTIVE_ENEMIES);
  console.log("PASS waiting produces multiple simultaneous enemies");
}

// Spawning is capped and the interval has a floor.
{
  let s = { ...playing(), roundEnemyCount: 50, spawned: 0, spawnTimer: 0 };
  for (let i = 0; i < 400; i++) {
    s = tick(s, STEP, rng);
    // Keep enemies from reaching the player so only the cap limits spawning.
    s = { ...s, enemies: s.enemies.map((e) => ({ ...e, x: 0.9 })) };
    assert.ok(aliveEnemies(s).length <= MAX_ACTIVE_ENEMIES);
  }
  assert.strictEqual(aliveEnemies(s).length, MAX_ACTIVE_ENEMIES);
  for (const d of [0, 1, 5, 50, 500]) {
    assert.ok(getSpawnInterval(d, 0) >= MIN_SPAWN_INTERVAL_MS);
    assert.ok(getSpawnInterval(d, 99999) >= MIN_SPAWN_INTERVAL_MS);
    assert.ok(getEnemySpeed(d) <= MAX_ENEMY_SPEED);
  }
  console.log("PASS spawning respects the enemy cap and minimum interval");
}

// Difficulty rises with the round; waiting makes spawns faster.
{
  assert.ok(getEnemySpeed(1) > getEnemySpeed(0));
  assert.ok(getSpawnInterval(1) < getSpawnInterval(0));
  assert.ok(getSpawnInterval(0, 10000) < getSpawnInterval(0, 0));
  assert.ok(getRoundEnemyCount(2) > getRoundEnemyCount(1));
  assert.ok(getEnemyHealth(5) > getEnemyHealth(1));
  assert.ok(getBossHealth(2) > getBossHealth(1));
  assert.ok(getRoundGesturePool(3).length > getRoundGesturePool(1).length);
  assert.ok(getDifficulty({ round: 2, spawned: 0, roundEnemyCount: 6 }) === 1);
  console.log("PASS difficulty grows with rounds, delay speeds up spawns");
}

// ----------------------------------------------------------- boss + rounds
// Helper: a round where every normal enemy is already gone -> boss is next.
const bossReady = (round = 1) => {
  const base = quiet([], { round, roundEnemyCount: 3, spawned: 3, bossSpawned: false });
  return advance(base, STEP); // spawns the boss
};

// The boss does not appear while normal enemies are still alive / unspawned.
{
  let s = quiet([enemy({ gesture: "FIST" })], { roundEnemyCount: 3, spawned: 3 });
  s = advance(s, 2000);
  assert.ok(!s.enemies.some((e) => e.type === "boss"));
  s = quiet([], { roundEnemyCount: 3, spawned: 2 });
  s = advance(s, 500);
  assert.ok(!s.enemies.some((e) => e.type === "boss"));
  console.log("PASS boss waits for all normal enemies");
}

// Boss: spawns once, is large-health, follows its gesture sequence.
{
  let s = bossReady();
  const boss = s.enemies.find((e) => e.type === "boss");
  assert.ok(boss);
  assert.strictEqual(boss.health, getBossHealth(1));
  assert.ok(boss.health > getEnemyHealth(1) * 3);
  assert.strictEqual(boss.gesture, BOSS_SEQUENCES[0][0]);
  assert.strictEqual(s.bossSpawned, true);

  // No duplicate boss however long we wait.
  s = { ...s, enemies: s.enemies.map((e) => ({ ...e, x: 0.9, speed: 0 })) };
  s = advance(s, 5000);
  assert.strictEqual(s.enemies.filter((e) => e.type === "boss").length, 1);

  // Hit it with the right gestures in order.
  const seq = BOSS_SEQUENCES[0];
  let hits = 0;
  for (let i = 0; i < 3; i++) {
    const current = s.enemies.find((e) => e.type === "boss");
    assert.strictEqual(current.gesture, seq[i % seq.length]);
    s = attack(s, current.gesture, rng);
    hits++;
    assert.strictEqual(s.enemies.find((e) => e.type === "boss").health, getBossHealth(1) - hits);
  }
  console.log("PASS boss follows its gesture sequence, one hit per attack");
}

// A held gesture cannot hit the boss twice in a row.
{
  let s = bossReady();
  s = { ...s, enemies: s.enemies.map((e) => ({ ...e, x: 0.9, speed: 0 })) };
  const first = s.enemies[0].gesture;
  s = attack(s, first, rng);
  const afterFirst = s.enemies[0].health;
  s = attack(s, first, rng); // same gesture again (still held)
  assert.strictEqual(s.enemies[0].health, afterFirst);
  assert.notStrictEqual(s.enemies[0].gesture, first);
  console.log("PASS same gesture cannot hit the boss twice in a row");
}

// Boss reaching the player: damage, reset, keeps health, not removed.
{
  let s = bossReady();
  const boss = s.enemies[0];
  s = { ...s, enemies: [{ ...boss, x: 0, health: 4 }] };
  s = advance(s, STEP);
  assert.strictEqual(s.playerHealth, PLAYER_MAX_HEALTH - BOSS_DAMAGE);
  const after = s.enemies.find((e) => e.type === "boss");
  assert.ok(after && after.status === "alive");
  assert.strictEqual(after.health, 4);
  assert.ok(after.x > 0.9 && after.x <= BOSS_RESET_X);
  console.log("PASS boss reaching the player deals damage and walks in again");
}

// Defeating the boss: score, intermission, next round, no skipping/duplicates.
{
  let s = bossReady();
  s = { ...s, enemies: s.enemies.map((e) => ({ ...e, x: 0.9, speed: 0 })) };
  const scoreBefore = s.score;
  // Defeat it by attacking with whatever it asks for until it dies.
  let guard = 100;
  while (aliveEnemies(s).some((e) => e.type === "boss") && guard-- > 0) {
    const boss = aliveEnemies(s).find((e) => e.type === "boss");
    s = attack(s, boss.gesture, rng);
  }
  assert.strictEqual(s.bossesDefeated, 1);
  assert.strictEqual(s.score, scoreBefore + SCORE_BOSS + SCORE_BOSS_PER_ROUND);
  assert.ok(s.intermissionLeft > 0);
  assert.strictEqual(s.banner.kind, "boss-defeated");
  assert.strictEqual(s.round, 1); // not advanced yet

  // During the intermission: no spawns, attacks ignored, round unchanged.
  s = advance(s, INTERMISSION_MS - 500);
  assert.strictEqual(s.round, 1);
  assert.strictEqual(aliveEnemies(s).length, 0);
  assert.strictEqual(attack(s, "FIST", rng), s);

  // Then round 2 starts exactly once, with counters reset.
  s = advance(s, 1000);
  assert.strictEqual(s.round, 2);
  assert.strictEqual(s.spawned, 0);
  assert.strictEqual(s.bossSpawned, false);
  assert.strictEqual(s.roundEnemyCount, getRoundEnemyCount(2));
  assert.strictEqual(s.banner.text, "ROUND 2");
  assert.strictEqual(s.bossesDefeated, 1);
  console.log("PASS boss defeat -> score, transition, next round");
}

// The next round cannot start while the boss is alive.
{
  let s = bossReady();
  s = { ...s, enemies: s.enemies.map((e) => ({ ...e, x: 0.95, speed: 0 })) };
  s = advance(s, 30000);
  assert.strictEqual(s.round, 1);
  assert.strictEqual(s.intermissionLeft, 0);
  console.log("PASS next round never starts before the boss is defeated");
}

// ------------------------------------------------------------ pause/resume
{
  let s = quiet([enemy({ x: 0.5, speed: 0.1 })], { spawnTimer: 0 });
  s = advance(s, 500);
  const x = s.enemies[0].x;
  const timers = { spawnTimer: s.spawnTimer, cooldown: s.damageCooldownLeft, since: s.sinceLastKill };

  const paused = pause(s);
  assert.strictEqual(paused.phase, "paused");
  const later = advance(paused, 10000);
  assert.strictEqual(later, paused); // literally nothing changed
  assert.strictEqual(later.enemies[0].x, x);
  assert.strictEqual(later.spawnTimer, timers.spawnTimer);
  assert.strictEqual(later.sinceLastKill, timers.since);
  assert.strictEqual(attack(paused, "FIST", rng), paused); // no attacks either

  const back = resume(paused);
  assert.strictEqual(back.phase, "playing");
  const moved = advance(back, 500);
  assert.ok(moved.enemies[0].x < x);
  console.log("PASS pause freezes everything, resume continues");
}

// Pausing during the countdown freezes it too.
{
  let s = advance(startCountdown(), 1000);
  const left = s.countdownLeft;
  const paused = pause(s);
  assert.strictEqual(advance(paused, 5000).countdownLeft, left);
  assert.strictEqual(resume(paused).phase, "countdown");
  assert.strictEqual(pause(createState()).phase, "idle"); // idle cannot pause
  assert.strictEqual(resume(playing()).phase, "playing"); // resume needs paused
  console.log("PASS pause works during the countdown");
}

// ------------------------------------------------------------------ restart
{
  // Mess the game up: damage, score, round, enemies, boss, paused.
  let s = bossReady();
  s = {
    ...s,
    playerHealth: 10,
    score: 999,
    round: 4,
    enemiesDefeated: 7,
    bossesDefeated: 2,
    intermissionLeft: 1234,
    damageCooldownLeft: 500,
  };
  s = pause(s);

  const fresh = startCountdown(); // what Restart does
  assert.strictEqual(fresh.phase, "countdown");
  assert.strictEqual(fresh.playerHealth, PLAYER_MAX_HEALTH);
  assert.strictEqual(fresh.score, 0);
  assert.strictEqual(fresh.round, 1);
  assert.strictEqual(fresh.enemies.length, 0);
  assert.strictEqual(fresh.bossSpawned, false);
  assert.strictEqual(fresh.spawned, 0);
  assert.strictEqual(fresh.intermissionLeft, 0);
  assert.strictEqual(fresh.damageCooldownLeft, 0);
  assert.strictEqual(fresh.enemiesDefeated, 0);
  assert.strictEqual(fresh.bossesDefeated, 0);
  assert.strictEqual(fresh.nextId, 1);
  assert.strictEqual(fresh.banner, null);

  // Difficulty is back to round 1 values after running the new game.
  const after = advance(fresh, 4300);
  assert.strictEqual(after.phase, "playing");
  assert.strictEqual(after.round, 1);
  assert.strictEqual(after.roundEnemyCount, getRoundEnemyCount(1));
  assert.ok(Math.abs(getDifficulty(after)) < 1e-9);
  console.log("PASS restart resets everything and begins the countdown");
}

// Restart after game over works the same way.
{
  let s = quiet([enemy({ x: 0, damage: 1000 })]);
  s = advance(s, STEP);
  assert.strictEqual(s.phase, "over");
  const fresh = startCountdown();
  assert.strictEqual(fresh.phase, "countdown");
  assert.strictEqual(fresh.playerHealth, PLAYER_MAX_HEALTH);
  console.log("PASS restart after game over");
}

console.log("All engine tests passed!");
