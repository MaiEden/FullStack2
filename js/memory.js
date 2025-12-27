"use strict";

// DOM Elements
const board = document.getElementById("board");   // Game board (grid of cards)
const stack = document.getElementById("stack");   // Side stack for matched cards

const movesEl = document.getElementById("moves");           // Moves counter
const matchesEl = document.getElementById("matches");       // Matches counter
const difficultyLabel = document.getElementById("difficultyLabel"); // Difficulty text

// Configuration
const EMOJIS = [
  "🚀","🛸","🌌","⚡","🎮","👾","🧠","💎","🔮","🔥","🛰️","🪐"
];

// Order of difficulty progression
const LEVEL_ORDER = ["easy", "medium", "hard"];

// Game settings per difficulty
const LEVELS = {
  easy:   { pairs: 4, cols: 4 },
  medium: { pairs: 6, cols: 4 },
  hard:   { pairs: 8, cols: 4 }
};

// Game State
let firstCard = null;
let secondCard = null;
let lock = false; // Prevent clicks during animations

let moves = 0; // Number of moves
let matches = 0; // Number of matched pairs
let totalPairs = 0; // Pairs required to finish the level

let levelIndex = 0; // Index in LEVEL_ORDER
let stackCount = 0; // Used to offset stacked cards visually

// Storage Helpers
function getCurrentUser() {
  const session = StorageAPI.getSession();
  if (!session) return null;

  const users = StorageAPI.getUsers();
  return users.find(u => u.id === session.userId) || null;
}

function getUserLevelIndex() {
  const user = getCurrentUser();
  if (!user) return 0;

  // Initialize memory level if missing
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

// Initialization Start
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

  // Create shuffled symbols (pairs duplicated)
  const symbols = shuffle([
    ...EMOJIS.slice(0, totalPairs),
    ...EMOJIS.slice(0, totalPairs)
  ]);

  // Configure grid columns
  board.style.gridTemplateColumns = `repeat(${cfg.cols}, 80px)`;

  // Create card elements
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
   Gameplay Logic
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
   Matched Stack Handling
========================= */
function stackMatchedCards(c1, c2) {
  // Small bounce animation
  [c1, c2].forEach(card => {
    card.animate(
      [
        { transform: "translateY(0)" },
        { transform: "translateY(-12px)" },
        { transform: "translateY(0)" }
      ],
      { duration: 400, easing: "ease-out" }
    );
  });

  setTimeout(() => {
    [c1, c2].forEach(card => {

      // 1. Placeholder keeps board layout intact
      const placeholder = document.createElement("div");
      placeholder.className = "card-tile";
      placeholder.style.width = card.offsetWidth + "px";
      placeholder.style.height = card.offsetHeight + "px";

      board.replaceChild(placeholder, card);

      // 2. Move actual card to the side stack
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

// Level Completion
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
   Helper Functions
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