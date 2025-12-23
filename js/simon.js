"use strict";

/**
 * Simon:
 * - Easy:   4 pads, rounds 1..10
 * - Medium: 5 pads, rounds 1..15
 * - Hard:   6 pads, rounds 1..20
 * - Save current difficulty and unlocked max difficulty per user
 * - Allow switching only to unlocked difficulties
 * - Auto-advance to next difficulty after success
 */

document.addEventListener("DOMContentLoaded", () => {
  enforceSession();
  initSimon();
});

// Redirect to index if no valid session
function enforceSession(){
  const session = StorageAPI.getSession();
  if (!session?.userId) location.href = "index.html";
}

function showToast(el, msg){
  el.textContent = msg;
  el.hidden = false;
}

function hideToast(el){
  el.hidden = true;
  el.textContent = "";
}

/* ----------------------- Main Simon Logic ----------------------- */
function initSimon(){
  // UI elements
  const wheelHost = document.querySelector("#wheel");
  const toast = document.querySelector("#toast");

  const btnStart = document.querySelector("#btnStart");
  const btnRestart = document.querySelector("#btnRestart");

  const btnEasy = document.querySelector("#btnEasy");
  const btnMedium = document.querySelector("#btnMedium");
  const btnHard = document.querySelector("#btnHard");

  const hudDifficulty = document.querySelector("#hudDifficulty");
  const hudRound = document.querySelector("#hudRound");
  const hudBest = document.querySelector("#hudBest");

  // Difficulty configurations
  const DIFFS = {
    easy:   { label: "Easy",   pads: 4, maxRounds: 10 },
    medium: { label: "Medium", pads: 5, maxRounds: 15 },
    hard:   { label: "Hard",   pads: 6, maxRounds: 20 },
  };
  const DIFF_ORDER = ["easy", "medium", "hard"];

  const session = StorageAPI.getSession();
  const userId = session.userId;

  const audio = new audioMaker();
  // Persistent user state
  let currentDiff = "easy";
  let unlockedMax = "easy";
  let bestByDiff = { easy: 0, medium: 0, hard: 0 };

  // Run state
  //??????
  let segEls = [];
  let sequence = [];
  let userIndex = 0;
  let round = 0;
  let acceptingInput = false;
  let isPlayingSequence = false;

  loadUserSimonState();
  buildWheelForDifficulty(currentDiff, /*soft*/ true);
  renderNavLocking();
  renderHUD();

  btnStart.addEventListener("click", async () => {
    hideToast(toast);
    await startGame();
  });
  btnRestart.addEventListener("click", async () => {
    hideToast(toast);
    await startGame();
  });

  [btnEasy, btnMedium, btnHard].forEach(btn => {
    btn.addEventListener("click", async () => {
      const diff = btn.dataset.diff;
      if (!diff) return;

      if (!isDiffUnlocked(diff)){
        showToast(toast, "That difficulty is locked. Finish the current mode to unlock it.");
        return;
      }

      currentDiff = diff;
      saveUserSimonState();
      buildWheelForDifficulty(currentDiff, /*soft*/ false);
      renderNavLocking();
      renderHUD();
      showToast(toast, "Difficulty changed. Press Start to play.");
    });
  });

  async function startGame(){
    if (isPlayingSequence) return;

    resetRunState();
    btnStart.disabled = true;
    btnRestart.disabled = false;

    showToast(toast, "Get ready…");
    await sleep(420);

    await nextRound();
  }

  function resetRunState(){
    sequence = [];
    userIndex = 0;
    round = 0;
    acceptingInput = false;
    isPlayingSequence = false;
    renderHUD();
  }

  function buildWheelForDifficulty(diffKey, soft){
    // UI active
    setActiveDifficultyButton(diffKey);

    // Build SVG wheel segments
    const cfg = DIFFS[diffKey];
    wheelHost.classList.remove("win");
    wheelHost.innerHTML = "";
    segEls = buildSimonWheelSVG(wheelHost, cfg.pads, onUserPick);

    // Switching difficulty resets run state and enables Start
    if (!soft){
      resetRunState();
      btnStart.disabled = false;
      btnRestart.disabled = true;
    }
  }

  async function onUserPick(idx){
    if (!acceptingInput || isPlayingSequence) return;

    await flashSeg(idx, /*isUser*/ true);

    // Validate
    if (idx !== sequence[userIndex]){
      acceptingInput = false;
      await fail();
      return;
    }

    userIndex += 1;

    // Completed the current round
    if (userIndex >= sequence.length){
      acceptingInput = false;

      if (round > (bestByDiff[currentDiff] || 0)){
        bestByDiff[currentDiff] = round;
        saveUserSimonState();
      }
      renderHUD();

      const cfg = DIFFS[currentDiff];
      if (round >= cfg.maxRounds){
        await winAndAdvance();
        return;
      }

      setTimeout(() => nextRound(), 520);
    }
  }

  async function nextRound(){
    const cfg = DIFFS[currentDiff];

    round += 1;
    userIndex = 0;
    renderHUD();

    // Extend sequence
    sequence.push(randInt(0, cfg.pads - 1));

    showToast(toast, `Round ${round}: watch the sequence…`);
    await sleep(260);

    await playSequence();

    hideToast(toast);
    acceptingInput = true;
    showToast(toast, "Your turn!");
  }

  async function playSequence(){
    acceptingInput = false;
    isPlayingSequence = true;

    const timing = getTimingForRound(currentDiff, round);

    for (const idx of sequence){
      await flashSeg(idx, false, timing.onMs);
      await sleep(timing.offMs);
    }

    isPlayingSequence = false;
  }

  async function flashSeg(idx, isUser, overrideOnMs){
    const el = segEls[idx];
    if (!el) return;

    const onMs = typeof overrideOnMs === "number"
      ? overrideOnMs
      : getTimingForRound(currentDiff, round).onMs;

    el.classList.add("is-lit");
    audio.beep(idx, segEls.length);

    await sleep(onMs);

    el.classList.remove("is-lit");

    if (isUser) await sleep(30);
  }

  async function fail(){
    showToast(toast, "Wrong segment! Press Start to try again.");
    await errorPulse();

    btnStart.disabled = false;
    btnRestart.disabled = false;
  }

  async function errorPulse(){
    segEls.forEach(s => s.classList.add("is-lit"));
    audio.error();
    await sleep(240);
    segEls.forEach(s => s.classList.remove("is-lit"));
    await sleep(140);
  }

  async function winAndAdvance(){
    // Win feedback
    wheelHost.classList.add("win");
    segEls.forEach(s => s.classList.add("is-lit"));
    audio.win();

    showToast(toast, "You won! Advancing to the next difficulty…");
    await sleep(780);

    segEls.forEach(s => s.classList.remove("is-lit"));
    wheelHost.classList.remove("win");

    // Unlock + move to next difficulty
    const next = nextDifficulty(currentDiff);

    if (next){
      // Unlock next
      if (DIFF_ORDER.indexOf(next) > DIFF_ORDER.indexOf(unlockedMax)){
        unlockedMax = next;
      }
      // Switch immediately
      currentDiff = next;
      saveUserSimonState();

      buildWheelForDifficulty(currentDiff, /*soft*/ false);
      renderNavLocking();
      renderHUD();

      // Auto-start next difficulty
      await sleep(220);
      await startGame();
    }else{
      // No next (Hard completed)
      saveUserSimonState();
      renderNavLocking();
      renderHUD();

      btnStart.disabled = false;
      btnRestart.disabled = false;
      acceptingInput = false;

      showToast(toast, "All difficulties completed! Press Start to play again.");
    }
  }

  function renderHUD(){
    hudDifficulty.textContent = DIFFS[currentDiff].label;
    hudRound.textContent = String(round);
    hudBest.textContent = String(bestByDiff[currentDiff] || 0);
  }

  function renderNavLocking(){
    btnEasy.disabled = !isDiffUnlocked("easy");
    btnMedium.disabled = !isDiffUnlocked("medium");
    btnHard.disabled = !isDiffUnlocked("hard");
  }

  function setActiveDifficultyButton(diff){
    [btnEasy, btnMedium, btnHard].forEach(b => b.classList.remove("is-active"));
    const active = diff === "easy" ? btnEasy : diff === "medium" ? btnMedium : btnHard;
    active.classList.add("is-active");
  }

  function isDiffUnlocked(diff){
    return DIFF_ORDER.indexOf(diff) <= DIFF_ORDER.indexOf(unlockedMax);
  }

  function nextDifficulty(diff){
    const i = DIFF_ORDER.indexOf(diff);
    if (i < 0 || i >= DIFF_ORDER.length - 1) return null;
    return DIFF_ORDER[i + 1];
  }

  // Speed curve (safe minimums)
  function getTimingForRound(diff, r){
    const base = {
      easy:   { on: 520, off: 170 },
      medium: { on: 480, off: 150 },
      hard:   { on: 450, off: 130 },
    }[diff];

    const min = {
      easy:   { on: 240, off: 90 },
      medium: { on: 230, off: 85 },
      hard:   { on: 220, off: 80 },
    }[diff];

    const maxR = DIFFS[diff].maxRounds;
    const t = clamp01((r - 1) / (maxR - 1));
    const eased = t * t * (3 - 2 * t); // smoothstep

    return {
      onMs: Math.round(lerp(base.on, min.on, eased)),
      offMs: Math.round(lerp(base.off, min.off, eased)),
    };
  }

  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  function lerp(a, b, t){ return a + (b - a) * t; }
  function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
  function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

  /* -------------------- Persistence (per user) -------------------- */
  function loadUserSimonState(){
    // get user
    const users = StorageAPI.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return;

    const stats = users[idx].stats || (users[idx].stats = {});
    const simon = stats.simon || (stats.simon = {});

    currentDiff = simon.currentDiff || "easy";
    unlockedMax = simon.unlockedMax || "easy";
    bestByDiff = simon.bestByDiff || { easy: 0, medium: 0, hard: 0 };

    bestByDiff.easy = Number(bestByDiff.easy || 0);
    bestByDiff.medium = Number(bestByDiff.medium || 0);
    bestByDiff.hard = Number(bestByDiff.hard || 0);

    saveUserSimonState();
  }

  function saveUserSimonState(){
    const users = StorageAPI.getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx < 0) return;

    const stats = users[idx].stats || (users[idx].stats = {});
    const simon = stats.simon || (stats.simon = {});

    simon.currentDiff = currentDiff;
    simon.unlockedMax = unlockedMax;
    simon.bestByDiff = bestByDiff;
    stats.lastPlayed = new Date().toISOString();

    StorageAPI.setUsers(users);
  }
}

