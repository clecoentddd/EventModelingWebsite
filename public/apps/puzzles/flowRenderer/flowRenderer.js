export const GRID_ROWS = [1, 0, -1, -2];
const SLOT_W = 200, SLOT_H = 200;
let pieces = {}, connections = [];

const PIECE_COLORS = {
    Command: '#0F9ED5',
    Event: '#FFC000',
    ReadModel: '#4EA72E',
    Automation: '#ffffff',
    UI: '#ffffff',
    ExternalEvent: '#FFFFCC'
};

export function resetState() {
    pieces = {};
    connections = [];
    refreshSlotHighlights();
}

export function getPieces() {
    return pieces;
}

// ---------------------- Helper to create piece element ----------------------
function createPieceElement({ type, name, id, slot = null }) {
    const el = document.createElement('div');
    el.className = `flow-piece piece-${type}` + (slot === null ? ' draggable-piece' : '');
    if (slot) el.dataset.slot = slot;
    el.dataset.type = type;
    el.dataset.name = name;
    el.dataset.pieceId = id;
    el.style.backgroundColor = PIECE_COLORS[type] || '#999';

    let innerHTML = `<div class="piece-name-editable">${name}</div>`;
    if (type === 'Automation') {
        innerHTML += `<img src="../flowRenderer/images/automation.png" class="Automation-icon" alt="Automation Icon">`;
    }
    el.innerHTML = innerHTML;

    if (slot === null) {
        // Tray piece
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id,
                type,
                name,
                sourceSlot: null
            }));
            e.currentTarget.classList.add('dragging');
        });
        el.addEventListener('dragend', (e) => {
            e.currentTarget.classList.remove('dragging');
        });
    } else {
        // Grid piece
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id,
                type,
                name,
                sourceSlot: slot
            }));
        });
        el.addEventListener('dblclick', () => {
            console.log(`[Renderer] Double-click to remove piece from slot: ${slot}`); // LOG
            if (removePiece(slot)) {
                // Check if the puzzle state function exists before calling
                if (window.checkPuzzleState) {
                    window.checkPuzzleState();
                }
            }
        });
    }

    return el;
}

