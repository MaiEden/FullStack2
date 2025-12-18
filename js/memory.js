"use strict";

/* ===== Elements ===== */
const board = document.getElementById("board");
const stack = document.getElementById("stack");
const movesEl = document.getElementById("moves");
const matchesEl = document.getElementById("matches");
const restartBtn = document.getElementById("restart");
const userLevelEl = document.getElementById("userLevel");

/* ===== Game State ===== */
let firstCard = null;
let secondCard = null;
let lock = false;
let moves = 0;
let matches = 0;
let totalPairs = 0;
let stackOffset = 0;
let currentLevel = "easy";

/* ===== Data ===== */
const EMOJIS = ["🚀","🛸","🌌","⚡","🎮","👾","🧠","💎","🔮","🔥"];

const LEVELS = {
  easy: 4,
  medium: 6,
  hard: 8
};

const COLS_BY_LEVEL = {
  easy: 4,
  medium: 4,
  hard: 4
};

/* ===== Entry ===== */
restartBtn.addEventListener("click", () => startGame(currentLevel));

initGame();

/* ===== Init ===== */
function initGame() {
  const session = StorageAPI.getSession();
  if (!session) return;

  const users = StorageAPI.getUsers();
  const me = users.find(u => u.id === session.userId);
  if (!me) return;

  currentLevel = resolveLevel(me.stats.points);
  userLevelEl.textContent = capitalize(currentLevel);

  startGame(currentLevel);
}

/* ===== Difficulty Resolver ===== */
function resolveLevel(points) {
  if (points >= 50) return "hard";
  if (points >= 20) return "medium";
  return "easy";
}

/* ===== Game Flow ===== */
function startGame(level) {
  resetState();

  totalPairs = LEVELS[level];
  const symbols = shuffle([
    ...EMOJIS.slice(0, totalPairs),
    ...EMOJIS.slice(0, totalPairs)
  ]);

  board.style.gridTemplateColumns =
    `repeat(${COLS_BY_LEVEL[level]}, 80px)`;

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

/* ===== Gameplay ===== */
function reveal(card) {
  if (lock ||
      card.classList.contains("revealed") ||
      card.classList.contains("matched") ||
      card.classList.contains("placeholder")) return;

  card.classList.add("revealed");

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  lock = true;

  firstCard.classList.add("lift");
  secondCard.classList.add("lift");

  moves++;
  movesEl.textContent = moves;

  setTimeout(checkMatch, 600);
}

function checkMatch() {
  const isMatch =
    firstCard.dataset.symbol === secondCard.dataset.symbol;

  if (isMatch) {
  handleMatch(firstCard, secondCard);
  matches++;
  matchesEl.textContent = matches;

  if (matches === totalPairs) {
    finishLevel(); // ⬅️ כאן הקסם
    return;
  }
}
 else {
    returnToBoard(firstCard, secondCard);
  }

  setTimeout(() => {
    resetPick();
    lock = false;
  }, 700);
}

/* ===== Behaviors ===== */
function returnToBoard(c1, c2) {
  setTimeout(() => {
    c1.classList.remove("revealed", "lift");
    c2.classList.remove("revealed", "lift");
  }, 400);
}

function handleMatch(c1, c2) {
  [c1, c2].forEach(card => {
    card.classList.add("placeholder");
    card.classList.remove("lift");

    const clone = card.cloneNode(true);
    clone.classList.remove("placeholder");
    clone.classList.add("matched");

    clone.style.position = "absolute";
    clone.style.top = `${stackOffset}px`;
    clone.style.left = `${stackOffset}px`;

    stack.appendChild(clone);
  });

  stackOffset += 6;
}

/* ===== Helpers ===== */
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
  movesEl.textContent = "0";
  matchesEl.textContent = "0";
  resetPick();
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function finishLevel() {
  const session = StorageAPI.getSession();
  if (!session) return;

  const users = StorageAPI.getUsers();
  const me = users.find(u => u.id === session.userId);
  if (!me) return;

  // ניקוד לפי רמה
  let gainedPoints = 10;
  if (currentLevel === "medium") gainedPoints = 15;
  if (currentLevel === "hard") gainedPoints = 20;

  me.stats.points += gainedPoints;
  StorageAPI.setUsers(users);

  // חישוב רמה חדשה
  const newLevel = resolveLevel(me.stats.points);
  userLevelEl.textContent = capitalize(newLevel);

  // מעבר אוטומטי לשלב הבא (חלק!)
  setTimeout(() => {
    currentLevel = newLevel;
    startGame(currentLevel);
  }, 800);
}

