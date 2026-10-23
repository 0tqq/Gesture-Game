# Gesture Arena — Beginner Guide

A webcam game: the screen shows a gesture (✊ ✋ ☝️ ✌️), you copy it with your hand, hold it for half a second, and score. 30 seconds per round.

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
Holds numbers and gesture info in one place: round length (`GAME_SECONDS`), how long to hold (`HOLD_MS`), and the gesture list with labels and emojis.
**Test:** change `GAME_SECONDS` to `10`, save, and the round becomes 10 seconds (Vite reloads automatically).

### `utils/gestures.js` — the brain of gesture recognition
MediaPipe returns 21 points per hand, each with `x` and `y` between 0 and 1. In images, **y = 0 is the top**, so "higher on screen" means a **smaller y**.

The trick: a finger is "up" if its **tip** is higher than its **middle joint**.

```js
landmarks[8].y < landmarks[6].y   // index fingertip above index middle joint
```

Then we count the fingers that are up:

| Fingers up | Result |
|---|---|
| none | `FIST` |
| all four | `OPEN_PALM` |
| only index | `POINT` |
| index + middle | `PEACE` |
| anything else | `NONE` |

The thumb is ignored on purpose, because thumb detection is trickier and not needed for four gestures.
**Limit:** it assumes your hand is upright (fingers pointing up). A sideways hand will confuse it.

### `utils/gestures.test.js`
Builds fake hands (21 points, with fingertips moved up or down) and checks the answer. No camera needed.
**Test:** run `npm test`. You should see five `PASS` lines. Try breaking `gestures.js` (e.g. change `<` to `>`) and watch tests fail, then undo it.

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
Three `useEffect` blocks, each doing one job:
1. **Countdown:** while playing, subtract 1 second every second.
2. **Game over:** when `timeLeft` reaches 0, set status to `"over"`.
3. **Scoring:** if your gesture equals the target, start a 500 ms timer. If your gesture changes before it finishes, React runs the cleanup (`clearTimeout`) and the timer is cancelled. That is how "you must **hold** it" works without any extra code.

**Test:** click Start and show the wrong gesture: nothing happens. Show the right one: the box turns green, and after half a second the score goes up and a new target appears.

### `components/Camera.jsx`
Just a `<video>` and a `<canvas>` stacked on top of each other. The refs come from `App.jsx` so the hooks can reach the same elements. `muted` and `playsInline` are needed so browsers allow autoplay.

### `components/Hud.jsx`
"HUD" = heads-up display. Shows score, time, target gesture, what the camera currently sees, and the Start / Play Again button. It only displays what it's given and has no logic of its own.

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
| 1 | Gesture logic | `npm test` | 5 PASS lines |
| 2 | Build works | `npm run build` | "built in ..." with no errors |
| 3 | Camera | `npm run dev`, allow camera | You see yourself, mirrored |
| 4 | Model + dots | Raise a hand | Cyan dots on your hand |
| 5 | Recognition | Make each of the 4 gestures | "I see:" matches |
| 6 | Game | Click Start | Timer counts down, target shown |
| 7 | Scoring | Hold the target gesture | Box turns green, score +1 after ~0.5 s |
| 8 | Game over | Wait for 0 | "Time's up!" and Play Again |

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

- Make it harder: lower `HOLD_MS` or `GAME_SECONDS` in `constants.js`.
- Add a gesture, e.g. "Three fingers": add an entry in `constants.js`, then add `if (index && middle && ring && !pinky) return "THREE";` in `gestures.js`, plus a test line in `gestures.test.js`.
- Add a high score using `localStorage`.
- Add a sound on each point.
