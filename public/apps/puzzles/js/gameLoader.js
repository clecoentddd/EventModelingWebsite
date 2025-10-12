// public/apps/puzzles/js/gameLoader.js

import * as Renderer from './flowRenderer.js'; 
import * as DslParser from './dslParser.js'; 

const gameSelector = document.getElementById('game-selector');
const loadGameBtn = document.getElementById('load-game-btn');
const gridContainer = document.getElementById('grid-container');

// Global object to store the current game's solution data and tracking current placement
window.currentGameConfig = null;

// --- UTILITY: Fisher-Yates shuffle algorithm ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- 1. HARDCODED GAME LIST ---
const AVAILABLE_GAMES = [
    { fileName: 'state_change.dsl', displayName: 'State Change' },
    { fileName: 'view_state.dsl', displayName: 'View Change' },
    { fileName: 'automation.dsl', displayName: 'Automation' },
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

// Helper function to check if the current page is the DSL testing page.
function isTestMode() {
    const path = window.location.pathname.toLowerCase();
    
    // Assumes test pages are `index.html` or run directly from the root `/`
    // and the game page is explicitly named `game.html`.
    return path.endsWith('index.html') || path.endsWith('/'); 
}


// --- 2. Load Selected Game (FIXED SVG ID) ---
async function loadGame(dslFileName) {
    if (!dslFileName) return;
    
    console.log(`[GameLoader] Attempting to load DSL: ${dslFileName}`);

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
            console.error("[GameLoader] DSL Parsing Errors:", gameConfig.errors);
            alert(`Failed to load game: ${gameConfig.errors.length} parsing errors. See console.`);
            return;
        }
        
        // Store config globally for puzzle checking
        window.currentGameConfig = gameConfig;
        
        console.log(`[GameLoader] Game config loaded successfully. Columns: ${gameConfig.columns}, Pieces: ${gameConfig.availablePieces.length}`);

        // 1. Reset state
        Renderer.resetState();

        // 2. Create the grid based on the dynamically calculated columns
        Renderer.createGrid(gridContainer, gameConfig.columns);
        
        // 3. Render the available pieces in the tray
        const pieceTray = document.getElementById('piece-tray');
        
        // **NEW:** Shuffle the pieces before rendering them
        const shuffledPieces = shuffleArray([...gameConfig.availablePieces]);
        
        Renderer.renderAvailablePieces(pieceTray, shuffledPieces);
        
        // 4. CONNECTION DISPLAY LOGIC 
        if (isTestMode()) {
            // TEST MODE (index.html): Display the solution arrows immediately
            console.warn("[GameLoader] 🎨 TEST MODE: Rendering solution connections on load.");
            Renderer.setConnections(gameConfig.solutionConnections);
        } else {
            // GAME MODE (game.html): Start with no arrows
            Renderer.setConnections([]);
        }
        
        // 5. Render the set connections (either solution or empty)
        const svgElement = document.getElementById('flow-svg');
        if (svgElement) {
            // Render the arrows (or lack thereof)
            Renderer.renderArrows(svgElement);
            
            // **NEW:** Show the game content now that the grid/pieces/arrows are fully drawn
            Renderer.showGameContent();

        } else {
            console.error("[GameLoader] CRITICAL ERROR: SVG element #flow-svg not found during load!");
        }


    } catch (error) {
        console.error(`[GameLoader] Error loading game: ${dslFileName}`, error);
    }
}


// --- 3. DSL Structuring Function (UNCHANGED) ---
function structureGameConfig(dslContent) {
    const { items, rawFlows, errors } = DslParser.parseDSL(dslContent);
    const { connections } = DslParser.resolveConnections(items, rawFlows);
    
    let maxColumn = 0;
    items.forEach(item => {
        if (item.c > maxColumn) {
            maxColumn = item.c;
        }
    });

    const availablePieces = items.map((item, index) => ({
        id: `p${index}`,
        type: item.type,
        name: item.name
    }));

    const solutionMap = {};
    items.forEach(item => {
        solutionMap[`${item.r}_${item.c}`] = { type: item.type, name: item.name };
    });

    const config = {
        columns: maxColumn > 0 ? maxColumn : 1, 
        availablePieces: availablePieces,
        solutionConnections: connections,
        solutionMap: solutionMap,
        errors: errors
    };

    console.log("[GameLoader] Parsed Game Config:", config);
    return config;
}