/* ------------------- SVG Wheel Builder (no stripes) ------------------- */
function buildSimonWheelSVG(host, padCount, onPick){
  const NS = "http://www.w3.org/2000/svg";
  const size = 220;
  const cx = 110, cy = 110;
  const rOuter = 104;
  const rInner = 62;

  host.innerHTML = "";

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("role", "img");

  const defs = document.createElementNS(NS, "defs");

  // Optional glow filter (kept for a softer feel)
  defs.appendChild(makeGlowFilter(NS));

  // Neon colors (match your site vibe)
  const neonBase = [
    "#ff2f88", // neon pink
    "#26ff8a", // neon green
    "#2aa9ff", // neon cyan/blue
    "#ffd64a", // neon yellow
    "#8e67ff", // neon purple
    "#ff4fe3", // neon magenta
  ];

  // LED gradients per segment
  for (let i = 0; i < padCount; i++){
    defs.appendChild(makeLedGradient(NS, `g${i}`, neonBase[i % neonBase.length]));
  }

  // Specular highlight gradient (adds "real" shine)
  defs.appendChild(makeSpecHighlight(NS));

  svg.appendChild(defs);

  // Outer ring
  const ring = document.createElementNS(NS, "circle");
  ring.setAttribute("cx", cx);
  ring.setAttribute("cy", cy);
  ring.setAttribute("r", rOuter + 2);
  ring.classList.add("wheelRing", "wheelRing--outer");
  svg.appendChild(ring);

  const segEls = [];

  for (let i = 0; i < padCount; i++){
    const a0 = (i / padCount) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / padCount) * Math.PI * 2 - Math.PI / 2;

    // Base LED segment
    const base = document.createElementNS(NS, "path");
    base.setAttribute("d", donutSegmentPath(cx, cy, rOuter, rInner, a0, a1));
    base.setAttribute("fill", `url(#g${i})`);
    base.classList.add("seg");
    base.dataset.pad = String(i);
    base.setAttribute("role", "button");
    base.setAttribute("aria-label", `Segment ${i + 1}`);
    base.setAttribute("tabindex", "0");

    // Prevent ugly focus outline on mouse/touch while keeping keyboard focus
    base.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" || e.pointerType === "touch"){
        e.preventDefault();
      }
    });

    base.addEventListener("click", () => onPick(i));
    base.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " "){
        e.preventDefault();
        onPick(i);
      }
    });

    // Specular highlight overlay (no stripes)
    const spec = document.createElementNS(NS, "path");
    spec.setAttribute("d", donutSegmentPath(cx, cy, rOuter, rInner, a0, a1));
    spec.classList.add("segSpec");

    // Light vignette overlay for depth (soft dark edges)
    const vign = document.createElementNS(NS, "path");
    vign.setAttribute("d", donutSegmentPath(cx, cy, rOuter, rInner, a0, a1));
    vign.classList.add("segVign");

    const g = document.createElementNS(NS, "g");
    g.appendChild(base);
    g.appendChild(spec);
    g.appendChild(vign);

    svg.appendChild(g);
    segEls.push(base);
  }

  // Inner ring + hub
  const innerRing = document.createElementNS(NS, "circle");
  innerRing.setAttribute("cx", cx);
  innerRing.setAttribute("cy", cy);
  innerRing.setAttribute("r", rInner + 6);
  innerRing.classList.add("wheelRing", "wheelRing--inner");
  svg.appendChild(innerRing);

  const hub = document.createElementNS(NS, "circle");
  hub.setAttribute("cx", cx);
  hub.setAttribute("cy", cy);
  hub.setAttribute("r", rInner - 10);
  hub.classList.add("hub");
  svg.appendChild(hub);

  const hubGlow = document.createElementNS(NS, "circle");
  hubGlow.setAttribute("cx", cx);
  hubGlow.setAttribute("cy", cy);
  hubGlow.setAttribute("r", rInner - 18);
  hubGlow.classList.add("hubGlow");
  svg.appendChild(hubGlow);

  host.appendChild(svg);
  return segEls;
}

