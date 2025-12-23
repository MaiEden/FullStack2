"use strict";

document.addEventListener("DOMContentLoaded", () => {
  wireGlobalActions();
  enforceSession();
  initSimon();
});

function wireGlobalActions() {
  document.addEventListener("click", (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "logout") {
      StorageAPI.clearSession();
      location.href = "index.html";
    }
  });
}

function enforceSession() {
  if (!StorageAPI.getSession()?.userId) location.href = "index.html";
}

function initSimon() {
  // Config
  const DIFFS = {
    easy: { label: "Easy", pads: 4, maxRounds: 2, onMs: 400, offMs: 150 },
    medium: { label: "Medium", pads: 5, maxRounds: 2, onMs: 350, offMs: 130 },
    hard: { label: "Hard", pads: 6, maxRounds: 20, onMs: 300, offMs: 110 }
  };
  const DIFF_ORDER = ["easy", "medium", "hard"];

  // UI elements
  const wheel = document.querySelector("#wheel");
  const toast = document.querySelector("#toast");
  const btnStart = document.querySelector("#btnStart");
  const btnRestart = document.querySelector("#btnRestart");
  const diffBtns = {
    easy: document.querySelector("#btnEasy"),
    medium: document.querySelector("#btnMedium"),
    hard: document.querySelector("#btnHard")
  };
  const hud = {
    difficulty: document.querySelector("#hudDifficulty"),
    round: document.querySelector("#hudRound"),
    best: document.querySelector("#hudBest")
  };

  // State
  const userId = StorageAPI.getSession().userId;
  const audio = new audioMaker();
  let currentDiff = "easy";
  let unlockedMax = "easy";
  let bestByDiff = { easy: 0, medium: 0, hard: 0 };
  let segEls = [];
  let sequence = [];
  let userIndex = 0;
  let round = 0;
  let acceptingInput = false;
  let isPlaying = false;

  // Init
  loadState();
  buildWheel();
  updateUI();

  // Event listeners
  btnStart.addEventListener("click", startGame);
  btnRestart.addEventListener("click", startGame);
  
  Object.entries(diffBtns).forEach(([diff, btn]) => {
    btn.addEventListener("click", () => changeDifficulty(diff));
  });

  // Functions
  async function startGame() {
    if (isPlaying) return;
    resetGame();
    btnStart.disabled = true;
    btnRestart.disabled = false;
    showToast("Get ready…");
    await sleep(400);
    nextRound();
  }

  function resetGame() {
    sequence = [];
    userIndex = 0;
    round = 0;
    acceptingInput = false;
    isPlaying = false;
    updateUI();
  }

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

  function buildWheel() {
    const cfg = DIFFS[currentDiff];
    wheel.classList.remove("win");
    wheel.innerHTML = "";
    segEls = buildSVG(wheel, cfg.pads, onUserClick);
    updateActiveDiff();
  }

  async function onUserClick(idx) {
    if (!acceptingInput || isPlaying) return;
    
    await flashSeg(idx, true);
    
    if (idx !== sequence[userIndex]) {
      acceptingInput = false;
      await gameFail();
      return;
    }
    
    userIndex++;
    
    if (userIndex >= sequence.length) {
      acceptingInput = false;
      
      if (round > bestByDiff[currentDiff]) {
        bestByDiff[currentDiff] = round;
        saveState();
      }
      updateUI();
      
      if (round >= DIFFS[currentDiff].maxRounds) {
        await gameWin();
      } else {
        setTimeout(nextRound, 500);
      }
    }
  }

  async function nextRound() {
    const cfg = DIFFS[currentDiff];
    round++;
    userIndex = 0;
    updateUI();
    
    sequence.push(Math.floor(Math.random() * cfg.pads));
    
    showToast(`Round ${round}: Watch…`);
    await sleep(250);
    await playSequence();
    
    showToast("Your turn!");
    acceptingInput = true;
  }

  async function playSequence() {
    isPlaying = true;
    const cfg = DIFFS[currentDiff];
    
    for (const idx of sequence) {
      await flashSeg(idx, false);
      await sleep(cfg.offMs);
    }
    
    isPlaying = false;
  }

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

  async function gameFail() {
    showToast("Wrong! Press Start to retry.");
    segEls.forEach(s => s.classList.add("lit"));
    audio.error();
    await sleep(240);
    segEls.forEach(s => s.classList.remove("lit"));
    
    btnStart.disabled = false;
    btnRestart.disabled = false;
  }

  async function gameWin() {
    wheel.classList.add("win");
    segEls.forEach(s => s.classList.add("lit"));
    audio.win();
    showToast("You won! Advancing…");
    await sleep(800);
    
    segEls.forEach(s => s.classList.remove("lit"));
    wheel.classList.remove("win");
    
    const nextDiff = getNextDiff();
    
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
      saveState();
      updateUI();
      btnStart.disabled = false;
      btnRestart.disabled = false;
      showToast("All completed! Press Start to play again.");
    }
  }

  function updateUI() {
    hud.difficulty.textContent = DIFFS[currentDiff].label;
    hud.round.textContent = round;
    hud.best.textContent = bestByDiff[currentDiff];
    
    Object.entries(diffBtns).forEach(([diff, btn]) => {
      btn.disabled = !isDiffUnlocked(diff);
    });
  }

  function updateActiveDiff() {
    Object.entries(diffBtns).forEach(([diff, btn]) => {
      btn.classList.toggle("is-active", diff === currentDiff);
    });
  }

  function isDiffUnlocked(diff) {
    return DIFF_ORDER.indexOf(diff) <= DIFF_ORDER.indexOf(unlockedMax);
  }

  function getNextDiff() {
    const idx = DIFF_ORDER.indexOf(currentDiff);
    return idx < DIFF_ORDER.length - 1 ? DIFF_ORDER[idx + 1] : null;
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
  }

  function loadState() {
    const users = StorageAPI.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const simon = user.stats?.simon || {};
    currentDiff = simon.currentDiff || "easy";
    unlockedMax = simon.unlockedMax || "easy";
    bestByDiff = simon.bestByDiff || { easy: 0, medium: 0, hard: 0 };
  }

  function saveState() {
    const users = StorageAPI.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return;
    
    const stats = users[idx].stats || (users[idx].stats = {});
    stats.simon = {
      currentDiff,
      unlockedMax,
      bestByDiff
    };
    stats.lastPlayed = new Date().toISOString();
    
    StorageAPI.setUsers(users);
  }
}