// --- 4. Event Listeners and Initialization ---
loadGameBtn.addEventListener('click', () => {
    const selectedFile = gameSelector.value;
    loadGame(selectedFile);
});

// Run on page load
populateGameList();


// --- 5. PUZZLE SOLVER STUB ---
window.checkPuzzleState = function() {
    const currentPieces = Renderer.getPieces();
    
    // Check for config safety first
    if (!window.currentGameConfig) {
        console.error("--- checkPuzzleState START FAILED: currentGameConfig is null ---");
        return;
    }
    
    const solutionMap = window.currentGameConfig.solutionMap;
    const solutionConnections = window.currentGameConfig.solutionConnections;
    
    const requiredPlacements = Object.keys(solutionMap).length;
    let correctPlacements = 0;
    
    console.log("--- checkPuzzleState START ---");
    console.log("[State] Current Placed Pieces:", currentPieces);
    console.log("[State] Solution Map (Expected R_C):", solutionMap);
    
    // --- 1. Identify Correct Placements (FIXED LOGIC) ---
    const correctPlacementKeys = {}; 
    for (const key in currentPieces) {
        const placedPiece = currentPieces[key];
        const requiredPiece = solutionMap[key];
        
        // Log piece checking
        console.log(`[Check] Slot ${key}: Placed Type=${placedPiece.type} Name="${placedPiece.name}", Required Type=${requiredPiece ? requiredPiece.type : 'NONE'} Name="${requiredPiece ? requiredPiece.name : 'NONE'}"`);

        // --- CRITICAL FIX: Check Type AND Name ---
        if (requiredPiece && 
            placedPiece.type === requiredPiece.type &&
            placedPiece.name === requiredPiece.name) { // <-- ADDED NAME CHECK
            
            correctPlacements++;
            correctPlacementKeys[key] = true;
        }
    }
    
    console.log(`[Result] Total Correct Placements: ${correctPlacements}/${requiredPlacements}`);
    console.log("[Result] Correct Placement Keys:", Object.keys(correctPlacementKeys));

    // --- 2. Resolve Visible Connections (Arrows) ---
    const visibleConnections = [];
    
    solutionConnections.forEach((conn, index) => {
        const startKey = conn.start; 
        const endKey = conn.end; 
        
        const isStartCorrect = correctPlacementKeys[startKey];
        const isEndCorrect = correctPlacementKeys[endKey];
        
        console.log(`[Check] Connection ${index} (${startKey} -> ${endKey}): Start Correct? ${!!isStartCorrect}, End Correct? ${!!isEndCorrect}`);
        
        if (isStartCorrect && isEndCorrect) {
            visibleConnections.push(conn);
        }
    });
    
    console.log("[Result] Visible Connections to Render:", visibleConnections.length, visibleConnections);

    // --- 3. Render Connections ---
    Renderer.setConnections(visibleConnections);

    // FIX/IMPROVEMENT: Check for SVG element existence before rendering
    const svgElement = document.getElementById('flow-svg');
    if (svgElement) {
        Renderer.renderArrows(svgElement);
    } else {
        console.error("[Renderer] CRITICAL ERROR: SVG element #flow-svg not found during checkPuzzleState!");
    }
    
    // --- 4. Check for Full Solution ---
    if (correctPlacements === requiredPlacements && 
        Object.keys(currentPieces).length === requiredPlacements) {
        
        console.log("PUZZLE SOLVED! 🎉");
        
        // **FIX:** Delay the alert to allow the browser to fully draw the last SVG arrow.
        setTimeout(() => {
            alert("Congratulations! Puzzle Solved!");
        }, 100); // 100 milliseconds is usually enough for rendering
    } else {
        console.log(`[State] Puzzle state: ${Object.keys(currentPieces).length} placed. ${correctPlacements}/${requiredPlacements} correct.`);
    }

    console.log("--- checkPuzzleState END ---");
}