function makeGlowFilter(NS){
  const f = document.createElementNS(NS, "filter");
  f.id = "glow";
  f.classList.add("svgFilter", "svgFilter--glow");

  const blur = document.createElementNS(NS, "feGaussianBlur");
  blur.setAttribute("stdDeviation", "2.2");
  blur.setAttribute("result", "b");

  const merge = document.createElementNS(NS, "feMerge");
  const n1 = document.createElementNS(NS, "feMergeNode");
  n1.setAttribute("in", "b");
  const n2 = document.createElementNS(NS, "feMergeNode");
  n2.setAttribute("in", "SourceGraphic");
  merge.appendChild(n1);
  merge.appendChild(n2);

  f.appendChild(blur);
  f.appendChild(merge);
  return f;
}

function makeLedGradient(NS, id, baseHex){
  // Smooth "lamp" look: bright core + gentle falloff (no stripe texture)
  const g = document.createElementNS(NS, "radialGradient");
  g.setAttribute("id", id);
  g.setAttribute("cx", "38%");
  g.setAttribute("cy", "30%");
  g.setAttribute("r", "88%");

  const s0 = document.createElementNS(NS, "stop");
  s0.setAttribute("offset", "0%");
  s0.classList.add("svgStop", "svgStop--spec0");
  s0.setAttribute("stop-opacity", "0.55");

  const s1 = document.createElementNS(NS, "stop");
  s1.setAttribute("offset", "20%");
  s1.setAttribute("stop-color", baseHex);
  s1.setAttribute("stop-opacity", "1");

  const s2 = document.createElementNS(NS, "stop");
  s2.setAttribute("offset", "70%");
  s2.setAttribute("stop-color", baseHex);
  s2.setAttribute("stop-opacity", "0.80");

  const s3 = document.createElementNS(NS, "stop");
  s3.setAttribute("offset", "100%");
  s3.setAttribute("stop-color", "#000000");
  s3.setAttribute("stop-opacity", "0.18");

  g.appendChild(s0);
  g.appendChild(s1);
  g.appendChild(s2);
  g.appendChild(s3);
  return g;
}

