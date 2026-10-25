# Gesture Arena — Beginner Guide

A webcam combat game. Enemies walk toward your defence line, each showing a gesture. Make that gesture to hit them. Clear a round's enemies, beat the boss (which needs a *sequence* of gestures), and the next round starts, faster and harder. Enemies that reach you cost health. At 0 health: Game Over.

Built with React + Vite + JavaScript + MediaPipe Hand Landmarker.

---

## 1. Run it (Windows + VS Code)

1. Install **Node.js LTS** from nodejs.org (skip if `node -v` already works in a terminal).
2. Unzip the project, then in VS Code: **File → Open Folder → gesture-arena**.
3. Open the terminal with **Ctrl + `** and run:

```
npm install
npm run dev
```

4. Ctrl+click the `http://localhost:5173` link and click **Allow** for the camera.
5. Wait until the start screen shows ✔ Camera ready and ✔ Hand model ready, then click **Start Game**.

Needs internet: the hand model downloads from a CDN each time the page loads.

---

## 2. The big picture

```
Webcam -> MediaPipe finds 21 hand points -> gestures.js names the gesture
       -> gestureStability.js waits until it is steady
       -> "accepted gesture" event -> game engine decides what it hits
```

The key design rule: **each stage knows nothing about the others.**

- The camera code never mentions enemies.
- The game rules (`engine.js`) never mention React or the camera.
- That is why almost everything can be tested with plain `npm test`, no browser.

```
src/
├── main.jsx, App.jsx           start React / connect everything
├── constants.js                EVERY tunable number and the gesture list
├── styles.css
├── game/
│   ├── engine.js               ALL game rules (pure functions, no React)
│   └── engine.test.js
├── hooks/
│   ├── useWebcam.js            camera + permission states + retry
│   ├── useHandLandmarker.js    loads the model + loading states + retry
│   ├── useGestureDetection.js  the ONE camera loop -> stability -> onAccept
│   └── useGame.js              runs the ONE game loop, holds state in a ref
├── components/
│   ├── Camera.jsx              video + dots canvas
│   ├── Hud.jsx                 left side: status, gesture, health, score, buttons
│   ├── StartScreen.jsx         title, instructions, gesture list, checks, Start
│   ├── Arena.jsx               right side: enemies, boss bar, banners
│   └── Overlays.jsx            countdown, paused, game over
└── utils/
    ├── gestures.js (+ test)    21 points -> gesture name (angle math)
    ├── gestureStability.js (+ test)  "is this gesture steady?" filter
    ├── storage.js (+ test)     best score in localStorage
    └── drawHand.js             draws the dots
```

**"Hook"** = a function starting with `use` that gives a component an ability (remember a value, run code when something changes).

---

## 3. How each part works

### Gestures — `utils/gestures.js`
MediaPipe gives 21 points per hand. A **straight finger makes about a 180° angle** at its middle joint; a **curled finger** makes a small one. `angleAt(a, b, c)` measures that angle with the dot product: `angle = acos(dot / (length1 × length2))`. Because it measures angles, it works even if your hand is tilted.

| Fingers extended | Gesture |
|---|---|
| none, thumb straight and pointing up | `THUMBS_UP` |
| none, thumb straight and pointing down | `THUMB_DOWN` |
| none, otherwise | `FIST` |
| all four | `OPEN_PALM` |
| index only | `POINT` |
| index + middle | `PEACE` |
| index + pinky | `ROCK` |
| index + middle + ring | `THREE` (new) |
| pinky only | `PINKY` (new) |

The thumb is ignored except to tell fist / thumbs up / thumb down apart.
**New in this version:** `THREE`, `PINKY`, `THUMB_DOWN`.
**Not added on purpose:** `FOUR` (looks like `OPEN_PALM` unless the thumb is judged exactly), `CALL_ME` (the same as `PINKY`, since the thumb is ignored), `OK` (a fingertips-touching check that flickers).

### Stability filter — `utils/gestureStability.js`
Raw detection flickers (FIST, FIST, NONE, FIST). If every raw result attacked, you would hit things by accident. The filter:

- needs the **same gesture in 4 frames in a row** (`STABILITY_FRAMES`, about 130 ms) before it counts. It then reports it **once** as `accepted`. This is the only thing that triggers an attack.
- changes the stable gesture only when a *different* gesture becomes stable. A one-frame glitch while you hold a fist does **not** count as a new attack.
- to attack again with the same gesture you must change to something else (even a relaxed hand) and come back.
- tolerates the hand vanishing for up to 8 frames (`HAND_LOST_GRACE_FRAMES`). Longer than that, **everything is cleared**, so a stale gesture can never attack later.

The camera model's own confidence is not used. MediaPipe's score is about *which hand* (left/right), not about our gesture rules, so inventing a confidence would be misleading. Stability is shown instead.

### Camera and model — `useWebcam.js`, `useHandLandmarker.js`
They report a status the start screen shows:
camera = `initializing → requesting → granted → ready` or `denied` / `unavailable`; model = `loading → ready` or `error`. Both have a **Retry** that re-runs the setup (no page reload). If the camera is unplugged mid-game, the game pauses.

### Detection loop — `useGestureDetection.js`
One `requestAnimationFrame` loop: new video frame → find hand → draw dots → stabilizer → if `accepted`, call `onAccept(gesture)`. It only calls `setState` when something visible changed (not 60 times a second). The newest `onAccept` is kept in a ref so the loop never calls an outdated version.

