"use strict";

document.addEventListener("DOMContentLoaded", () => {
  wireGlobalActions();
  enforceSession();
  initSimon();
});

/**
 * Wires global click actions (logout).
 */
function wireGlobalActions() {
  document.addEventListener("click", (e) => {
    // Find the closest element that has data-action
    const action = e.target.closest("[data-action]")?.dataset.action;

    // If the action is logout, clear session and go back to index.html
    if (action === "logout") {
      StorageAPI.clearSession();
      location.href = "index.html";
    }
  });
}

// Redirects to index.html if there is no valid session.
function enforceSession() {
  if (!StorageAPI.getSession()?.userId) location.href = "index.html";
}

// Initializes Simon game
function initSimon() {
  // Difficulty configuration per level
  // onMs - time the pad is on
  // offMs - time all pads are off
  const DIFFS = {
    easy: { label: "Easy", pads: 4, maxRounds: 2, onMs: 400, offMs: 150 },
    medium: { label: "Medium", pads: 5, maxRounds: 15, onMs: 350, offMs: 130 },
    hard: { label: "Hard", pads: 6, maxRounds: 20, onMs: 300, offMs: 110 }
  };

  // Order of difficulties (used for unlocking and moving forward)
  const DIFF_ORDER = ["easy", "medium", "hard"];

  // UI elements
  const wheel = document.querySelector("#wheel");
  const toast = document.querySelector("#toast");
  const btnStart = document.querySelector("#btnStart");
  const btnRestart = document.querySelector("#btnRestart");

  // Difficulty buttons
  const diffBtns = {
    easy: document.querySelector("#btnEasy"),
    medium: document.querySelector("#btnMedium"),
    hard: document.querySelector("#btnHard")
  };

  // HUD elements
  const hud = {
    difficulty: document.querySelector("#hudDifficulty"),
    round: document.querySelector("#hudRound"),
    best: document.querySelector("#hudBest")
  };

  // User identity + audio helper
  const userId = StorageAPI.getSession().userId;
  const audio = new audioMaker();

  // Game state
  let currentDiff = "easy";
  let unlockedMax = "easy"; // highest unlocked difficulty
  let bestByDiff = { easy: 0, medium: 0, hard: 0 }; // best score per difficulty
  let segEls = []; // Pads elements
  let sequence = []; // Simon sequence of pad indexes
  let userIndex = 0; // user position inside the sequence
  let round = 0; // current round number
  let acceptingInput = false; // whether user clicks are allowed
  let isPlaying = false; // whether the game is currently playing the sequence

  // Initial setup
  loadState();
  buildWheel();
  updateUI();

  // Event listeners
  btnStart.addEventListener("click", startGame);
  btnRestart.addEventListener("click", startGame);

  // Difficulty button listeners
  Object.entries(diffBtns).forEach(([diff, btn]) => {
    btn.addEventListener("click", () => changeDifficulty(diff));
  });

  // Starts a new game if not already playing the sequence.
  async function startGame() {
    if (isPlaying) return;

    resetGame();
    btnStart.disabled = true;
    btnRestart.disabled = false;

    showToast("Get ready…");
    await sleep(400);

    nextRound();
  }

  // Resets in-memory game progression without changing difficulty/unlock info.
  function resetGame() {
    sequence = [];
    userIndex = 0;
    round = 0;
    acceptingInput = false;
    isPlaying = false;
    updateUI();
  }

  // Changes difficulty if unlocked, then rebuilds the wheel and resets the game.
  function changeDifficulty(diff) {
    if (!isDiffUnlocked(diff)) {
      showToast("Locked. Complete current difficulty first.");
      return;
    }

    currentDiff = diff;
    saveState();

    buildWheel();
    updateUI();
    resetGame();

    btnStart.disabled = false;
    btnRestart.disabled = true;
    showToast("Difficulty changed. Press Start.");
  }

  //Rebuilds the SVG wheel based on current difficulty pads.
  function buildWheel() {
    const cfg = DIFFS[currentDiff];
    wheel.classList.remove("win");
    wheel.innerHTML = "";

    // Build the SVG, return the segment elements, and attach click handler
    segEls = buildSVG(wheel, cfg.pads, onUserClick);
  }

  // Handles user picking a segment index.
  async function onUserClick(idx) {
    // Ignore clicks when not allowed or while sequence is playing
    if (!acceptingInput || isPlaying) return;

    // Visually flash + play beep for the clicked segment
    await flashSeg(idx, true);

    // If user clicked wrong segment -> fail
    if (idx !== sequence[userIndex]) {
      acceptingInput = false;
      await gameFail();
      return;
    }

    // Advance to next expected input
    userIndex++;

    // If user completed the entire sequence for this round
    if (userIndex >= sequence.length) {
      acceptingInput = false;

      // Update best score for this difficulty
      if (round > bestByDiff[currentDiff]) {
        bestByDiff[currentDiff] = round;
        saveState();
      }
      updateUI();

      // Decide win vs next round
      if (round >= DIFFS[currentDiff].maxRounds) {
        await gameWin();
      } else {
        setTimeout(nextRound, 500);
      }
    }
  }

  // Adds one new step to the sequence, plays the full sequence, then gives turn to user.
  async function nextRound() {
    const cfg = DIFFS[currentDiff];

    round++;
    userIndex = 0;
    updateUI();

    // Add random new pad to sequence
    sequence.push(Math.floor(Math.random() * cfg.pads));

    showToast(`Round ${round}: Watch…`);
    await sleep(250);

    await playSequence();

    showToast("Your turn!");
    acceptingInput = true;
  }

  // Plays the current sequence: flashes each segment in order with pauses.
  async function playSequence() {
    isPlaying = true;
    const cfg = DIFFS[currentDiff];

    for (const idx of sequence) {
      await flashSeg(idx, false);
      await sleep(cfg.offMs);
    }

    isPlaying = false;
  }

  /**
   * Flashes a segment and plays the matching beep.
   * If user-initiated, adds a tiny extra delay afterwards.
   */
  async function flashSeg(idx, isUser) {
    const el = segEls[idx];
    if (!el) return;

    const cfg = DIFFS[currentDiff];

    el.classList.add("lit");
    audio.beep(idx, segEls.length);

    await sleep(cfg.onMs);

    el.classList.remove("lit");

    if (isUser) await sleep(30);
  }

  // Handles failing a round (wrong input).
  async function gameFail() {
    showToast("Wrong! Press Start to retry.");

    segEls.forEach(s => s.classList.add("lit"));
    audio.error();
    await sleep(240);
    segEls.forEach(s => s.classList.remove("lit"));

    btnStart.disabled = false;
    btnRestart.disabled = false;
  }

  // Handles winning the difficulty. Advances difficulty if possible.
  async function gameWin() {
    wheel.classList.add("win");

    segEls.forEach(s => s.classList.add("lit"));
    audio.win();

    showToast("You won! Advancing…");
    await sleep(800);

    segEls.forEach(s => s.classList.remove("lit"));
    wheel.classList.remove("win");

    const idx = DIFF_ORDER.indexOf(currentDiff);
    const nextDiff = idx < DIFF_ORDER.length - 1 ? DIFF_ORDER[idx + 1] : null;

    // If there is another difficulty, unlock it and auto-start
    if (nextDiff) {
      if (DIFF_ORDER.indexOf(nextDiff) > DIFF_ORDER.indexOf(unlockedMax)) {
        unlockedMax = nextDiff;
      }

      currentDiff = nextDiff;
      saveState();
      buildWheel();
      updateUI();

      await sleep(200);
      startGame();
    } else {
      // All difficulties completed
      saveState();
      updateUI();
      btnStart.disabled = false;
      btnRestart.disabled = false;
      showToast("All completed! Press Start to play again.");
    }
  }

  // Updates HUD and locks/unlocks difficulty buttons.
  function updateUI() {
    hud.difficulty.textContent = DIFFS[currentDiff].label;
    hud.round.textContent = round;
    hud.best.textContent = bestByDiff[currentDiff];

    Object.entries(diffBtns).forEach(([diff, btn]) => {
      btn.disabled = !isDiffUnlocked(diff);
    });
  }

  // Returns whether a difficulty is unlocked based on DIFF_ORDER and unlockedMax.
  function isDiffUnlocked(diff) {
    return DIFF_ORDER.indexOf(diff) <= DIFF_ORDER.indexOf(unlockedMax);
  }

  // Shows a message in the toast element.
  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
  }

  // Loads Simon state (difficulty, unlocks, best) from StorageAPI user stats.
  function loadState() {
    const users = StorageAPI.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const simon = user.stats?.simon || {};
    currentDiff = simon.currentDiff || "easy";
    unlockedMax = simon.unlockedMax || "easy";
    bestByDiff = simon.bestByDiff || { easy: 0, medium: 0, hard: 0 };
  }

  // Saves Simon state back to StorageAPI user stats.
  function saveState() {
    const users = StorageAPI.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return;

    const stats = users[idx].stats || (users[idx].stats = {});
    stats.simon = { currentDiff, unlockedMax, bestByDiff };

    StorageAPI.setUsers(users);
  }
}