function makeSpecHighlight(NS){
  const g = document.createElementNS(NS, "radialGradient");
  g.id = "spec";
  g.classList.add("svgGradient", "svgGradient--spec");

  const s0 = document.createElementNS(NS, "stop");
  s0.setAttribute("offset", "0%");
  s0.setAttribute("stop-color", "rgba(255,255,255,0.55)");

  const s1 = document.createElementNS(NS, "stop");
  s1.setAttribute("offset", "40%");
  s1.classList.add("svgStop", "svgStop--spec1");

  const s2 = document.createElementNS(NS, "stop");
  s2.setAttribute("offset", "100%");
  s2.classList.add("svgStop", "svgStop--spec2");

  g.appendChild(s0);
  g.appendChild(s1);
  g.appendChild(s2);
  return g;
}

function donutSegmentPath(cx, cy, rOuter, rInner, a0, a1){
  const p0 = polar(cx, cy, rOuter, a0);
  const p1 = polar(cx, cy, rOuter, a1);
  const p2 = polar(cx, cy, rInner, a1);
  const p3 = polar(cx, cy, rInner, a0);

  const large = (a1 - a0) > Math.PI ? 1 : 0;

  return [
    `M ${p0.x} ${p0.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${p3.x} ${p3.y}`,
    "Z"
  ].join(" ");
}

function polar(cx, cy, r, a){
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}