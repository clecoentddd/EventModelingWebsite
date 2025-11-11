// grid-renderer.js
// Updated to show piece.text under piece name (smaller, left-aligned, margin)

export const GRID_ROWS = [1, 0, -1, -2];
const SLOT_W = 200, SLOT_H = 200;
let pieces = {}, connections = [];

const PIECE_COLORS = {
    Command: '#0F9ED5',
    Event: '#FFC000',
    ReadModel: '#4EA72E',
    Automation: '#ffffff',
    SCREEN: '#ffffff',
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
// IMPORTANT: create DOM nodes (avoid injecting raw HTML) so we can set textContent safely.
function createPieceElement({ type, name, id, text = '', slot = null }) {
    const el = document.createElement('div');
    el.className = `flow-piece piece-${type}` + (slot === null ? ' draggable-piece' : '');
    if (slot) el.dataset.slot = slot;
    el.dataset.type = type;
    el.dataset.name = name;
    el.dataset.pieceId = id;
    el.style.backgroundColor = PIECE_COLORS[type] || '#999';

    // Name node
    const nameDiv = document.createElement('div');
    nameDiv.className = 'piece-name-editable';
    nameDiv.textContent = name;
    el.appendChild(nameDiv);

    // Subtext node (smaller, left-aligned)
    const subtextDiv = document.createElement('div');
    subtextDiv.className = 'piece-subtext';
    // Use textContent so quotes and punctuation are safe
    subtextDiv.textContent = text || '';
    el.appendChild(subtextDiv);

    // Special icon for Automation type (keeps original behavior)
    if (type === 'Automation') {
        const img = document.createElement('img');
        img.src = '../flowRenderer/images/automation.png';
        img.className = 'Automation-icon';
        img.alt = 'Automation Icon';
        el.appendChild(img);
    }

    // Drag behavior (tray pieces vs grid pieces)
    if (slot === null) {
        // Tray piece
        el.setAttribute('draggable', 'true');
        el.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                id,
                type,
                name,
                text,
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
                text,
                sourceSlot: slot
            }));
        });
        el.addEventListener('dblclick', () => {
            console.log(`[Renderer] Double-click to remove piece from slot: ${slot}`);
            if (removePiece(slot)) {
                if (window.checkPuzzleState) window.checkPuzzleState();
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

                console.log(`[Renderer] Dropping piece ${pieceData.id} to slot ${key}. Source: ${pieceData.sourceSlot}`);

                const [rNum, cNum] = key.split('_').map(Number);
                // Pass text through when adding
                if (addPiece(rNum, cNum, pieceData.type, pieceData.name, pieceData.id, pieceData.text)) {
                    if (pieceData.sourceSlot) removePiece(pieceData.sourceSlot);

                    // Remove tray copy if present
                    const trayPiece = document.querySelector(`.draggable-piece[data-piece-id="${pieceData.id}"]`);
                    if (trayPiece) trayPiece.remove();

                    if (window.checkPuzzleState) window.checkPuzzleState();
                    else console.log("[Renderer] checkPuzzleState not defined. Not updating puzzle state.");
                }
            });

            container.appendChild(slot);

            // Add vertical indicator only once per row (first column only)
            if (c === 1) {
                const rowIndicator = document.createElement('div');
                rowIndicator.classList.add('row-indicator');

                if (r >= 1) {
                    rowIndicator.style.background = 'linear-gradient(to bottom, #fff 50%, #000 50%)';
                } else if (r === 0) {
                    rowIndicator.style.background = 'linear-gradient(to bottom, #0F9ED5 50%, #4EA72E 50%)';
                } else {
                    rowIndicator.style.background = 'linear-gradient(to bottom,  #FFC000 50%, #FAFAB7 50%)';
                }

                rowIndicator.style.gridRow = idx + 1;
                rowIndicator.style.gridColumn = 1;
                container.appendChild(rowIndicator);
            }
        });
    }
    refreshSlotHighlights();
}

