import { parseDSL, resolveConnections } from '../dslParser/dslParser.js';
// FIX: Removed the non-existent 'resetDragAndDrop' from imports
import { createGrid, addPiece, setConnections, renderArrows, resetState } from '../flowRenderer/flowRenderer.js';
const GRID_CONTAINER = document.getElementById('grid-container');
const SVG = document.getElementById('flow-svg');
const DSL_INPUT = document.getElementById('dsl-input');
const LOAD_BTN = document.getElementById('load-dsl');
const CLEAR_BTN = document.getElementById('clear-flow'); // Added clear button reference
const ERROR_DISPLAY = document.getElementById('error-display');
const ERROR_LIST = document.getElementById('error-list');
const LINE_NUMBERS = document.getElementById('line-numbers');
const ADD_COL = document.getElementById('add-col');
const EXPORT_JSON = document.getElementById('export-json');
const DOWNLOAD_PROJECT = document.getElementById('download-project');

let cols = 6;
// Initial rendering of the grid
createGrid(GRID_CONTAINER, cols);

// --- Function to Update Line Numbers ---
function updateLineNumbers() {
    if (!LINE_NUMBERS) {
        console.error('LINE_NUMBERS element not found!');
        return;
    }
    
    const lines = DSL_INPUT.value.split('\n');
    
    // Calculate exact line height from textarea
    const computedStyle = window.getComputedStyle(DSL_INPUT);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    const fontSize = parseFloat(computedStyle.fontSize);
    const actualLineHeight = lineHeight || fontSize * 1.4;
    
    const lineNumbersHtml = lines.map((_, index) => 
        `<div style="height: ${actualLineHeight}px; line-height: ${actualLineHeight}px;">${index + 1}</div>`
    ).join('');
    
    LINE_NUMBERS.innerHTML = lineNumbersHtml;
    console.log('Line numbers updated:', lines.length, 'lines, line height:', actualLineHeight);
}

// --- Function to Display Visual Error Highlights ---
function displayVisualErrors(errors) {
    console.log('displayVisualErrors called with errors:', errors);
    
    // Clear previous error line numbers
    const existingErrorLines = LINE_NUMBERS.querySelectorAll('.error-line-number');
    existingErrorLines.forEach(el => el.classList.remove('error-line-number'));
    
    const positioningErrors = errors.filter(err => err.type === 'positioning');
    console.log('Positioning errors:', positioningErrors);
    
    // Mark line numbers with errors in red
    positioningErrors.forEach(error => {
        console.log(`Marking line ${error.line} as error`);
        const lineNumberDivs = LINE_NUMBERS.querySelectorAll('div');
        console.log('Total line number divs:', lineNumberDivs.length);
        
        if (lineNumberDivs[error.line - 1]) {
            lineNumberDivs[error.line - 1].classList.add('error-line-number');
            lineNumberDivs[error.line - 1].title = error.reason;
            lineNumberDivs[error.line - 1].style.color = 'red'; // Force red color as backup
            console.log(`Applied error styling to line ${error.line}`);
        } else {
            console.error(`Line number div not found for line ${error.line}`);
        }
    });
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
    const positioningErrors = errors.filter(err => err.type === 'positioning');
    
    if (positioningErrors.length === 0) {
        if (ERROR_DISPLAY) ERROR_DISPLAY.style.display = 'none';
        return;
    }
    
    if (ERROR_DISPLAY && ERROR_LIST) {
        ERROR_DISPLAY.style.display = 'block';
        ERROR_LIST.innerHTML = '';
        
        positioningErrors.forEach(error => {
            const li = document.createElement('li');
            li.textContent = error.reason;
            ERROR_LIST.appendChild(li);
        });
    }
}


// --- Core Function to Load and Render the Flow ---
function loadAndRenderFlow() {

    resetState(); // clears pieces[], connections[], and resets slots

    const dslContent = DSL_INPUT.value;
    
    // FIX: Correctly destructure and pass rawFlows
    const { items, rawFlows, errors } = parseDSL(dslContent);
    
    if (errors.length) console.warn('DSL errors', errors);
    
    // Display positioning errors in the UI
    displayPositioningErrors(errors);
    displayVisualErrors(errors);
    
    // FIX: Pass rawFlows to the connection resolver
    const { pieces, connections } = resolveConnections(items, rawFlows);

    // 3. Reset and prepare canvas
    resetState();
    
    // Calculate required grid size
    const maxCol = Object.values(pieces).reduce((max, p) => Math.max(max, p.c), cols - 1);
    createGrid(GRID_CONTAINER, maxCol + 1);
    
    // 4. Add pieces to DOM
    Object.values(pieces).forEach(p => addPiece(p.r, p.c, p.type, p.name, p.line, p.text));
    
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
    // Set DSL content via JavaScript for complete control
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
    
    console.log('Set DSL content via JS');
    console.log('First char code:', defaultDSL.charCodeAt(0));
    console.log('Lines count:', defaultDSL.split('\n').length);
    console.log('First line:', defaultDSL.split('\n')[0]);
    
    updateLineNumbers();
    loadAndRenderFlow();
});


// small: re-render on resize
window.addEventListener('resize', ()=>renderArrows(SVG));
