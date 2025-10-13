// public/apps/puzzles/js/gameLoader.js - CARD SELECTOR VERSION

import * as Renderer from './flowRenderer.js';
import * as DslParser from './dslParser.js';
import { highlightNextSlot, clearAllHighlights } from './puzzleGuide.js';

// ------------------- DOM ELEMENTS -------------------
const gridContainer = document.getElementById('grid-container');
const gameCardsContainer = document.getElementById('game-cards'); // new container for cards
const gameInfo = document.getElementById('game-info');

window.currentGameConfig = null;
let lastCorrectElementId = 0;
let currentPuzzleDSL = '';

// ------------------- UTILS -------------------
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ------------------- AVAILABLE GAMES -------------------
const AVAILABLE_GAMES = [
  { fileName: 'state_change.dsl', displayName: 'State Change' },
  { fileName: 'view_state.dsl', displayName: 'View Change' },
  { fileName: 'automation.dsl', displayName: 'Automation' },
  { fileName: 'translation.dsl', displayName: 'Translation' },
  { fileName: 'cappuccino.dsl', displayName: 'Cappuccino Puzzle' },
  { fileName: 'espreso_with_alert.dsl', displayName: 'Espresso with an alert' },
];

// ------------------- BUILD CARD UI -------------------
function renderGameCards() {
  if (!gameCardsContainer) {
    console.error('[GameLoader] Missing #game-cards container');
    return;
  }
  gameCardsContainer.innerHTML = '';
  AVAILABLE_GAMES.forEach((game) => {
    const card = document.createElement('button');
    card.className = 'game-card';
    card.type = 'button';
    card.textContent = game.displayName;
    card.dataset.fileName = game.fileName;

    card.addEventListener('click', () => {
      document.querySelectorAll('.game-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      loadGame(game.fileName);
      // if (gameInfo) gameInfo.textContent = `Loaded: ${game.displayName}`;
    });

    gameCardsContainer.appendChild(card);
  });
}

// ------------------- MAIN LOGIC -------------------
function isTestMode() {
  const path = window.location.pathname.toLowerCase();
  return path.endsWith('index.html') || path.endsWith('/');
}

async function loadGame(dslFileName) {
  if (!dslFileName) return;
  console.log(`[GameLoader] Attempting to load DSL: ${dslFileName}`);

  try {
    const dslPath = `./games/${dslFileName}`;
    const response = await fetch(dslPath);
    if (!response.ok) throw new Error(`Failed to load ${dslFileName}: ${response.statusText}.`);
    const dslContent = await response.text();
    currentPuzzleDSL = dslContent;

    const gameConfig = structureGameConfig(dslContent);

    if (gameConfig.errors.length > 0) {
      console.error('[GameLoader] DSL Parsing Errors:', gameConfig.errors);
      alert(`Failed to load game: ${gameConfig.errors.length} parsing errors. See console.`);
      return;
    }

    window.currentGameConfig = gameConfig;
    console.log(
      `[GameLoader] Game config loaded successfully. Columns: ${gameConfig.columns}, Pieces: ${gameConfig.availablePieces.length}`
    );

    Renderer.resetState();
    lastCorrectElementId = 0;
    clearAllHighlights();

    Renderer.createGrid(gridContainer, gameConfig.columns);

    const pieceTray = document.getElementById('piece-tray');
    const shuffledPieces = shuffleArray([...gameConfig.availablePieces]);
    Renderer.renderAvailablePieces(pieceTray, shuffledPieces);

    if (isTestMode()) {
      Renderer.setConnections(gameConfig.solutionConnections);
    } else {
      Renderer.setConnections([]);
    }

    const svgElement = document.getElementById('flow-svg');
    if (svgElement) Renderer.renderArrows(svgElement);
    else console.error('[GameLoader] CRITICAL ERROR: SVG element #flow-svg not found during load!');

    highlightNextSlot(currentPuzzleDSL, lastCorrectElementId);
  } catch (error) {
    console.error(`[GameLoader] Error loading game: ${dslFileName}`, error);
  }
}

// ------------------- DSL PARSING -------------------
function structureGameConfig(dslContent) {
  console.log('[GameLoader] --- Raw DSL ---\n', dslContent);

  const { items, rawFlows, errors } = DslParser.parseDSL(dslContent);
  console.log('[GameLoader] --- Parsed Items ---', items);
  console.log('[GameLoader] --- Raw Flows ---', rawFlows);
  console.log('[GameLoader] --- Errors ---', errors);

  const { connections } = DslParser.resolveConnections(items, rawFlows);
  let maxColumn = 0;
  items.forEach((item) => {
    if (item.c > maxColumn) maxColumn = item.c;
  });

  const availablePieces = items.map((item, index) => ({
    id: `p${index}`,
    type: item.type,
    name: item.name,
  }));

  const solutionMap = {};
  items.forEach((item) => {
    solutionMap[`${item.r}_${item.c}`] = {
      type: item.type,
      name: item.name,
      dslId: item.id,
    };
  });

  return {
    columns: maxColumn > 0 ? maxColumn : 1,
    availablePieces,
    solutionConnections: connections,
    solutionMap,
    errors,
    dslContent,
    rawFlows,
  };
}

// ------------------- STATE CHECK -------------------
window.checkPuzzleState = function () {
  const currentPieces = Renderer.getPieces();
  if (!window.currentGameConfig) return;

  const solutionMap = window.currentGameConfig.solutionMap;
  const rawFlows = window.currentGameConfig.rawFlows;
  const requiredPlacements = Object.keys(solutionMap).length;
  let correctPlacements = 0;
  let highestCorrectDslId = 0;

  console.log('--- checkPuzzleState START ---');

  const correctPlacementKeys = {};
  const itemsForParser = [];

  for (const key in currentPieces) {
    const placedPiece = currentPieces[key];
    const requiredPiece = solutionMap[key];
    if (requiredPiece && placedPiece.type === requiredPiece.type && placedPiece.name === requiredPiece.name) {
      correctPlacements++;
      correctPlacementKeys[key] = true;
      if (requiredPiece.dslId > highestCorrectDslId) highestCorrectDslId = requiredPiece.dslId;

      const [r, c] = key.split('_').map(Number);
      itemsForParser.push({
        id: requiredPiece.dslId,
        type: placedPiece.type,
        name: placedPiece.name,
        c: c,
        r: r,
        conn: null,
      });
    }
  }

  lastCorrectElementId = highestCorrectDslId;

  // --- PATCH: Force back-flow / dashed segments ---
  const resolvedConnections = DslParser.resolveConnections(itemsForParser, rawFlows);
  resolvedConnections.connections.forEach((conn) => {
    if (conn.style === 'dashed') {
      conn.startSegment = 'left';
      conn.endSegment = 'bottom';
    }
  });

  Renderer.setConnections(resolvedConnections.connections);
  const svgElement = document.getElementById('flow-svg');
  if (svgElement) Renderer.renderArrows(svgElement);

  if (correctPlacements === requiredPlacements && Object.keys(currentPieces).length === requiredPlacements) {
    console.log('PUZZLE SOLVED! 🎉');
    clearAllHighlights();
    setTimeout(() => alert('Congratulations! Puzzle Solved!'), 100);
  } else {
    highlightNextSlot(window.currentGameConfig.dslContent, lastCorrectElementId);
    console.log(`[State] Puzzle state: ${Object.keys(currentPieces).length} placed. ${correctPlacements}/${requiredPlacements} correct.`);
  }

  console.log('--- checkPuzzleState END ---');
};

// ------------------- INIT -------------------
document.addEventListener('DOMContentLoaded', () => {
  renderGameCards();
});
