import { parseDSL, resolveConnections } from '../dslParser/dslParser.js';
// FIX: Removed the non-existent 'resetDragAndDrop' from imports
import { createGrid, addPiece, setConnections, renderArrows, resetState, PIECE_COLORS } from '../flowRenderer/flowRenderer.js';
const GRID_CONTAINER = document.getElementById('grid-container');
const SVG = document.getElementById('flow-svg');

const DSL_EDITOR = document.getElementById('dsl-editor');
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
function saveSelection() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        return {
            startContainer: range.startContainer,
            startOffset: range.startOffset,
            endContainer: range.endContainer,
            endOffset: range.endOffset
        };
    }
    return null;
}

function restoreSelection(savedSel) {
    if (savedSel) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        const range = document.createRange();
        range.setStart(savedSel.startContainer, savedSel.startOffset);
        range.setEnd(savedSel.endContainer, savedSel.endOffset);
        sel.addRange(range);
    }
}

function updateLineNumbers(errors = []) {
    if (!LINE_NUMBERS || !DSL_EDITOR) return;
    const lines = DSL_EDITOR.textContent.split('\n');
    const errorLines = new Set(errors.filter(e => e.line).map(e => e.line - 1));
    LINE_NUMBERS.innerHTML = lines.map((_, idx) => `<span class=\"${errorLines.has(idx) ? 'error-line-number' : ''}\">${idx + 1}</span>`).join('');
}

function highlightDSL(text) {
    const lines = text.split('\n');
    const textColors = {
        Command: '#0F9ED5',      // blue
        Event: '#FFC000',        // amber/yellow
        ReadModel: '#4EA72E',    // green
        Automation: '#000000',   // black text
        SCREEN: '#000000',       // black text
        ExternalEvent: '#FFFFCC' // light yellow
    };
    const highlighted = lines.map(line => {
        if (line.trim().startsWith('ELEMENT:')) {
            // Use regex to find and replace the type while preserving spacing
            const match = line.match(/(ELEMENT:\s*\d+,\s*)([^,]+)(,.*)/);
            if (match) {
                const before = match[1];
                const type = match[2].trim();
                const after = match[3];
                const color = textColors[type] || textColors[type.toUpperCase()] || '#ffffff';
                let style = '';
                if (type === 'Command' || type === 'Event' || type === 'ReadModel') {
                    style = `background-color: ${color}; color: white`;
                } else if (type === 'ExternalEvent') {
                    style = `background-color: ${color}; color: black`;
                } else if (type === 'Automation' || type === 'Screen' || type.toUpperCase() === 'SCREEN') {
                    style = `background-color: white; color: black`;
                } else {
                    style = `color: ${color}`;
                }
                return before + `<span style="${style}">${type}</span>` + after;
            }
        }
        return line;
    }).join('\n');
    return highlighted;
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


// --- Core Function to Load and Render Flow ---
function loadAndRenderFlow() {
    const dslContent = DSL_EDITOR.textContent;
    const { items, rawFlows, errors } = parseDSL(dslContent);
    if (errors.length) console.warn('DSL errors', errors);
    displayPositioningErrors(errors);
    displayVisualErrors(errors);
    const { pieces, connections } = resolveConnections(items, rawFlows);
    resetState();
    const maxCol = Object.values(pieces).reduce((max, p) => Math.max(max, p.c), cols - 1);
    createGrid(GRID_CONTAINER, maxCol + 1);
    Object.values(pieces).forEach(p => addPiece(p.r, p.c, p.type, p.name, p.id, p.text));
    setConnections(connections);
    renderArrows(SVG);
    if (window.applyTrayZoom) window.applyTrayZoom();
}

// --- Utility: Clear Flow ---
function clearFlow() {
    DSL_EDITOR.textContent = '';
    DSL_EDITOR.innerHTML = '';
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

// Load the default DSL when the page first loads
document.addEventListener('DOMContentLoaded', () => {
    fetch('example.dsl')
        .then(response => response.text())
        .then(exampleDSL => {
            // Show colored DSL for initial load only
            DSL_EDITOR.innerHTML = highlightDSL(exampleDSL);
            updateLineNumbers();
            loadAndRenderFlow();
        });
});

// Sync line numbers on input
if (DSL_EDITOR) {
    DSL_EDITOR.addEventListener('input', () => {
        // On edit, revert to plain text for editing reliability
        updateLineNumbers();
        loadAndRenderFlow();
    });
    // No scroll sync needed: both are in a single scrollable container
}


// small: re-render on resize
window.addEventListener('resize', ()=>renderArrows(SVG));