### Game rules — `game/engine.js`
Everything is a function: `newState = tick(state, ms)`, `attack(state, gesture)`, `pause`, `resume`, `startCountdown`. They never change the old state, they return a new one. **Pausing is simply "nobody calls tick".**

Phases: `idle → countdown → playing ⇄ paused → over`.

- **Countdown:** 3, 2, 1, GO! Nothing spawns, moves or hurts until it ends.
- **Enemies** have health, speed, damage, a required gesture and a position `x` (1 = far right, 0 = your defence line).
- **Attack:** hits the *closest* enemy asking for exactly that gesture. A hit lowers its health, knocks it back a little and (if it survives) changes its gesture. No match = "No target", nothing happens.
- **Reaching you:** deals damage once and the enemy is removed. A **damage cooldown** (0.7 s) makes extra enemies wait on the line instead of draining all your health at once. Health never goes below 0.
- **Spawning:** timer based, *not* waiting for kills, so delaying means several enemies arrive together. Limits: `MAX_ACTIVE_ENEMIES`, `MIN_SPAWN_INTERVAL_MS`. If you defeat nothing for 5 s, spawns get 30% faster.
- **Difficulty:** one number `difficulty = (round − 1) + progress through the round` raises enemy speed and shortens the spawn interval. Each round also adds enemies, enemy health every 2 rounds, and unlocks one more gesture.
- **Rounds:** N normal enemies, then the **boss** once all are dead. The next round starts only after the boss dies, via a short "BOSS DEFEATED" pause.
- **Boss:** bigger, much more health, slower, hits hard. It follows a gesture list from `BOSS_SEQUENCES`: each hit changes the gesture, so one held gesture cannot hit twice. If it reaches you it hurts you and walks in again (it keeps its health).
- **Score:** 10 per enemy, 100 + 50×round per boss.

### Game loop — `useGame.js`
Keeps the state in a **ref** (so callbacks never see a stale copy) and copies it to React state so the screen updates. There is exactly **one** game loop and it only runs in `countdown` / `playing`. Restart creates a fresh state, it does not start a second loop. On game over it saves the best score only if it was beaten (`storage.js`).

### Screen
- **Left half:** webcam + dots, camera/hand status ("Hand not detected" when none), detected gesture with a stability bar, health bar (wide, green, ❤), score, Pause / Resume / Restart.
- **Right half:** start screen, or the arena with enemies (thin red health bars), boss bar (big, magenta), round banners, and countdown / paused / game over overlays.
- On narrow screens the halves stack and the camera shrinks so the arena stays visible.

---

## 4. Tuning — all in `constants.js`

| Want | Change |
|---|---|
| Gestures register faster / safer | `STABILITY_FRAMES` (lower = faster) |
| Easier | `PLAYER_MAX_HEALTH` up, `ENEMY_BASE_SPEED` down, `BASE_SPAWN_INTERVAL_MS` up |
| Fewer enemies at once | `MAX_ACTIVE_ENEMIES` |
| Different boss moves | edit `BOSS_SEQUENCES` (neighbours must differ) |
| All gestures from round 1 | `START_GESTURE_COUNT` |

---

## 5. Testing

```
npm test          # 57 checks across 4 files, no camera needed
npm run build     # production build
npm run dev       # play it
```

| File | What it checks |
|---|---|
| `gestures.test.js` | every gesture, conflicts (FOUR-like stays OPEN_PALM), upside-down hand |
| `gestureStability.test.js` | N-frame rule, flicker, glitch while holding, release, missing hand, stale clearing |
| `storage.test.js` | missing / invalid / blocked storage, only saves a higher score |
| `engine.test.js` | countdown, hits, closest target, damage + cooldown, game over, spawning + caps, boss + sequence, rounds, pause, restart |

**Manual checklist (needs the camera):**

| # | Do | Expect |
|---|---|---|
| 1 | Open the page | start screen with checks, gesture list |
| 2 | Block the camera, reload | red message + Retry button |
| 3 | Show a hand | "Hand detected", name + stability bar fills, "Stable" |
| 4 | Lower the hand | "Hand not detected" |
| 5 | Start Game | 3, 2, 1, GO!, no enemies yet |
| 6 | Make an enemy's gesture | it pops, score goes up, "Hit!" |
| 7 | Keep holding it | nothing more happens (one hit per hold) |
| 8 | Do nothing | several enemies approach, health drops, red flash |
| 9 | Pause, wait, Resume | everything frozen, then continues |
| 10 | Clear a round | BOSS appears, big bar, gesture changes each hit |
| 11 | Beat it | "BOSS DEFEATED", then ROUND 2 |
| 12 | Lose all health | GAME OVER stats, best score; Restart keeps best |

---

## 6. Troubleshooting

| Problem | Fix |
|---|---|
| Stuck on "Loading the hand model" | Check internet, F12 → Console; use Retry |
| Camera denied | Click the camera icon in the address bar, allow, press Retry |
| Camera busy | Close Zoom/Teams or other apps using it |
| A gesture is never recognised | Good light, hand clearly in view; thumbs up/down need the thumb really pointing up/down |
| Gestures feel slow | lower `STABILITY_FRAMES` (3) |
| Too many accidental hits | raise `STABILITY_FRAMES` (5 or 6) |
| `npm` not recognized | Reinstall Node.js, reopen VS Code |
| PowerShell blocks `npm` | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use Command Prompt |
