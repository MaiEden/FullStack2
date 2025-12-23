"use strict";

/* =========================
   Elements
========================= */
const board = document.getElementById("board");
const stack = document.getElementById("stack");

const movesEl = document.getElementById("moves");
const matchesEl = document.getElementById("matches");
const difficultyLabel = document.getElementById("difficultyLabel");

/* =========================
   Force stack behavior (JS only)
========================= */
stack.style.position = "relative";
stack.style.minHeight = "160px";

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

let levelIndex = 0;
let stackCount = 0;

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
   Init – AUTO START
========================= */
levelIndex = getUserLevelIndex();
startGame();

/* =========================
   Game Flow
========================= */
function startGame() {
  resetState();

  const level = LEVEL_ORDER[levelIndex];
  const cfg = LEVELS[level];
  totalPairs = cfg.pairs;

  difficultyLabel.textContent = capitalize(level);

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
  });
}

/* =========================
   Gameplay
========================= */
function reveal(card) {
  if (lock) return;
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

  setTimeout(checkMatch, 400);
}

function checkMatch() {
  const isMatch =
    firstCard.dataset.symbol === secondCard.dataset.symbol;

  if (isMatch) {
    stackMatchedCards(firstCard, secondCard);
    matches++;
    matchesEl.textContent = matches;

    resetPick();
    lock = false;

    if (matches === totalPairs) {
      finishLevel();
    }
  } else {
    setTimeout(() => {
      firstCard.classList.remove("revealed");
      secondCard.classList.remove("revealed");
      resetPick();
      lock = false;
    }, 400);
  }
}

/* =========================
   STACK + PLACEHOLDER (KEY FIX)
========================= */
function stackMatchedCards(c1, c2) {
  [c1, c2].forEach(card => {
    card.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(-12px)" },
        { transform: "translateY(0)" }
      ],
      { duration: 220, easing: "ease-out" }
    );
  });

  setTimeout(() => {
    [c1, c2].forEach(card => {
      /* 1️⃣ placeholder שומר מקום בלוח */
      const placeholder = document.createElement("div");
      placeholder.className = "card-tile";
      placeholder.style.width = card.offsetWidth + "px";
      placeholder.style.height = card.offsetHeight + "px";

      board.replaceChild(placeholder, card);

      /* 2️⃣ הקלף האמיתי נערם בצד */
      card.classList.remove("revealed");
      card.style.pointerEvents = "none";
      card.style.position = "absolute";
      card.style.zIndex = 100 + stackCount;
      card.style.transform = "scale(0.85)";
      card.style.top = `${stackCount * 3}px`;
      card.style.left = `${stackCount * 3}px`;

      stack.appendChild(card);
      stackCount++;
    });
  }, 220);
}

/* =========================
   Level Finish
========================= */
function finishLevel() {
  lock = true;

  setTimeout(() => {
    levelIndex++;

    if (levelIndex >= LEVEL_ORDER.length) {
      alert("You finished all levels! 🏆");
      return;
    }

    saveUserLevel(LEVEL_ORDER[levelIndex]);
    startGame();
    lock = false;
  }, 700);
}

/* =========================
   Helpers
========================= */
function resetPick() {
  firstCard = null;
  secondCard = null;
}

function resetState() {
  board.innerHTML = "";
  stack.innerHTML = "";
  moves = 0;
  matches = 0;
  lock = false;
  stackCount = 0;

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
