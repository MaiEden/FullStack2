"use strict";

/* =========================
   Elements
========================= */
const board = document.getElementById("board");
const stack = document.getElementById("stack");

const movesEl = document.getElementById("moves");
const matchesEl = document.getElementById("matches");

const hudDifficulty = document.getElementById("hudDifficulty");
const hudRound = document.getElementById("hudRound");
const hudBest = document.getElementById("hudBest");

const btnStart = document.getElementById("btnStart");
const btnRestart = document.getElementById("btnRestart");
const toastEl = document.getElementById("toast");

/* =========================
   Config
========================= */
const EMOJIS = ["🚀","🛸","🌌","⚡","🎮","👾","🧠","💎","🔮","🔥","🛰️","🪐"];

const LEVEL_ORDER = ["easy", "medium", "hard"];

const LEVELS = {
  easy:   { pairs: 4, cols: 4 },
  medium: { pairs: 6, cols: 4 },
  hard:   { pairs: 8, cols: 4 }
};

/* =========================
   State
========================= */
let firstCard = null;
let secondCard = null;
let lock = false;

let moves = 0;
let matches = 0;
let totalPairs = 0;

let stackOffset = 0;

let started = false;
let levelIndex = 0;
let round = 1;

const bestMoves = {
  easy: null,
  medium: null,
  hard: null
};

/* =========================
   Storage helpers
========================= */
function getCurrentUser() {
  const session = StorageAPI.getSession();
  if (!session) return null;

  const users = StorageAPI.getUsers();
  return users.find(u => u.id === session.userId) || null;
}

function getUserLevelIndex() {
  const user = getCurrentUser();
  if (!user) return 0;

  if (!user.stats.memoryLevel) {
    user.stats.memoryLevel = "easy";
    StorageAPI.setUsers(StorageAPI.getUsers());
  }

  const idx = LEVEL_ORDER.indexOf(user.stats.memoryLevel);
  return idx >= 0 ? idx : 0;
}

function saveUserLevel(level) {
  const users = StorageAPI.getUsers();
  const session = StorageAPI.getSession();
  if (!session) return;

  const me = users.find(u => u.id === session.userId);
  if (!me) return;

  me.stats.memoryLevel = level;
  me.stats.lastPlayed = new Date().toISOString();
  StorageAPI.setUsers(users);
}

/* =========================
   Init
========================= */
levelIndex = getUserLevelIndex();
round = levelIndex + 1;
updateHud();

btnStart.addEventListener("click", () => {
  started = true;
  btnStart.disabled = true;
  btnRestart.disabled = false;
  startGame();
});

btnRestart.addEventListener("click", () => {
  if (!started) return;
  startGame();
});

/* =========================
   Game Flow
========================= */
function startGame() {
  resetState();

  const level = LEVEL_ORDER[levelIndex];
  const cfg = LEVELS[level];
  totalPairs = cfg.pairs;

  hudDifficulty.textContent = capitalize(level);
  hudRound.textContent = String(round);

  const symbols = shuffle([
    ...EMOJIS.slice(0, totalPairs),
    ...EMOJIS.slice(0, totalPairs)
  ]);

  board.style.gridTemplateColumns = `repeat(${cfg.cols}, 80px)`;

  symbols.forEach(symbol => {
    const card = document.createElement("div");
    card.className = "card-tile";
    card.dataset.symbol = symbol;

    card.innerHTML = `
      <div class="card-inner">
        <div class="card-face card-front">❓</div>
        <div class="card-face card-back">${symbol}</div>
      </div>
    `;

    card.addEventListener("click", () => reveal(card));
    board.appendChild(card);

    // entrance animation
    card.animate(
      [
        { transform: "translateY(10px)", opacity: 0 },
        { transform: "translateY(0)", opacity: 1 }
      ],
      { duration: 200, easing: "ease-out" }
    );
  });
}

/* =========================
   Gameplay
========================= */
function reveal(card) {
  if (!started || lock) return;
  if (card.classList.contains("revealed")) return;

  card.classList.add("revealed");
  flip(card);

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  lock = true;

  moves++;
  movesEl.textContent = moves;

  setTimeout(checkMatch, 500);
}

function checkMatch() {
  const isMatch =
    firstCard.dataset.symbol === secondCard.dataset.symbol;

  if (isMatch) {
    handleMatch(firstCard, secondCard);
    matches++;
    matchesEl.textContent = matches;

    if (matches === totalPairs) {
      finishLevel();
      return;
    }

    resetPick();
    lock = false;
  } else {
    shake(firstCard);
    shake(secondCard);

    setTimeout(() => {
      firstCard.classList.remove("revealed");
      secondCard.classList.remove("revealed");
      resetPick();
      lock = false;
    }, 500);
  }
}

/* =========================
   Level Finish
========================= */
function finishLevel() {
  lock = true;

  const level = LEVEL_ORDER[levelIndex];
  if (bestMoves[level] == null || moves < bestMoves[level]) {
    bestMoves[level] = moves;
    hudBest.textContent = moves;
  }

  toast(`${capitalize(level)} completed!`);

  setTimeout(() => {
    levelIndex++;

    if (levelIndex >= LEVEL_ORDER.length) {
      toast("You finished all levels! 🏆");
      btnStart.disabled = false;
      return;
    }

    const nextLevel = LEVEL_ORDER[levelIndex];
    saveUserLevel(nextLevel);

    round = levelIndex + 1;
    startGame();
    lock = false;
  }, 900);
}

/* =========================
   Helpers
========================= */
function handleMatch(c1, c2) {
  [c1, c2].forEach(card => {
    const clone = card.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.top = `${stackOffset}px`;
    clone.style.left = `${stackOffset}px`;
    stack.appendChild(clone);

    clone.animate(
      [
        { transform: "scale(0.9)", opacity: 0 },
        { transform: "scale(1)", opacity: 1 }
      ],
      { duration: 200 }
    );
  });

  stackOffset += 6;
}

function resetPick() {
  firstCard = null;
  secondCard = null;
}

function resetState() {
  board.innerHTML = "";
  stack.innerHTML = "";
  stackOffset = 0;
  moves = 0;
  matches = 0;
  lock = false;

  movesEl.textContent = "0";
  matchesEl.textContent = "0";
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function flip(el) {
  el.animate(
    [
      { transform: "rotateY(0deg)" },
      { transform: "rotateY(90deg)" },
      { transform: "rotateY(0deg)" }
    ],
    { duration: 260, easing: "ease-in-out" }
  );
}

function shake(el) {
  el.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(0)" }
    ],
    { duration: 200 }
  );
}

function toast(msg) {
  toastEl.hidden = false;
  toastEl.textContent = msg;

  setTimeout(() => {
    toastEl.hidden = true;
  }, 1200);
}

function updateHud() {
  const level = LEVEL_ORDER[levelIndex];
  hudDifficulty.textContent = capitalize(level);
  hudRound.textContent = String(round);
  hudBest.textContent = "—";
}
