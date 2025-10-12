// public/apps/puzzles/js/gameLoader.js

import * as Renderer from './flowRenderer.js'; 
import * as DslParser from './dslParser.js'; 

const gameSelector = document.getElementById('game-selector');
const loadGameBtn = document.getElementById('load-game-btn');
const gridContainer = document.getElementById('grid-container');

// Global object to store the current game's solution data and tracking current placement
window.currentGameConfig = null;

// --- 1. HARDCODED GAME LIST ---
const AVAILABLE_GAMES = [
    { fileName: 'simple.dsl', displayName: 'Simple Puzzle' },
    { fileName: 'doable.dsl', displayName: 'Doable Puzzle' },
    // Add other games here as you create them
];

function populateGameList() {
    AVAILABLE_GAMES.forEach(game => {
        const option = document.createElement('option');
        option.value = game.fileName;
        option.textContent = game.displayName;
        gameSelector.appendChild(option);
    });

    if (AVAILABLE_GAMES.length > 0) {
        loadGame(AVAILABLE_GAMES[0].fileName);
    }
}


// --- 2. Load Selected Game ---
async function loadGame(dslFileName) {
    if (!dslFileName) return;

    try {
        const dslPath = `./games/${dslFileName}`; 
        const response = await fetch(dslPath);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${dslFileName}: ${response.statusText}.`);
        }
        
        const dslContent = await response.text();

        // --- DSL Structuring ---
        const gameConfig = structureGameConfig(dslContent); 

        if (gameConfig.errors.length > 0) {
             console.error("DSL Parsing Errors:", gameConfig.errors);
             alert(`Failed to load game: ${gameConfig.errors.length} parsing errors. See console.`);
             return;
        }
        
        // Store config globally for puzzle checking
        window.currentGameConfig = gameConfig;

        // 1. Reset state
        Renderer.resetState();

        // 2. Create the grid based on the dynamically calculated columns
        Renderer.createGrid(gridContainer, gameConfig.columns);
        
        // 3. Render the available pieces in the tray
        const pieceTray = document.getElementById('piece-tray');
        Renderer.renderAvailablePieces(pieceTray, gameConfig.availablePieces);
        
        // 4. Attach drag listeners to the newly rendered pieces in the tray
        // We assume Renderer.renderAvailablePieces implicitly calls setupDragListeners()
        // If not, you need to add the setup function to flowRenderer.js and call it here.
        
        // 5. Clear arrows display
        Renderer.setConnections([]);
        Renderer.renderArrows(document.getElementById('arrow-canvas'));


    } catch (error) {
        console.error(`Error loading game: ${dslFileName}`, error);
    }
}

// --- 3. DSL Structuring Function ---
function structureGameConfig(dslContent) {
    // 1. Parse the text into items
    const { items, errors } = DslParser.parseDSL(dslContent);
    // 2. Resolve connections based on the items' order and structure
    const { connections } = DslParser.resolveConnections(items);
    
    // 3. Calculate required columns dynamically
    let maxColumn = 0;
    items.forEach(item => {
        if (item.c > maxColumn) {
            maxColumn = item.c;
        }
    });

    // 4. Create the list of pieces available to the player
    const availablePieces = items.map((item, index) => ({
        id: `p${index}`,
        type: item.type,
        name: item.name
    }));

    // 5. Create a solution map for checking puzzle success: "R_C": { type: "...", name: "..." }
    const solutionMap = {};
    items.forEach(item => {
        // Slot key is "R_C"
        solutionMap[`${item.r}_${item.c}`] = { type: item.type, name: item.name };
    });

    const config = {
        // We use maxColumn, but ensure it's at least 1
        columns: maxColumn > 0 ? maxColumn : 1, 
        availablePieces: availablePieces,
        solutionConnections: connections,
        solutionMap: solutionMap,
        errors: errors
    };

    console.log("Parsed Game Config:", config);
    return config;
}

// --- 4. Event Listeners and Initialization ---
loadGameBtn.addEventListener('click', () => {
    const selectedFile = gameSelector.value;
    loadGame(selectedFile);
});

// Run on page load
populateGameList();


// --- 5. PUZZLE SOLVER STUB (Called from flowRenderer's D&D listeners) ---
/**
 * This function checks the current piece placement against the solution map,
 * updates connections if correct, and announces success.
 */
window.checkPuzzleState = function() {
    const currentPieces = Renderer.getPieces();
    const solutionMap = window.currentGameConfig.solutionMap;
    const solutionConnections = window.currentGameConfig.solutionConnections;
    
    const requiredPlacements = Object.keys(solutionMap).length;
    let correctPlacements = 0;

    // Check every currently placed piece against the solution
    for (const key in currentPieces) {
        const placedPiece = currentPieces[key];
        const requiredPiece = solutionMap[key];

        if (requiredPiece && placedPiece.type === requiredPiece.type) {
            // NOTE: We are only checking type and position, not name.
            correctPlacements++;
        }
    }

    if (correctPlacements === requiredPlacements && 
        Object.keys(currentPieces).length === requiredPlacements) {
        
        // Puzzle is solved!
        console.log("PUZZLE SOLVED!");
        alert("Congratulations! Puzzle Solved!");

        // Render the solution connections
        Renderer.setConnections(solutionConnections);
    } else {
        // Puzzle is not solved or is incomplete
        console.log(`Placed pieces: ${Object.keys(currentPieces).length}. Correctly placed pieces: ${correctPlacements}/${requiredPlacements}.`);
        
        // Clear connections while incomplete/incorrect
        Renderer.setConnections([]);
    }

    // Always re-render arrows to update or clear the display
    Renderer.renderArrows(document.getElementById('arrow-canvas'));
}