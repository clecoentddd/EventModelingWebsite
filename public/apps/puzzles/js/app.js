import { parseDSL, resolveConnections } from './dslParser.js';
// FIX: Removed the non-existent 'resetDragAndDrop' from imports
import { createGrid, addPiece, setConnections, renderArrows, resetState } from './flowRenderer.js';

const GRID_CONTAINER = document.getElementById('grid-container');
const SVG = document.getElementById('flow-svg');
const DSL_INPUT = document.getElementById('dsl-input');
const LOAD_BTN = document.getElementById('load-dsl');
const CLEAR_BTN = document.getElementById('clear-flow'); // Added clear button reference
const ADD_COL = document.getElementById('add-col');
const EXPORT_JSON = document.getElementById('export-json');
const DOWNLOAD_PROJECT = document.getElementById('download-project');

let cols = 6;
// Initial rendering of the grid
createGrid(GRID_CONTAINER, cols);


// --- Core Function to Load and Render the Flow ---
function loadAndRenderFlow() {
    const dslContent = DSL_INPUT.value;
    
    // FIX: Correctly destructure and pass rawFlows
    const { items, rawFlows, errors } = parseDSL(dslContent);
    
    if (errors.length) console.warn('DSL errors', errors);
    
    // FIX: Pass rawFlows to the connection resolver
    const { pieces, connections } = resolveConnections(items, rawFlows);

    // 3. Reset and prepare canvas
    resetState();
    
    // Calculate required grid size
    const maxCol = Object.values(pieces).reduce((max, p) => Math.max(max, p.c), cols - 1);
    createGrid(GRID_CONTAINER, maxCol + 1);
    
    // 4. Add pieces to DOM
    Object.values(pieces).forEach(p => addPiece(p.r, p.c, p.type, p.name, p.line));
    
    // 5. Render connections (Arrows should now be visible)
    setConnections(connections);
    renderArrows(SVG);
}

// --- Utility: Clear Flow ---
function clearFlow() {
    DSL_INPUT.value = '';
    resetState();
    createGrid(GRID_CONTAINER, 6);
    setConnections([]);
    renderArrows(SVG);
}

// --- Event Listeners ---
LOAD_BTN.addEventListener('click', loadAndRenderFlow);
CLEAR_BTN.addEventListener('click', clearFlow); // Added clear flow listener

// Load the default DSL when the page first loads
document.addEventListener('DOMContentLoaded', loadAndRenderFlow);


ADD_COL.addEventListener('click', ()=>{ 
    cols++; 
    createGrid(GRID_CONTAINER, cols); 
    renderArrows(SVG); 
});

EXPORT_JSON.addEventListener('click', ()=>{
    alert('Export is not implemented in this demo.');
});

DOWNLOAD_PROJECT.addEventListener('click', ()=>{
    alert('In this environment the Download button is a placeholder. Use the zip link provided by the assistant.');
});

// small: re-render on resize
window.addEventListener('resize', ()=>renderArrows(SVG));
