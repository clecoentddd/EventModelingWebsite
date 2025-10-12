// public/apps/puzzles/js/gameLoader.js - FINAL CORRECTED VERSION

import * as Renderer from './flowRenderer.js'; 
import * as DslParser from './dslParser.js'; 
import { highlightNextSlot, clearAllHighlights } from './puzzleGuide.js'; // ✅ CRITICAL: Import for the new guidance logic

const gameSelector = document.getElementById('game-selector');
const loadGameBtn = document.getElementById('load-game-btn');
const gridContainer = document.getElementById('grid-container');

// Global object to store the current game's solution data and tracking current placement
window.currentGameConfig = null;

// State variables for the puzzle guide
let lastCorrectElementId = 0; 
let currentPuzzleDSL = ''; 

// --- UTILITY: Fisher-Yates shuffle algorithm (UNCHANGED) ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// --- 1. HARDCODED GAME LIST (UNCHANGED) ---
const AVAILABLE_GAMES = [
    { fileName: 'state_change.dsl', displayName: 'State Change' },
    { fileName: 'view_state.dsl', displayName: 'View Change' },
    { fileName: 'automation.dsl', displayName: 'Automation' },
    { fileName: 'simple.dsl', displayName: 'Simple Puzzle' },
    { fileName: 'doable.dsl', displayName: 'Doable Puzzle' },
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

function isTestMode() {
    const path = window.location.pathname.toLowerCase();
    return path.endsWith('index.html') || path.endsWith('/'); 
}


// --- 2. Load Selected Game ---
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
        currentPuzzleDSL = dslContent; 

        // --- DSL Structuring ---
        const gameConfig = structureGameConfig(dslContent); 

        if (gameConfig.errors.length > 0) {
            console.error("[GameLoader] DSL Parsing Errors:", gameConfig.errors);
            alert(`Failed to load game: ${gameConfig.errors.length} parsing errors. See console.`);
            return;
        }
        
        window.currentGameConfig = gameConfig;
        
        console.log(`[GameLoader] Game config loaded successfully. Columns: ${gameConfig.columns}, Pieces: ${gameConfig.availablePieces.length}`);

        // 1. Reset state
        Renderer.resetState();
        lastCorrectElementId = 0; // Reset puzzle guide progress
        clearAllHighlights(); // Clear previous highlights

        // 2. Create the grid 
        Renderer.createGrid(gridContainer, gameConfig.columns);
        
        // 3. Render the available pieces in the tray
        const pieceTray = document.getElementById('piece-tray');
        const shuffledPieces = shuffleArray([...gameConfig.availablePieces]);
        Renderer.renderAvailablePieces(pieceTray, shuffledPieces);
        
        // 4. CONNECTION DISPLAY LOGIC 
        if (isTestMode()) {
            Renderer.setConnections(gameConfig.solutionConnections);
        } else {
            Renderer.setConnections([]);
        }
        
        // 5. Render the set connections
        const svgElement = document.getElementById('flow-svg');
        if (svgElement) {
            Renderer.renderArrows(svgElement);
        } else {
            console.error("[GameLoader] CRITICAL ERROR: SVG element #flow-svg not found during load!");
        }
        
        // 6. 🧩 INITIAL HIGHLIGHT: Guide the user to the first step
        highlightNextSlot(currentPuzzleDSL, lastCorrectElementId); 

    } catch (error) {
        console.error(`[GameLoader] Error loading game: ${dslFileName}`, error);
    }
}


