// Expose a global reset function for the Bin button
window.resetCurrentGameBoard = function() {
  if (window.currentPuzzleFileName) {
    console.log('[BIN] Clearing localStorage for', window.currentPuzzleFileName);
    localStorage.removeItem('puzzleState:' + window.currentPuzzleFileName);
    if (typeof loadGame === 'function') {
      console.log('[BIN] Calling loadGame for', window.currentPuzzleFileName);
      loadGame(window.currentPuzzleFileName);
    }
  } else {
    alert('No game selected.');
  }
};
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
window.currentPuzzleFileName = '';

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
  { fileName: 'vacances.dsl', description: 'Prende des vacances' },
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
  window.currentPuzzleFileName = dslFileName;
  if (!dslFileName) return;
  console.log(`[GameLoader] Attempting to load DSL: ${dslFileName}`);

  // Clear previous description
  const descElem = document.getElementById('game-description');
  if (descElem) descElem.textContent = '';

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
    // Set game description if available
    if (descElem && gameConfig.description) {
      descElem.textContent = gameConfig.description;
    }
    console.log(
      `[GameLoader] Game config loaded successfully. Columns: ${gameConfig.columns}, Pieces: ${gameConfig.availablePieces.length}`
    );

    // --- Restore state from cache if available ---
  let cached = localStorage.getItem('puzzleState:' + dslFileName);
    let cachedState = null;
    if (cached) {
      try { cachedState = JSON.parse(cached); } catch (e) { cachedState = null; }
    }

    Renderer.resetState();
    lastCorrectElementId = 0;
    clearAllHighlights();

    // Use min/max row/col for grid sizing
    Renderer.createGrid(
      gridContainer,
      gameConfig.maxCol - gameConfig.minCol + 1,
      gameConfig.minRow,
      gameConfig.maxRow,
      gameConfig.minCol
    );
    const pieceTray = document.getElementById('piece-tray');

    if (cachedState && cachedState.board && cachedState.tray) {
      // Restore board
      Object.values(cachedState.board).forEach(p => {
        Renderer.addPiece(p.r, p.c, p.type, p.name, p.id, p.text);
      });
      // Restore tray
      Renderer.renderAvailablePieces(pieceTray, cachedState.tray);
    } else {
      // Default: shuffled tray, empty board
      const shuffledPieces = shuffleArray([...gameConfig.availablePieces]);
      Renderer.renderAvailablePieces(pieceTray, shuffledPieces);
    }

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

  // Compute min/max row/col for grid sizing
  let maxColumn = 0, minColumn = Infinity, minRow = Infinity, maxRow = -Infinity;
  items.forEach((item) => {
    if (item.c > maxColumn) maxColumn = item.c;
    if (item.c < minColumn) minColumn = item.c;
    if (item.r > maxRow) maxRow = item.r;
    if (item.r < minRow) minRow = item.r;
  });
  if (!isFinite(minColumn)) minColumn = 1;
  if (!isFinite(maxColumn)) maxColumn = 1;
  if (!isFinite(minRow)) minRow = 0;
  if (!isFinite(maxRow)) maxRow = 0;

  const availablePieces = items.map((item, index) => ({
    id: `p${index}`,
    type: item.type,
    name: item.name,
    text: item.text || ''
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
    minRow,
    maxRow,
    minCol: minColumn,
    maxCol: maxColumn,
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
    // --- Save state to cache on every move ---
    if (window.currentGameConfig && currentPuzzleFileName) {
      // Get board state
      const board = Renderer.getPieces ? Renderer.getPieces() : {};
      // Get tray state
      const trayInner = document.getElementById('tray-inner');
      let tray = [];
      if (trayInner) {
        tray = Array.from(trayInner.children).map(el => ({
          id: el.dataset.pieceId,
          type: el.dataset.type,
          name: el.dataset.name,
          text: el.querySelector('.piece-subtext')?.textContent || ''
        }));
      }
      // Save to localStorage
      localStorage.setItem('puzzleState:' + currentPuzzleFileName, JSON.stringify({ board, tray }));
    }
    const currentPieces = Renderer.getPieces();
    if (!window.currentGameConfig) return;

    const solutionMap = window.currentGameConfig.solutionMap;
    const rawFlows = window.currentGameConfig.rawFlows;

    console.log('--- checkPuzzleState START ---');

  // 1. Determine which pieces are correctly placed
  const itemsForParser = [];
  const placedDslIds = new Set();
  let correctPieceCount = 0;
  let totalPieceCount = 0;
  for (const key in solutionMap) {
    const requiredPiece = solutionMap[key];
    const placedPiece = currentPieces[key];
    if (placedPiece) totalPieceCount++;
    if (placedPiece && placedPiece.type === requiredPiece.type && placedPiece.name === requiredPiece.name) {
      placedDslIds.add(requiredPiece.dslId);
      correctPieceCount++;
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
  console.log(`[GameLoader:State] Found ${correctPieceCount} correctly placed pieces out of ${Object.keys(solutionMap).length}.`);

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

    if (correctPieceCount === Object.keys(solutionMap).length) {
        // All pieces are correctly placed: WIN!
        clearAllHighlights();
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
    } else if (missingDslIds.length > 0) {
        // highlight first missing piece
        highlightNextSlot(window.currentGameConfig.dslContent, missingDslIds[0]);
    } else {
        // All slots are filled but not correct: allow continued play, no popup
        clearAllHighlights();
        console.log('All slots filled, but not correct. Keep trying!');
    }

    console.log('--- checkPuzzleState END ---');
};


// ------------------- INIT -------------------
document.addEventListener('DOMContentLoaded', () => {
  // --- HELP BUTTON LOGIC ---
  const helpBtn = document.getElementById('help-btn');
  let helpActive = false;
  function clearMisplacedHighlights() {
    document.querySelectorAll('.flow-piece.misplaced-piece').forEach(el => el.classList.remove('misplaced-piece'));
  }
  function highlightMisplacedCards() {
    if (!window.currentGameConfig) return;
    const board = Renderer.getPieces ? Renderer.getPieces() : {};
    const solutionMap = window.currentGameConfig.solutionMap;
    for (const key in board) {
      const placed = board[key];
      const required = solutionMap[key];
      const slot = document.getElementById(key);
      if (!slot) continue;
      const pieceEl = slot.querySelector('.flow-piece');
      if (!pieceEl) continue;
      // Highlight if type or name does not match
      if (!required || placed.type !== required.type || placed.name !== required.name) {
        pieceEl.classList.add('misplaced-piece');
      } else {
        pieceEl.classList.remove('misplaced-piece');
      }
    }
  }
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      helpActive = !helpActive;
      if (helpActive) {
        highlightMisplacedCards();
        helpBtn.classList.add('active');
      } else {
        clearMisplacedHighlights();
        helpBtn.classList.remove('active');
      }
    });
    helpBtn.addEventListener('mouseleave', () => {
      if (helpActive) {
        clearMisplacedHighlights();
        helpBtn.classList.remove('active');
        helpActive = false;
      }
    });
  }
  // Clear highlights on board change or new game
  const origCheckPuzzleState = window.checkPuzzleState;
  window.checkPuzzleState = function(...args) {
    if (helpActive) highlightMisplacedCards();
    else clearMisplacedHighlights();
    return origCheckPuzzleState.apply(this, args);
  };
  renderGameCards();
});
