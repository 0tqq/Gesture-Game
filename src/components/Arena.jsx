import { GESTURES, LANE_COUNT } from "../constants.js";
import { aliveEnemies, getCountdownLabel } from "../game/engine.js";
import { CountdownOverlay, PausedOverlay, GameOverOverlay } from "./Overlays.jsx";

// One enemy. Position comes straight from the game state:
// x = 1 is the right edge, x = 0 is the defence line on the left.
function Enemy({ enemy }) {
  const g = GESTURES[enemy.gesture];
  const boss = enemy.type === "boss";
  const alive = enemy.status === "alive";

  const classes = ["enemy"];
  if (boss) classes.push("boss");
  if (enemy.hitFlash > 0) classes.push("hit");
  if (!alive) classes.push(enemy.reached ? "reached" : "defeated");

  const style = {
    left: `${enemy.x * 100}%`,
    top: `${((enemy.lane + 0.5) / LANE_COUNT) * 100}%`,
  };

  return (
    <div className={classes.join(" ")} style={style}>
      {alive && (
        <div className="gesture-bubble">
          <span className="bubble-emoji">{g.emoji}</span>
          <span className="bubble-label">{g.label}</span>
        </div>
      )}
      <div className="enemy-face">{boss ? "👹" : "👾"}</div>
      {alive && !boss && (
        <div className="hp-track" aria-label="Enemy health">
          <div className="hp-fill" style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

// The right half: where enemies spawn and walk toward the defence line.
function Arena({ game, best, isNewBest, onResume, onRestart }) {
  const alive = aliveEnemies(game);
  const boss = alive.find((e) => e.type === "boss");
  const playing = game.phase === "playing" || game.phase === "paused" || game.phase === "over";

  return (
    <div className="arena-wrap">
      <div className="arena-header">
        <strong>ROUND {game.round}</strong>
        {playing && (
          <span>
            {boss || game.bossSpawned
              ? "Boss fight"
              : `Enemies ${Math.min(game.spawned, game.roundEnemyCount)}/${game.roundEnemyCount}`}
          </span>
        )}
      </div>

      {boss && (
        <div className="boss-bar" aria-label="Boss health">
          <div className="boss-bar-label">
            <span>👹 BOSS</span>
            <span>
              {boss.health} / {boss.maxHealth}
            </span>
          </div>
          <div className="boss-bar-track">
            <div className="boss-bar-fill" style={{ width: `${(boss.health / boss.maxHealth) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="arena">
        <div className="defence-line">
          <span>DEFENCE LINE</span>
        </div>

        {game.enemies.map((enemy) => (
          <Enemy key={enemy.id} enemy={enemy} />
        ))}

        {game.banner && (
          <div key={game.banner.text} className={`banner ${game.banner.kind}`}>
            <div className="banner-text">{game.banner.text}</div>
            {game.banner.sub && <div className="banner-sub">{game.banner.sub}</div>}
          </div>
        )}

        {game.damageFlash > 0 && <div className="damage-vignette" />}

        {game.phase === "countdown" && (
          <CountdownOverlay label={getCountdownLabel(game.countdownLeft)} />
        )}
        {game.phase === "paused" && <PausedOverlay onResume={onResume} onRestart={onRestart} />}
        {game.phase === "over" && (
          <GameOverOverlay game={game} best={best} isNewBest={isNewBest} onRestart={onRestart} />
        )}
      </div>
    </div>
  );
}

export default Arena;
