// public/apps/puzzles/js/gameLoader.js

import * as Renderer from './flowRenderer.js'; 

const gameSelector = document.getElementById('game-selector');
const loadGameBtn = document.getElementById('load-game-btn');
const gridContainer = document.getElementById('grid-container');

// --- 1. HARDCODED GAME LIST ---
const AVAILABLE_GAMES = [
    // Add all your DSL files here.
    { fileName: 'simple.dsl', displayName: 'Simple Puzzle' },
    // { fileName: 'another.dsl', displayName: 'Another Puzzle' }, 
];

function populateGameList() {
    AVAILABLE_GAMES.forEach(game => {
        const option = document.createElement('option');
        option.value = game.fileName;
        option.textContent = game.displayName;
        gameSelector.appendChild(option);
    });

    // Load the first game by default
    if (AVAILABLE_GAMES.length > 0) {
        loadGame(AVAILABLE_GAMES[0].fileName);
    }
}

// --- 2. Load Selected Game ---
async function loadGame(dslFileName) {
    if (!dslFileName) return;

    try {
        // Path is relative to game.html (i.e., public/apps/puzzles/games/simple.dsl)
        const dslPath = `./games/${dslFileName}`; 
        const response = await fetch(dslPath);
        
        if (!response.ok) {
            throw new Error(`Failed to load ${dslFileName}: ${response.statusText}.`);
        }
        
        const dslContent = await response.text();
        console.log(`Successfully loaded ${dslFileName} content.`);

        // --- DSL Parsing and Game Setup (Next Step) ---
        const gameConfig = parseDSL(dslContent); 
        
        Renderer.resetState();
        Renderer.createGrid(gridContainer, gameConfig.columns);
        // ... Logic to render starting pieces and set up D&D events ...

    } catch (error) {
        console.error(`Error loading game: ${dslFileName}`, error);
    }
}

// --- 3. Event Listeners ---
loadGameBtn.addEventListener('click', () => {
    const selectedFile = gameSelector.value;
    loadGame(selectedFile);
});

// Run on page load
populateGameList();

// 🚨 TEMPORARY DSL PARSER: You will replace this with real logic later
function parseDSL(dslContent) {
    // console.log(dslContent); // Useful for debugging your DSL file structure
    return {
        columns: 4, 
        availablePieces: [],
        solutionConnections: []
    };
}