// --- 3. DSL Structuring Function (Corrected Piece ID and Added DSL ID) ---
function structureGameConfig(dslContent) {
    const { items, rawFlows, errors } = DslParser.parseDSL(dslContent);
    const { connections } = DslParser.resolveConnections(items, rawFlows);
    
    let maxColumn = 0;
    items.forEach(item => {
        if (item.c > maxColumn) {
            maxColumn = item.c;
        }
    });

    // ✅ FIX: Maintain original piece ID format (p0, p1, etc.) for the tray pieces
    const availablePieces = items.map((item, index) => ({
        id: `p${index}`, 
        type: item.type,
        name: item.name
    }));

    const solutionMap = {};
    items.forEach(item => {
        solutionMap[`${item.r}_${item.c}`] = { 
            type: item.type, 
            name: item.name,
            dslId: item.id // Stores the DSL ID (e.g., 1, 2, 3) for the guide
        };
    });

    const config = {
        columns: maxColumn > 0 ? maxColumn : 1, 
        availablePieces: availablePieces,
        solutionConnections: connections,
        solutionMap: solutionMap,
        errors: errors,
        dslContent: dslContent 
    };

    console.log("[GameLoader] Parsed Game Config:", config);
    return config;
}

// --- 4. Event Listeners and Initialization (UNCHANGED) ---
loadGameBtn.addEventListener('click', () => {
    const selectedFile = gameSelector.value;
    loadGame(selectedFile);
});

// Run on page load
populateGameList();


// --- 5. PUZZLE SOLVER STUB (Modified for Highlighting) ---
window.checkPuzzleState = function() {
    const currentPieces = Renderer.getPieces();
    
    if (!window.currentGameConfig) {
        console.error("--- checkPuzzleState START FAILED: currentGameConfig is null ---");
        return;
    }
    
    const solutionMap = window.currentGameConfig.solutionMap;
    const solutionConnections = window.currentGameConfig.solutionConnections;
    
    const requiredPlacements = Object.keys(solutionMap).length;
    let correctPlacements = 0;
    let highestCorrectDslId = 0; 

    console.log("--- checkPuzzleState START ---");
    
    // --- 1. Identify Correct Placements and find the highest correct DSL ID ---
    const correctPlacementKeys = {}; 
    for (const key in currentPieces) {
        const placedPiece = currentPieces[key];
        const requiredPiece = solutionMap[key];
        
        // Check Type AND Name
        if (requiredPiece && 
            placedPiece.type === requiredPiece.type &&
            placedPiece.name === requiredPiece.name) { 
            
            correctPlacements++;
            correctPlacementKeys[key] = true;
            
            // Track the highest DSL ID placed correctly
            if (requiredPiece.dslId > highestCorrectDslId) {
                highestCorrectDslId = requiredPiece.dslId;
            }
        }
    }
    
    // Update the state for the puzzle guide
    lastCorrectElementId = highestCorrectDslId;

    // --- 2. Resolve Visible Connections (Arrows) ---
    const visibleConnections = [];
    solutionConnections.forEach((conn) => {
        const startKey = conn.start; 
        const endKey = conn.end; 
        
        const isStartCorrect = correctPlacementKeys[startKey];
        const isEndCorrect = correctPlacementKeys[endKey];
        
        if (isStartCorrect && isEndCorrect) {
            visibleConnections.push(conn);
        }
    });
    
    // --- 3. Render Connections ---
    Renderer.setConnections(visibleConnections);
    const svgElement = document.getElementById('flow-svg');
    if (svgElement) {
        Renderer.renderArrows(svgElement);
    } else {
        console.error("[Renderer] CRITICAL ERROR: SVG element #flow-svg not found during checkPuzzleState!");
    }
    
    // --- 4. Check for Full Solution and Guide Next Step ---
    if (correctPlacements === requiredPlacements && 
        Object.keys(currentPieces).length === requiredPlacements) {
        
        console.log("PUZZLE SOLVED! 🎉");
        clearAllHighlights(); // Remove final highlight
        
        setTimeout(() => {
            alert("Congratulations! Puzzle Solved!");
        }, 100); 

    } else {
        // 🧩 GUIDE: Highlight the next element based on the highest correct piece placed
        highlightNextSlot(window.currentGameConfig.dslContent, lastCorrectElementId); 
        console.log(`[State] Puzzle state: ${Object.keys(currentPieces).length} placed. ${correctPlacements}/${requiredPlacements} correct.`);
    }

    console.log("--- checkPuzzleState END ---");
}