// ---------------------- Grid ----------------------
export function createGrid(container, cols) {
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${cols}, ${SLOT_W}px)`;

    for (let c = 1; c <= cols; c++) {
        GRID_ROWS.forEach((r, idx) => {
            const slot = document.createElement('div');
            const key = `${r}_${c}`;
            slot.id = key;
            slot.className = 'grid-slot';
            slot.style.gridRow = idx + 1;
            slot.style.gridColumn = c;

            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-hover');
            });
            slot.addEventListener('dragleave', () => slot.classList.remove('drag-hover'));

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-hover');

                const pieceData = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (!pieceData || !pieceData.type) return;

                console.log(`[Renderer] Dropping piece ${pieceData.id} to slot ${key}. Source: ${pieceData.sourceSlot}`); // LOG

                const [r, c] = key.split('_').map(Number);
                if (addPiece(r, c, pieceData.type, pieceData.name, pieceData.id)) {
                    if (pieceData.sourceSlot) removePiece(pieceData.sourceSlot);

                    // Remove tray copy
                    const trayPiece = document.querySelector(`.draggable-piece[data-piece-id="${pieceData.id}"]`);
                    if (trayPiece) trayPiece.remove();

                    // Check if the puzzle state function exists before calling
                    if (window.checkPuzzleState) {
                        window.checkPuzzleState();
                    } else {
                        console.log("[Renderer] checkPuzzleState not defined. Not updating puzzle state."); // LOG
                    }
                }
            });

            container.appendChild(slot);

            // Add vertical indicator only once per row (first column only)
if (c === 1) {
  const rowIndicator = document.createElement('div');
  rowIndicator.classList.add('row-indicator');

  // Choose color based on row
  if (r >= 1) {
    rowIndicator.style.background = 'linear-gradient(to bottom, #fff 50%, #000 50%)';
  } else if (r === 0) {
    rowIndicator.style.background = 'linear-gradient(to bottom, #0F9ED5 50%, #4EA72E 50%)';
  } else {
    rowIndicator.style.background = 'linear-gradient(to bottom,  #FFC000 50%, #FAFAB7 50%)';
  }

  rowIndicator.style.gridRow = idx + 1;
  rowIndicator.style.gridColumn = 1; // aligns to leftmost column
  container.appendChild(rowIndicator);
}
        });
    }
    refreshSlotHighlights();
}

// ---------------------- Add / Remove Piece ----------------------
export function addPiece(r, c, type, name, id) {
    const key = `${r}_${c}`;
    const slot = document.getElementById(key);
    if (!slot || slot.querySelector('.flow-piece')) return false;

    pieces[key] = { r, c, type, name, id };

    const el = createPieceElement({ type, name, id, slot: key });
    slot.appendChild(el);

    // Highlight updates
    refreshSlotHighlights();
    return true;
}

export function removePiece(key) {
    const slot = document.getElementById(key);
    if (!slot) return false;

    const pieceEl = slot.querySelector('.flow-piece');
    if (!pieceEl) return false;

    pieceEl.remove();
    delete pieces[key];
    console.log(`[Renderer] Piece removed from internal state: ${key}. Remaining pieces: ${Object.keys(pieces).length}`); // LOG

    // Remove related connections
    connections = connections.filter(conn => conn.start !== key && conn.end !== key);

    // Refresh arrows
    const svgEl = document.getElementById('flow-svg');
    if (svgEl) renderArrows(svgEl);

    // Refresh slot highlighting
    refreshSlotHighlights();
    return true;
}

// ---------------------- Tray / Available Pieces ----------------------
export function renderAvailablePieces(container, piecesList) {
    const header = container.querySelector('h2');
    container.innerHTML = '';
    if (header) container.appendChild(header);

    const piecesContainer = document.createElement('div');
    piecesContainer.id = 'tray-pieces-container';
    container.appendChild(piecesContainer);

    // Drag back from grid
    piecesContainer.addEventListener('dragover', (e) => e.preventDefault());
// New drop handler for the Tray area
piecesContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    const pieceData = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (!pieceData || !pieceData.id) return;
    
    console.log(`[Renderer] Dropping piece ${pieceData.id} back to tray. Source: ${pieceData.sourceSlot}`); // LOG

    // FIX: Only process the drop if the piece originated from the grid.
    if (pieceData.sourceSlot) { 
        
        // 1. Remove the piece from its old grid slot
        removePiece(pieceData.sourceSlot);

        // 2. Re-add the piece back to the visual tray
        const el = createPieceElement({ type: pieceData.type, name: pieceData.name, id: pieceData.id });
        piecesContainer.appendChild(el);
        
        // 3. Call the global state check
        if (window.checkPuzzleState) {
            window.checkPuzzleState();
        } else {
             console.log("[Renderer] checkPuzzleState not defined. Not updating puzzle state."); 
        }
    } 
    // If pieceData.sourceSlot is null (it came from the tray itself), the drop is simply ignored.
});

    // Original pieces
    piecesList.forEach(p => {
        const el = createPieceElement({ type: p.type, name: p.name, id: p.id });
        piecesContainer.appendChild(el);
    });
}

// ---------------------- Drag Listeners for tray ----------------------
function setupDragListeners() {
    const trayPieces = document.querySelectorAll('.draggable-piece');
    trayPieces.forEach(el => {
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id: el.dataset.pieceId,
                type: el.dataset.type,
                name: el.dataset.name,
                sourceSlot: null
            }));
            e.currentTarget.classList.add('dragging');
        });
        el.addEventListener('dragend', (e) => {
            e.currentTarget.classList.remove('dragging');
        });
    });
}

// ---------------------- Connections / Arrows ----------------------
export function setConnections(conns) { connections = conns; }

function getAnchorFromDOM(r, c, segment, svgEl) {
    const key = `${r}_${c}`;
    const slot = document.getElementById(key);
    const el = slot?.querySelector('.flow-piece');
    
    // LOG: Check if element is found for anchor calculation
    if (!slot || !el) {
        console.warn(`[Renderer:Arrows] Could not find piece element for slot ${key}. Returning (0,0).`);
        return { x: 0, y: 0 };
    }

    const pieceRect = el.getBoundingClientRect();
    const svgRect = svgEl.getBoundingClientRect();

    let x = pieceRect.left + pieceRect.width / 2;
    let y = pieceRect.top + pieceRect.height / 2;

    switch (segment) {
        case 'top': y = pieceRect.top; x = pieceRect.left + pieceRect.width/2; break;
        case 'bottom': y = pieceRect.bottom; x = pieceRect.left + pieceRect.width/2; break;
        case 'left': x = pieceRect.left; y = pieceRect.top + pieceRect.height/2; break;
        case 'right': x = pieceRect.right; y = pieceRect.top + pieceRect.height/2; break;
    }

    const x_svg_rel = x - svgRect.left;
    const y_svg_rel = y - svgRect.top;
    const scaleX = svgEl.viewBox.baseVal.width / svgRect.width;
    const scaleY = svgEl.viewBox.baseVal.height / svgRect.height;

    return { x: x_svg_rel * scaleX, y: y_svg_rel * scaleY };
}

export function renderArrows(svgEl) {
    svgEl.innerHTML = '';
    const pieceValues = Object.values(pieces);
    const maxCol = pieceValues.length ? Math.max(...pieceValues.map(p => p.c)) : 0;
    const colsToUse = Math.max(maxCol + 1, 6);
    const rows = GRID_ROWS.length;
    
    console.log(`[Renderer:Arrows] Drawing ${connections.length} connections.`); // LOG

    svgEl.setAttribute('viewBox', `0 0 ${colsToUse*SLOT_W} ${rows*SLOT_H}`);
    svgEl.style.width = `${colsToUse*SLOT_W}px`;
    svgEl.style.height = `${rows*SLOT_H}px`;

    connections.forEach(conn => {
        const [r1,c1] = conn.start.split('_').map(Number);
        const [r2,c2] = conn.end.split('_').map(Number);
        
        // Log connection details for debugging
        console.log(`[Renderer:Arrows] Connection: ${conn.start} -> ${conn.end}`); // LOG

        const a = getAnchorFromDOM(r1,c1,conn.startSegment||'bottom',svgEl);
        const b = getAnchorFromDOM(r2,c2,conn.endSegment||'top',svgEl);
        
        // Check for invalid coordinates
        if (a.x === 0 && a.y === 0 && b.x === 0 && b.y === 0) {
            console.warn(`[Renderer:Arrows] Skipping connection ${conn.start} -> ${conn.end} due to zero coordinates.`); // LOG
            return; 
        }

        const path = document.createElementNS('http://www.w3.org/2000/svg','path');
        const controlY = (a.y + b.y)/2;
        path.setAttribute('d', `M ${a.x} ${a.y} C ${a.x} ${controlY}, ${b.x} ${controlY}, ${b.x} ${b.y}`);

        const styleType = (conn.style || '').trim().toLowerCase();
        const isDashed = styleType === 'dashed';
        const strokeColor = isDashed ? '#000' : '#475569';

        path.setAttribute('stroke', strokeColor);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-width', '2');
        if (isDashed) path.setAttribute('stroke-dasharray','5,5');
        svgEl.appendChild(path);

        const marker = document.createElementNS('http://www.w3.org/2000/svg','circle');
        marker.setAttribute('cx', b.x);
        marker.setAttribute('cy', b.y);
        marker.setAttribute('r',4);
        marker.setAttribute('fill', strokeColor);
        svgEl.appendChild(marker);
    });
}

// ---------------------- Slot Highlight ----------------------
function refreshSlotHighlights() {
    document.querySelectorAll('.grid-slot').forEach(slot => {
        const [r] = slot.id.split('_').map(Number);
        if (GRID_ROWS.includes(r) && !slot.querySelector('.flow-piece')) {
            slot.classList.add('drag-hover');
        } else {
            slot.classList.remove('drag-hover');
        }
    });
}