// SVG Builder
function buildSVG(host, padCount, onPick) {
  const NS = "http://www.w3.org/2000/svg";
  const size = 220, cx = 110, cy = 110, rOuter = 104, rInner = 62;
  
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  
  const defs = document.createElementNS(NS, "defs");
  
  const colors = ["#ff2f88", "#26ff8a", "#2aa9ff", "#ffd64a", "#8e67ff", "#ff4fe3"];
  
  for (let i = 0; i < padCount; i++) {
    const g = document.createElementNS(NS, "radialGradient");
    g.id = `g${i}`;
    g.setAttribute("cx", "35%");
    g.setAttribute("cy", "35%");
    g.setAttribute("r", "75%");
    
    const s1 = document.createElementNS(NS, "stop");
    s1.setAttribute("offset", "0%");
    s1.setAttribute("stop-color", "#fff");
    s1.setAttribute("stop-opacity", "0.5");
    
    const s2 = document.createElementNS(NS, "stop");
    s2.setAttribute("offset", "25%");
    s2.setAttribute("stop-color", colors[i % colors.length]);
    s2.setAttribute("stop-opacity", "1");
    
    const s3 = document.createElementNS(NS, "stop");
    s3.setAttribute("offset", "100%");
    s3.setAttribute("stop-color", colors[i % colors.length]);
    s3.setAttribute("stop-opacity", "0.7");
    
    g.append(s1, s2, s3);
    defs.appendChild(g);
  }
  
  svg.appendChild(defs);
  
  const segEls = [];
  
  for (let i = 0; i < padCount; i++) {
    const a0 = (i / padCount) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / padCount) * Math.PI * 2 - Math.PI / 2;
    
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", arcPath(cx, cy, rOuter, rInner, a0, a1));
    path.setAttribute("fill", `url(#g${i})`);
    path.classList.add("seg");
    path.setAttribute("tabindex", "0");
    
    path.addEventListener("click", () => onPick(i));
    path.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPick(i);
      }
    });
    
    svg.appendChild(path);
    segEls.push(path);
  }
  
  const hub = document.createElementNS(NS, "circle");
  hub.setAttribute("cx", cx);
  hub.setAttribute("cy", cy);
  hub.setAttribute("r", rInner - 10);
  hub.classList.add("hub");
  svg.appendChild(hub);
  
  host.appendChild(svg);
  return segEls;
}

function arcPath(cx, cy, rOuter, rInner, a0, a1) {
  const gap = 0.02; // Small gap between segments
  const a0g = a0 + gap;
  const a1g = a1 - gap;
  
  const p0 = { x: cx + rOuter * Math.cos(a0g), y: cy + rOuter * Math.sin(a0g) };
  const p1 = { x: cx + rOuter * Math.cos(a1g), y: cy + rOuter * Math.sin(a1g) };
  const p2 = { x: cx + rInner * Math.cos(a1g), y: cy + rInner * Math.sin(a1g) };
  const p3 = { x: cx + rInner * Math.cos(a0g), y: cy + rInner * Math.sin(a0g) };
  const large = (a1g - a0g) > Math.PI ? 1 : 0;
  
  return `M ${p0.x} ${p0.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${rInner} ${rInner} 0 ${large} 0 ${p3.x} ${p3.y} Z`;
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}