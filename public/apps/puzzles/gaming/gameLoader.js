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
const customGameDropdown = document.getElementById('custom-game-dropdown');
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


// --- Custom Dropdown Implementation ---
async function renderGameCardsDropdown() {
  if (!customGameDropdown) return;
  customGameDropdown.innerHTML = '';

  // Fetch all DSLs to get level and description
  const gamesWithMeta = await Promise.all(
    AVAILABLE_GAMES.map(async (game) => {
      try {
        const dsl = await fetch(`../games/${game.fileName}`).then(r => r.text());
        const { level, description } = DslParser.parseDSL(dsl);
        return { ...game, level: level || 1, description: description || game.description };
      } catch {
        return { ...game, level: 1, description: game.description };
      }
    })
  );

  // Group by level
  const levels = {};
  gamesWithMeta.forEach(g => {
    if (!levels[g.level]) levels[g.level] = [];
    levels[g.level].push(g);
  });


  // Build custom dropdown structure
  const selectedDiv = document.createElement('div');
  selectedDiv.className = 'custom-dropdown-selected';
  selectedDiv.tabIndex = 0;
  selectedDiv.textContent = 'Select a Puzzle';
  customGameDropdown.appendChild(selectedDiv);

  const listDiv = document.createElement('div');
  listDiv.className = 'custom-dropdown-list';
  listDiv.style.display = 'none';

  // For tracking selected
  let selectedValue = null;

  Object.keys(levels).sort((a,b)=>a-b).forEach(level => {
    // Level title row
    const levelRow = document.createElement('div');
    levelRow.className = `custom-dropdown-group level-${level}`;
    levelRow.textContent = `Level ${level}`;
    listDiv.appendChild(levelRow);

    // Tags row (flex wrap)
    const tagsRow = document.createElement('div');
    tagsRow.className = 'custom-dropdown-tags-row';
    tagsRow.style.display = 'flex';
    tagsRow.style.flexWrap = 'wrap';
    tagsRow.style.gap = '0.3em';
    tagsRow.style.margin = '0.2em 0 0.7em 0';

    levels[level].forEach(game => {
      let gameName = game.name || game.fileName.replace(/\.dsl$/i, '');
      const itemDiv = document.createElement('button');
      itemDiv.type = 'button';
      itemDiv.className = `custom-dropdown-item tag-level-${level}`;
      itemDiv.textContent = gameName;
      itemDiv.dataset.value = game.fileName;
      itemDiv.style.height = '2.2em';
      itemDiv.addEventListener('click', () => {
        selectedValue = game.fileName;
        selectedDiv.textContent = gameName;
        listDiv.style.display = 'none';
        customGameDropdown.classList.remove('open');
        loadGame(game.fileName);
        // Mark selected
        listDiv.querySelectorAll('.custom-dropdown-item').forEach(btn => btn.classList.remove('selected'));
        itemDiv.classList.add('selected');
      });
      tagsRow.appendChild(itemDiv);
    });
    listDiv.appendChild(tagsRow);
  });
  customGameDropdown.appendChild(listDiv);

  // Dropdown open/close logic
  function openDropdown() {
    listDiv.style.display = 'block';
    customGameDropdown.classList.add('open');
  }
  function closeDropdown() {
    listDiv.style.display = 'none';
    customGameDropdown.classList.remove('open');
  }
  selectedDiv.addEventListener('click', (e) => {
    e.stopPropagation();
    if (listDiv.style.display === 'block') closeDropdown();
    else openDropdown();
  });
  selectedDiv.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (listDiv.style.display === 'block') closeDropdown();
      else openDropdown();
    }
  });
  document.addEventListener('click', (e) => {
    if (!customGameDropdown.contains(e.target)) closeDropdown();
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
  if (descElem) {
    descElem.textContent = '';
    descElem.removeAttribute('title');
  }

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
      descElem.title = gameConfig.description;
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

    let restoredArrows = false;
    if (cachedState && cachedState.board && cachedState.tray) {
      // Restore board
      Object.values(cachedState.board).forEach(p => {
        Renderer.addPiece(p.r, p.c, p.type, p.name, p.id, p.text);
      });
      // Restore tray
      Renderer.renderAvailablePieces(pieceTray, cachedState.tray);
      // Recompute arrows/connections for restored board using DSL rules
      setTimeout(() => {
        const currentPieces = Renderer.getPieces();
        const solutionMap = gameConfig.solutionMap;
        const rawFlows = gameConfig.rawFlows;
        const itemsForParser = [];
        for (const key in solutionMap) {
          const requiredPiece = solutionMap[key];
          const placedPiece = currentPieces[key];
          if (placedPiece && placedPiece.type === requiredPiece.type && placedPiece.name === requiredPiece.name) {
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
        console.log('[Restore] itemsForParser:', itemsForParser);
        console.log('[Restore] rawFlows:', rawFlows);
        const resolvedConnections = DslParser.resolveConnections(itemsForParser, rawFlows);
        console.log('[Restore] resolvedConnections:', resolvedConnections);
        Renderer.setConnections(resolvedConnections.connections);
        const svgElement = document.getElementById('flow-svg');
        if (svgElement) Renderer.renderArrows(svgElement);
      }, 0);
    } else {
      // Default: shuffled tray, empty board
      const shuffledPieces = shuffleArray([...gameConfig.availablePieces]);
      Renderer.renderAvailablePieces(pieceTray, shuffledPieces);
    }

    if (isTestMode()) {
      Renderer.setConnections(gameConfig.solutionConnections);
    } else if (!restoredArrows) {
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
      // Get arrows/connections
      const arrows = Renderer.getConnections ? Renderer.getConnections() : [];
      // Save to localStorage
      localStorage.setItem('puzzleState:' + currentPuzzleFileName, JSON.stringify({ board, tray, arrows }));
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
  renderGameCardsDropdown();
});