//: reads config, grabs UI elements, sets up state, builds wheel, updates UI, and attaches listeners.
/**
 * Builds the SVG "wheel" with padCount segments.
 * Each segment is clickable and triggers onPick(i).
 * Returns the created segment elements array.
 */
function buildSVG(host, padCount, onPick) {
  // SVG namespace URI (required when creating SVG elements)
  const NS = "http://www.w3.org/2000/svg";

  // Basic geometry configuration for the SVG wheel
  // size   - total width/height of the SVG viewBox
  // cx, cy - center point of the wheel
  // rOuter - outer radius of the segments
  // rInner - inner radius (creates a donut shape)
  const size = 220, cx = 110, cy = 110, rOuter = 104, rInner = 62;

  // Create the root SVG element using the SVG namespace
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  // Define gradients
  const defs = document.createElementNS(NS, "defs");
  const colors = ["#ff2f88", "#26ff8a", "#2aa9ff", "#ffd64a", "#8e67ff", "#ff4fe3"];

  for (let i = 0; i < padCount; i++) {
    const g = document.createElementNS(NS, "radialGradient");
    g.id = `g${i}`;
    g.setAttribute("cx", "35%");
    g.setAttribute("cy", "35%");
    g.setAttribute("r", "75%");

    // Gradient: highlight in the center
    const s1 = document.createElementNS(NS, "stop");
    s1.setAttribute("offset", "0%");
    s1.setAttribute("stop-color", "#fff");
    s1.setAttribute("stop-opacity", "0.5");
    // Main color of the pad
    const s2 = document.createElementNS(NS, "stop");
    s2.setAttribute("offset", "25%");
    s2.setAttribute("stop-color", colors[i % colors.length]);
    s2.setAttribute("stop-opacity", "1");
    // Darker edge
    const s3 = document.createElementNS(NS, "stop");
    s3.setAttribute("offset", "100%");
    s3.setAttribute("stop-color", colors[i % colors.length]);
    s3.setAttribute("stop-opacity", "0.7");
    // Append stops to gradient
    g.append(s1, s2, s3);
    // Append gradient to defs
    defs.appendChild(g);
  }
  // Append defs to SVG
  svg.appendChild(defs);

  const segEls = [];

  // Build each segment as a donut-slice path
  for (let i = 0; i < padCount; i++) {
    const a0 = (i / padCount) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / padCount) * Math.PI * 2 - Math.PI / 2;

    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", arcPath(cx, cy, rOuter, rInner, a0, a1));
    path.setAttribute("fill", `url(#g${i})`);
    path.classList.add("seg");

    // Mouse click
    path.addEventListener("click", () => onPick(i));

    svg.appendChild(path);
    segEls.push(path);
  }

  // Center hub circle
  const hub = document.createElementNS(NS, "circle");
  hub.setAttribute("cx", cx);
  hub.setAttribute("cy", cy);
  hub.setAttribute("r", rInner - 10);
  hub.classList.add("hub");
  svg.appendChild(hub);

  host.appendChild(svg);
  return segEls;
}

// Produces the SVG path string for a donut segment arc.
function arcPath(cx, cy, rOuter, rInner, a0, a1) {
  const gap = 0.02; // Small gap between segments
  const a0g = a0 + gap;
  const a1g = a1 - gap;

  const p0 = { x: cx + rOuter * Math.cos(a0g), y: cy + rOuter * Math.sin(a0g) };
  const p1 = { x: cx + rOuter * Math.cos(a1g), y: cy + rOuter * Math.sin(a1g) };
  const p2 = { x: cx + rInner * Math.cos(a1g), y: cy + rInner * Math.sin(a1g) };
  const p3 = { x: cx + rInner * Math.cos(a0g), y: cy + rInner * Math.sin(a0g) };

  // Determine whether the arc is a "large arc"
  const large = (a1g - a0g) > Math.PI ? 1 : 0;

  return `M ${p0.x} ${p0.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${rInner} ${rInner} 0 ${large} 0 ${p3.x} ${p3.y} Z`;
}

// Promise-based sleep helper (ms)
// Used to pause execution in async functions without blocking the browser.
function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}