// ---------------------- Add / Remove Piece ----------------------
//
// NOTE: addPiece now accepts a `text` arg and stores it on internal `pieces` map.
// This ensures renderArrows and other logic can access full piece data.
export function addPiece(r, c, type, name, id, text = '') {

      console.log(`[addPiece] Called with r=${r}, c=${c}, type=${type}, name="${name}", id=${id}, text="${text}"`);

      
    const key = `${r}_${c}`;
    const slot = document.getElementById(key);
    if (!slot || slot.querySelector('.flow-piece')) return false;

    // Store piece with text
    pieces[key] = { r, c, type, name, id, text };

    const el = createPieceElement({ type, name, id, text, slot: key });
    slot.appendChild(el);

    // Highlight updates
    refreshSlotHighlights();

    // Re-render arrows if needed
    const svgEl = document.getElementById('flow-svg');
    if (svgEl) renderArrows(svgEl);

    return true;
}

export function removePiece(key) {
    const slot = document.getElementById(key);
    if (!slot) return false;

    const pieceEl = slot.querySelector('.flow-piece');
    if (!pieceEl) return false;

    pieceEl.remove();
    delete pieces[key];
    console.log(`[Renderer] Piece removed from internal state: ${key}. Remaining pieces: ${Object.keys(pieces).length}`);

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
    const trayInner = container.querySelector('#tray-inner');
    if (!trayInner) return;

    trayInner.innerHTML = '';
    trayInner.style.display = 'flex';
    trayInner.style.flexWrap = 'wrap';
    trayInner.style.gap = '8px';
    trayInner.style.overflow = 'visible';

    if (!trayInner.dataset.listenersSetup) {
        trayInner.addEventListener('dragover', (e) => e.preventDefault());
        trayInner.addEventListener('drop', (e) => {
            e.preventDefault();
            const pieceData = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (!pieceData?.id) return;
            if (pieceData.sourceSlot) {
                removePiece(pieceData.sourceSlot);
                const el = createPieceElement({
                    id: pieceData.id,
                    type: pieceData.type,
                    name: pieceData.name,
                    text: pieceData.text || ''
                });
                trayInner.appendChild(el);
                if (window.checkPuzzleState) window.checkPuzzleState();
            }
        });
        trayInner.dataset.listenersSetup = 'true';
    }

    piecesList.forEach(p => {
        // Pass the p.text if present; otherwise empty string
        console.log(`[Renderer] Creating piece: id=${p.id}, type=${p.type}, name="${p.name}", text="${p.text || ''}"`);
        const el = createPieceElement({ type: p.type, name: p.name, id: p.id, text: p.text || '' });
        trayInner.appendChild(el);
    });

    if (window.applyTrayZoom) window.applyTrayZoom();
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

    console.log(`[Renderer:Arrows] Drawing ${connections.length} connections.`);

    svgEl.setAttribute('viewBox', `0 0 ${colsToUse*SLOT_W} ${rows*SLOT_H}`);
    svgEl.style.width = `${colsToUse*SLOT_W}px`;
    svgEl.style.height = `${rows*SLOT_H}px`;

    connections.forEach(conn => {
        const [r1,c1] = conn.start.split('_').map(Number);
        const [r2,c2] = conn.end.split('_').map(Number);

        console.log(`[Renderer:Arrows] Connection: ${conn.start} -> ${conn.end}`);

        const a = getAnchorFromDOM(r1,c1,conn.startSegment||'bottom',svgEl);
        const b = getAnchorFromDOM(r2,c2,conn.endSegment||'top',svgEl);

        if (a.x === 0 && a.y === 0 && b.x === 0 && b.y === 0) {
            console.warn(`[Renderer:Arrows] Skipping connection ${conn.start} -> ${conn.end} due to zero coordinates.`);
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

// ---------------------- Helper: Load parsed DSL elements onto grid -------------
// Call this with the parsed output from your parseDSL(...) function:
// loadParsedItems(parsedResult.items)
export function loadParsedItems(parsedItems) {
    parsedItems.forEach(e => {
        // Only add if coordinates are valid and slot exists
        try {
            addPiece(e.r, e.c, e.type, e.name, e.id, e.text || '');
        } catch (err) {
            console.warn('[Renderer] Failed to add parsed item', e, err);
        }
    });
}
