// (Clear button logic removed)
// Ensure initial DSL loads on page load
document.addEventListener('DOMContentLoaded', () => {
    // --- Flow Renderer Mouse Wheel Zoom ---
    let zoomLevel = 1;
    const MIN_ZOOM = 0.2;
    const MAX_ZOOM = 2.5;
    const ZOOM_STEP = 0.1;
    const flowCanvas = document.querySelector('#flow-canvas');
    // Zoom feature removed; no mouse wheel zoom applied
    fetch('example.dsl')
        .then(response => response.text())
        .then(exampleDSL => {
            DSL_EDITOR.innerHTML = highlightDSL(exampleDSL);
            updateLineNumbers();
            loadAndRenderFlow();
        });
});


// DOM element assignments at the very top
const GRID_CONTAINER = document.getElementById('grid-container');
const SVG = document.getElementById('flow-svg');
const DSL_EDITOR = document.getElementById('dsl-editor');
const LINE_NUMBERS = document.getElementById('line-numbers');
const LOAD_BTN = document.getElementById('load-dsl');
// (CLEAR_BTN removed)
const ERROR_DISPLAY = document.getElementById('error-display');
const ERROR_LIST = document.getElementById('error-list');
const ADD_COL = document.getElementById('add-col');
const EXPORT_JSON = document.getElementById('export-json');
const DOWNLOAD_PROJECT = document.getElementById('download-project');
let cols = 6;

import { parseDSL, resolveConnections } from '../dslParser/dslParser.js';
import { createGrid, addPiece, setConnections, renderArrows, resetState, PIECE_COLORS } from '../flowRenderer/flowRenderer.js';

// --- Display Positioning Errors ---
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

// --- Display Visual Error Highlights ---
function displayVisualErrors(errors) {
    updateLineNumbers(errors);
}

// --- Update Line Numbers ---
function updateLineNumbers(errors = []) {
    if (!LINE_NUMBERS || !DSL_EDITOR) return;
    const lines = DSL_EDITOR.textContent.split('\n');
    const errorLines = new Set(errors.filter(e => e.line).map(e => e.line - 1));
    LINE_NUMBERS.innerHTML = lines.map((_, idx) => `<span class=\"${errorLines.has(idx) ? 'error-line-number' : ''}\">${idx + 1}</span>`).join('');
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
    return lines.map(line => {
        if (line.trim().startsWith('ELEMENT:')) {
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
                return before + `<span style=\"${style}\">${type}</span>` + after;
            }
        }
        return line;
    }).join('\n');
}
// --- Caret and Input Logic ---
let lastWasEnter = false;
if (DSL_EDITOR) {
    DSL_EDITOR.addEventListener('keydown', (e) => {
        lastWasEnter = (e.key === 'Enter');
    });

    function getCaretCharacterOffsetWithin(element) {
        let caretOffset = 0;
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
        return caretOffset;
    }

    function setCaretPosition(element, offset) {
        let currentOffset = 0;
        let found = false;
        function traverse(node) {
            if (found) return;
            if (node.nodeType === 3) {
                const nextOffset = currentOffset + node.length;
                if (offset <= nextOffset) {
                    const sel = window.getSelection();
                    const range = document.createRange();
                    range.setStart(node, offset - currentOffset);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    found = true;
                } else {
                    currentOffset = nextOffset;
                }
            } else if (node.nodeType === 1) {
                for (let i = 0; i < node.childNodes.length; i++) {
                    traverse(node.childNodes[i]);
                    if (found) break;
                }
            }
        }
        traverse(element);
    }


    DSL_EDITOR.addEventListener('input', () => {
        let caretOffset = getCaretCharacterOffsetWithin(DSL_EDITOR);
        const text = DSL_EDITOR.innerText;
        if (lastWasEnter) {
            // Move caret to the start of the new line (after Enter)
            const before = text.slice(0, caretOffset);
            const lineCount = before.split(/\r?\n/).length;
            const lines = text.split(/\r?\n/);
            let offset = 0;
            for (let i = 0; i < lineCount; i++) offset += lines[i].length + 1;
            caretOffset = offset;
            lastWasEnter = false;
        }
        DSL_EDITOR.innerHTML = highlightDSL(text);
        setCaretPosition(DSL_EDITOR, caretOffset);
        updateLineNumbers();
        loadAndRenderFlow();
    });
}
// small: re-render on resize
window.addEventListener('resize', ()=>renderArrows(SVG));
