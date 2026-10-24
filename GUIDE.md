# Gesture Arena — Beginner Guide

A webcam survival game: enemies appear one after another, each demanding a gesture (✊ ✋ ☝️ ✌️ 👍 🤘). Copy it and hold it briefly to defeat the enemy before its timer runs out. One miss = game over, and every kill makes the next enemy faster.

Built with React + Vite + JavaScript + MediaPipe Hand Landmarker.

---

## 1. Run it (Windows + VS Code)

1. Install **Node.js LTS** from nodejs.org (skip if `node -v` already works in a terminal).
2. Unzip the project, then in VS Code: **File → Open Folder → gesture-arena**.
3. Open the terminal: **Ctrl + `** (backtick).
4. Run:

```
npm install
npm run dev
```

5. Ctrl+click the `http://localhost:5173` link. Click **Allow** when Chrome/Edge asks for camera access.
6. Wait a few seconds for "Loading camera and hand model..." to disappear, then click **Start Game**.

Needs an internet connection: the hand model and its WebAssembly files download from a CDN each time you load the page.

---

## 2. The big picture (plain English)

Think of an assembly line:

```
Webcam  ->  MediaPipe finds 21 hand points  ->  our code turns points into a gesture name
                                                          |
                                      game rules compare it with the target  ->  score
```

Each step lives in its own file, so you can read and test one piece at a time.

```
gesture-arena/
├── index.html                      page shell, loads src/main.jsx
├── package.json                    dependencies + npm scripts
├── vite.config.js                  tells Vite to understand React
└── src/
    ├── main.jsx                    starts React
    ├── App.jsx                     connects everything together
    ├── constants.js                game settings + gesture list
    ├── styles.css                  look and layout
    ├── components/
    │   ├── Camera.jsx              video + canvas on screen
    │   └── Hud.jsx                 score, timer, target, buttons
    ├── hooks/
    │   ├── useWebcam.js            opens the camera
    │   ├── useHandLandmarker.js    loads the MediaPipe model
    │   ├── useGestureDetection.js  the per-frame detection loop
    │   └── useGame.js              game rules (score, timer, target)
    └── utils/
        ├── gestures.js             21 points -> gesture name
        ├── gestures.test.js        automated test for gestures.js
        └── drawHand.js             draws the dots on the canvas
```

**Word you'll see a lot: "hook".** A hook is a function whose name starts with `use` that gives a React component some ability (remember a value, run code when something changes). Here, each hook is a small job pulled out of `App.jsx` to keep it tidy.

---

## 3. File by file

### `constants.js`
Holds numbers and gesture info in one place: hold time (`HOLD_MS`), the difficulty curve (start time limit, how much each kill shortens it, the minimum, and the same three numbers for the pause between enemies), and the gesture list with labels and emojis.
**Test:** change `START_TIME_LIMIT_MS` to `2000`, save, and the first enemy only gives you 2 seconds.

### `utils/gestures.js` — the brain of gesture recognition
MediaPipe returns 21 points per hand. We use **angles** instead of "is the tip higher than the joint":

- A straight finger makes a ~180° angle at its middle joint. A curled finger folds and makes a small angle.
- `angleAt(a, b, c)` returns the angle at point `b` using the dot product: `angle = acos( dot / (length1 × length2) )`.
- A finger counts as **extended** if its angle is above 150°.

Because angles don't care which way the hand points, this works even if the hand is tilted or sideways (the test even flips a hand upside down).

Count which fingers are extended:

| Fingers | Result |
|---|---|
| none extended, thumb straight and pointing up | `THUMBS_UP` |
| none extended, otherwise | `FIST` |
| all four | `OPEN_PALM` |
| only index | `POINT` |
| index + middle | `PEACE` |
| index + pinky | `ROCK` |
| anything else | `NONE` |

The thumb is only used to tell **fist** from **thumbs up** (straight + tip above its joint + tip above the index knuckle). For all other gestures it is ignored on purpose.
**Limit:** thumbs up assumes "up" means up on screen.

### `utils/gestures.test.js`
Checks the angle math first (straight line = 180°, right angle = 90°), then builds fake hands for every gesture and checks the answer. No camera needed.
**Test:** run `npm test`. You should see ten `PASS` lines. Try changing `FINGER_STRAIGHT_ANGLE` to `20` in `gestures.js` and watch tests fail, then undo it.

### `utils/drawHand.js`
Draws a cyan dot on each of the 21 points. Landmarks are 0–1, so we multiply by the canvas width/height to get pixels. It clears the canvas first on every frame, otherwise old dots would smear.
**Test:** if you see dots following your hand, it works.

### `hooks/useWebcam.js`
Calls `navigator.mediaDevices.getUserMedia(...)`, the browser's built-in "give me the camera" function, and plugs the stream into the `<video>` element. The cleanup function at the bottom turns the camera off when the page closes.
Returns `cameraReady` and `cameraError`.
**Test:** you should see yourself. To test the error path, click the camera icon in the address bar, block access, and reload: a red error message appears.

### `hooks/useHandLandmarker.js`
Downloads and starts the MediaPipe model. Important options:
- `runningMode: "VIDEO"`: we feed it video frames.
- `numHands: 1`: track one hand (faster, simpler).
- `delegate: "GPU"`: use the graphics card if possible.

