// public/apps/puzzles/js/gameLoader.js - CARD SELECTOR VERSION

import * as Renderer from '../flowRenderer/flowRenderer.js';
import * as DslParser from '../dslParser/dslParser.js';
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
  { fileName: 'state_change.dsl', description: 'State Change' },
  { fileName: 'view_state.dsl', description: 'View Change' },
  { fileName: 'automation.dsl', description: 'Automation' },
  { fileName: 'translation.dsl', description: 'Translation' },
  { fileName: 'cappuccino.dsl', description: 'Cappuccino Puzzle' },
  { fileName: 'espresso_with_alert.dsl', description: 'Espresso with an alert' },
  { fileName: 'notification1.dsl', description: 'Implicit Notification' },
  { fileName: 'notification2.dsl', description: 'Explicit Notification' },
  { fileName: 'ruptureDeStock.dsl', description: 'Rupture de stock' },
];

// ------------------- BUILD CARD UI -------------------
function renderGameCards() {
  if (!gameCardsContainer) return;
  gameCardsContainer.innerHTML = '';

  AVAILABLE_GAMES.forEach((game) => {
    const card = document.createElement('button');
    card.className = 'game-card';
    card.type = 'button';
    card.textContent = game.description;
    card.dataset.fileName = game.fileName;

        // --- Add tooltip with description if available ---
if (window.currentGameConfig && window.currentGameConfig.description) {
  card.title = window.currentGameConfig.description;
} else {
  card.title = ''; // fallback
}

    // Fetch DSL to get level & description
    fetch(`../games/${game.fileName}`)
      .then(r => r.text())
      .then(dsl => {
        const { level, description } = DslParser.parseDSL(dsl);

        // Color by level
        let bgColor = '#0078ff'; // default blue
        if (level === 2) bgColor = '#28a745'; // green
        else if (level === 3) bgColor = '#ffc107'; // yellow
        else if (level >= 4) bgColor = '#6f42c1'; // purple

        card.style.backgroundColor = bgColor;
        card.style.color = 'white';
        card.title = description || ''; // show description on hover
      })
      .catch(err => console.warn('[GameLoader] Failed to parse DSL for card tooltip', err));

    card.addEventListener('click', () => {
      document.querySelectorAll('.game-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      loadGame(game.fileName);
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
    const dslPath = `../games/${dslFileName}`;
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

  const { items, rawFlows, errors, description, level } = DslParser.parseDSL(dslContent);
  const { connections } = DslParser.resolveConnections(items, rawFlows);

  let maxColumn = 0;
  items.forEach((item) => { if (item.c > maxColumn) maxColumn = item.c; });

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
    description,  // <-- pass along
    level,        // <-- pass along
  };
}


// ------------------- STATE CHECK -------------------
// public/apps/puzzles/js/gameLoader.js - CARD SELECTOR VERSION

// ... (omitted code for brevity) ...


// ------------------- STATE CHECK -------------------
window.checkPuzzleState = function () {
    const currentPieces = Renderer.getPieces();
    if (!window.currentGameConfig) return;

    const solutionMap = window.currentGameConfig.solutionMap;
    const rawFlows = window.currentGameConfig.rawFlows;

    console.log('--- checkPuzzleState START ---');

    // 1. Determine which pieces are correctly placed
    const itemsForParser = [];
    const placedDslIds = new Set();
    
    // LOG: Check how many pieces are considered correctly placed
    console.log(`[GameLoader:State] Checking ${Object.keys(currentPieces).length} placed pieces.`);
    let correctPieceCount = 0;

    for (const key in solutionMap) {
        const requiredPiece = solutionMap[key];
        const placedPiece = currentPieces[key];

        if (placedPiece && placedPiece.type === requiredPiece.type && placedPiece.name === requiredPiece.name) {
            placedDslIds.add(requiredPiece.dslId);
            correctPieceCount++; // INCREMENT LOG

            const [r, c] = key.split('_').map(Number);
            itemsForParser.push({
                id: requiredPiece.dslId,
                type: placedPiece.type,
                name: placedPiece.name,
                c,
                r,
                conn: null,
            });
        }
    }
    console.log(`[GameLoader:State] Found ${correctPieceCount} correctly placed pieces.`); // LOG

    // 2. Resolve connections (including dashed/back-flows)
    const resolvedConnections = DslParser.resolveConnections(itemsForParser, rawFlows);
    
    // 💥 NEW LOG: Check the actual connection count
    console.log(`[GameLoader:State] DslParser resolved ${resolvedConnections.connections.length} connections.`); 
    
    resolvedConnections.connections.forEach(conn => {
        if (conn.style === 'dashed') {
            conn.startSegment = 'left';
            conn.endSegment = 'bottom';
        }
        // NEW LOG: Show resolved connections
        console.log(`[GameLoader:State] Resolved Connection: ${conn.start} -> ${conn.end} (${conn.style || 'solid'})`);
    });

    Renderer.setConnections(resolvedConnections.connections);
    
    // 👇 FIX: Wrap arrow rendering in a setTimeout to wait for DOM layout
    setTimeout(() => {
        const svgElement = document.getElementById('flow-svg');
        if (svgElement) Renderer.renderArrows(svgElement);
    }, 50); // 50ms is usually sufficient for a re-layout

    // 3. Find next missing piece to highlight
    const allDslIds = Object.values(solutionMap).map(p => p.dslId).sort((a, b) => a - b);
    const missingDslIds = allDslIds.filter(id => !placedDslIds.has(id));

    if (missingDslIds.length > 0) {
        // highlight first missing piece
        highlightNextSlot(window.currentGameConfig.dslContent, missingDslIds[0]);
    } else {
        // all pieces placed
        clearAllHighlights();
        console.log('PUZZLE SOLVED! 🎉');
       console.log('PUZZLE SOLVED! 🎉');

        setTimeout(() => {
          const div = document.createElement('div');
          div.innerHTML = `
            <div id="popup">
              <h3>🎉 Congratulations!</h3>
              <p>Puzzle solved successfully!</p>
              <p><strong>Event Modeling Gamification – Thanks for using us!</strong></p>
              <button id="ok-btn">OK</button>
            </div>
          `;
          document.body.appendChild(div);

          document.getElementById('ok-btn').addEventListener('click', () => {
            div.remove();
          });
        }, 100);

    }

    console.log('--- checkPuzzleState END ---');
};


// ------------------- INIT -------------------
document.addEventListener('DOMContentLoaded', () => {
  renderGameCards();
});
