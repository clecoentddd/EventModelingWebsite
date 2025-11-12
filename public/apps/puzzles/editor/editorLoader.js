import { parseDSL, resolveConnections } from '../dslParser/dslParser.js';
// FIX: Removed the non-existent 'resetDragAndDrop' from imports
import { createGrid, addPiece, setConnections, renderArrows, resetState } from '../flowRenderer/flowRenderer.js';
const GRID_CONTAINER = document.getElementById('grid-container');
const SVG = document.getElementById('flow-svg');

const DSL_INPUT = document.getElementById('dsl-input');
const LINE_NUMBERS = document.getElementById('line-numbers');
const LOAD_BTN = document.getElementById('load-dsl');
const CLEAR_BTN = document.getElementById('clear-flow');
const ERROR_DISPLAY = document.getElementById('error-display');
const ERROR_LIST = document.getElementById('error-list');
const ADD_COL = document.getElementById('add-col');
const EXPORT_JSON = document.getElementById('export-json');
const DOWNLOAD_PROJECT = document.getElementById('download-project');

let cols = 6;
// Initial rendering of the grid
createGrid(GRID_CONTAINER, cols);

// --- Function to Render Code Rows ---
function updateLineNumbers(errors = []) {
    if (!LINE_NUMBERS || !DSL_INPUT) return;
    const lines = DSL_INPUT.value.split('\n');
    const errorLines = new Set(errors.filter(e => e.line).map(e => e.line - 1));
    LINE_NUMBERS.innerHTML = lines.map((_, idx) => `<div class="${errorLines.has(idx) ? 'error-line-number' : ''}">${idx + 1}</div>`).join('');
}

// --- Function to Display Visual Error Highlights ---
function displayVisualErrors(errors) {
    updateLineNumbers(errors);
}

// --- Error Tooltip Functions ---
let currentTooltip = null;

function showErrorTooltip(event, message) {
    hideErrorTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'error-tooltip';
    tooltip.textContent = message;
    
    document.body.appendChild(tooltip);
    
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = `${rect.right + 10}px`;
    tooltip.style.top = `${rect.top}px`;
    
    currentTooltip = tooltip;
}

function hideErrorTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}

// --- Function to Display Positioning Errors ---
function displayPositioningErrors(errors) {
    const visualErrors = errors.filter(err => err.type === 'positioning' || err.type === 'flow-type');
    if (visualErrors.length === 0) {
        if (ERROR_DISPLAY) ERROR_DISPLAY.style.display = 'none';
        return;
    }
    if (ERROR_DISPLAY && ERROR_LIST) {
        ERROR_DISPLAY.style.display = 'block';
        ERROR_LIST.innerHTML = '';
        visualErrors.forEach(error => {
            const li = document.createElement('li');
            li.textContent = `Line ${error.line}: ${error.reason}`;
            ERROR_LIST.appendChild(li);
        });
    }
}


// --- Core Function to Load and Render the Flow ---
function loadAndRenderFlow() {

    resetState();
    const dslContent = DSL_INPUT.value;
    const { items, rawFlows, errors } = parseDSL(dslContent);
    if (errors.length) console.warn('DSL errors', errors);
    displayPositioningErrors(errors);
    displayVisualErrors(errors);
    const { pieces, connections } = resolveConnections(items, rawFlows);
    resetState();
    const maxCol = Object.values(pieces).reduce((max, p) => Math.max(max, p.c), cols - 1);
    createGrid(GRID_CONTAINER, maxCol + 1);
    Object.values(pieces).forEach(p => addPiece(p.r, p.c, p.type, p.name, p.line, p.text));
    setConnections(connections);
    renderArrows(SVG);
    if (window.applyTrayZoom) window.applyTrayZoom();
}

// --- Utility: Clear Flow ---
function clearFlow() {
    DSL_INPUT.value = '';
    resetState();
    createGrid(GRID_CONTAINER, 6);
    setConnections([]);
    renderArrows(SVG);
    if (ERROR_DISPLAY) ERROR_DISPLAY.style.display = 'none';
    // Clear error line styling
    if (LINE_NUMBERS) {
        const errorLines = LINE_NUMBERS.querySelectorAll('.error-line-number');
        errorLines.forEach(el => el.classList.remove('error-line-number'));
    }
    updateLineNumbers();
}

// --- Event Listeners ---
LOAD_BTN.addEventListener('click', loadAndRenderFlow);
CLEAR_BTN.addEventListener('click', clearFlow); // Added clear flow listener

// Update line numbers when typing
DSL_INPUT.addEventListener('input', updateLineNumbers);

// Improved scroll synchronization
DSL_INPUT.addEventListener('scroll', () => {
    if (LINE_NUMBERS) {
        LINE_NUMBERS.scrollTop = DSL_INPUT.scrollTop;
    }
}, { passive: true });

// Also sync on wheel events for immediate response
DSL_INPUT.addEventListener('wheel', () => {
    requestAnimationFrame(() => {
        if (LINE_NUMBERS) {
            LINE_NUMBERS.scrollTop = DSL_INPUT.scrollTop;
        }
    });
}, { passive: true });

// Load the default DSL when the page first loads
document.addEventListener('DOMContentLoaded', () => {
    const defaultDSL = `ELEMENT: 1, Screen, "Select Espresso", 1;1
ELEMENT: 2, Command, "Order Espresso", 1;0
ELEMENT: 3, Event, "Espresso Ordered", 1;-1
ELEMENT: 4, ReadModel, "Espressos to prepare", 2;0
ELEMENT: 5, Automation, "Espresso Maker", 3;1
ELEMENT: 6, Command, "Mark Espresso As Prepared", 3;0
ELEMENT: 7, Event, "Espresso Prepared", 3;-1
ELEMENT: 8, Event, "Espresso maker failed", 4;-1
ELEMENT: 9, ReadModel, "Espresso Prepared List", 5;0
ELEMENT: 10, ExternalEvent, "Alert", 6;-2
ELEMENT: 11, Automation, "Notify Barista", 7;1
ELEMENT: 12, Command, "Translate to Coffee Required", 7;0
ELEMENT: 13, Event, "Coffee Required", 7;-1

FLOW: 1 to 2
FLOW: 2 to 3
FLOW: 3 to 4
FLOW: 4 to 5
FLOW: 5 to 6
FLOW: 6 to 7
FLOW: 7 to 9
FLOW: 6 to 8 
BACK_FLOW: 7 to 4
FLOW: 10 to 11
FLOW: 11 to 12
FLOW: 12 to 13`;
    DSL_INPUT.value = defaultDSL;
    updateLineNumbers();
    loadAndRenderFlow();
});

// Sync line numbers on input
if (DSL_INPUT) {
    DSL_INPUT.addEventListener('input', () => {
        updateLineNumbers();
        loadAndRenderFlow();
    });
    DSL_INPUT.addEventListener('scroll', () => {
        if (LINE_NUMBERS) {
            LINE_NUMBERS.scrollTop = DSL_INPUT.scrollTop;
        }
    });
}


// small: re-render on resize
window.addEventListener('resize', ()=>renderArrows(SVG));