The `WASM_URL` version (`0.10.14`) must match the version in `package.json`. If you ever upgrade the package, change both.
**Test:** open DevTools (F12) → Network tab, reload, and look for `hand_landmarker.task` downloading.

### `hooks/useGestureDetection.js`
The loop. `requestAnimationFrame` calls our `loop` function before every screen repaint (about 60 times per second). Each time:
1. Skip if the video has no new frame.
2. `detectForVideo(...)` finds the hand.
3. `drawHand(...)` draws dots.
4. `detectGesture(...)` names the gesture and saves it in state.

It returns the current gesture name, e.g. `"FIST"`.
**Test:** the "I see:" line in the game should change as you change your hand.

### `hooks/useGame.js` — the rules
Four `useEffect` blocks, each doing one job:
1. **Spawn:** whenever there is no enemy, wait a short pause, then create one with a random gesture (never the same twice in a row) and a time limit.
2. **Enemy timer:** counts down to a deadline using the real clock. If it hits 0 before the enemy is defeated, status becomes `"over"` = **game over**.
3. **Defeat:** if you show the enemy's gesture, a `HOLD_MS` timer starts. If your gesture changes first, React runs the cleanup (`clearTimeout`) and cancels it, so you must *hold* the gesture. On success: score goes up (10 points + up to 10 speed bonus), `defeated` goes up, the enemy is cleared and effect 1 spawns the next.
4. **Best score:** remembered until you refresh the page.

**Escalating pressure** (two functions at the top of the file):
- `getTimeLimit(defeated)` = start time minus 200 ms per kill, never below 1.5 s.
- `getSpawnDelay(defeated)` = start pause minus 50 ms per kill, never below 0.15 s.
So at 0 kills you get 5 s per enemy, at 10 kills 3 s, from 18 kills on 1.5 s.

A **ref** (`timeLeftRef`) holds the remaining time so the defeat timer can read it for the speed bonus without restarting every 50 ms.
**Test:** don't show anything: the bar drains, turns red under 30%, then GAME OVER. Defeat a few enemies and notice the bar draining faster each time.

### `components/Camera.jsx`
Just a `<video>` and a `<canvas>` stacked on top of each other. The refs come from `App.jsx` so the hooks can reach the same elements. `muted` and `playsInline` are needed so browsers allow autoplay.

### `components/Hud.jsx`
HUD = heads-up display. Shows one of three screens: the start screen, the playing screen (enemy 👾, the required gesture, a shrinking timer bar with seconds, score and streak, and what the camera currently sees), and the GAME OVER screen (score, enemies defeated, best score, which gesture you missed, Play Again). It only displays what it's given and has no logic of its own.

### `App.jsx`
Creates the two refs, calls the four hooks, and passes results to `Camera` and `Hud`. Read this file first; it's the table of contents of the whole app.

### `main.jsx`, `index.html`, `vite.config.js`, `package.json`
Standard Vite + React setup. `index.html` has an empty `<div id="root">`, `main.jsx` tells React to fill it with `<App />`.

### `styles.css`
Video and canvas use `position: absolute` to overlap, and `transform: scaleX(-1)` mirrors both so the screen behaves like a mirror (your right hand appears on the right).

---

## 4. Testing checklist

| # | What | How | Expected |
|---|---|---|---|
| 1 | Gesture logic | `npm test` | 10 PASS lines |
| 2 | Build works | `npm run build` | "built in ..." with no errors |
| 3 | Camera | `npm run dev`, allow camera | You see yourself, mirrored |
| 4 | Model + dots | Raise a hand | Cyan dots on your hand |
| 5 | Recognition | Make each of the 4 gestures | "I see:" matches |
| 6 | Game | Click Start | Enemy appears with a gesture and a timer bar |
| 7 | Defeat | Hold the required gesture | Box turns green, score goes up, next enemy comes |
| 8 | Game over | Let a timer reach 0 | GAME OVER screen and Play Again |

Debug tip: add `console.log(gesture)` inside `App.jsx` and watch the Console (F12). Remove it when done.

---

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| Stuck on "Loading..." | Check your internet; open F12 → Console for the error |
| Camera error | Allow camera in the browser's address-bar icon; close Zoom/Teams/other apps using the camera |
| Dots appear but gesture is wrong | Hold your hand upright, palm facing the camera, with good lighting |
| `npm` not recognized | Reinstall Node.js, then close and reopen VS Code |
| PowerShell blocks `npm` ("running scripts is disabled") | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use Command Prompt as your VS Code terminal |
| Page works on localhost but not on a phone/other PC | Camera access needs `localhost` or HTTPS |

---

## 6. Easy things to try next

- Tune difficulty in `constants.js` (`TIME_STEP_MS`, `MIN_TIME_LIMIT_MS`, ...).
- Add a gesture, e.g. "Three fingers": add an entry in `constants.js`, then add `if (index && middle && ring && !pinky) return "THREE";` in `gestures.js`, plus a line in the `tests` list in `gestures.test.js`.
- Add a high score using `localStorage`.
- Add a sound on each point.
