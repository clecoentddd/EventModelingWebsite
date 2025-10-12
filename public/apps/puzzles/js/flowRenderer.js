// public/apps/puzzles/js/flowRenderer.js

// Rendering module
export const GRID_ROWS = [1, 0, -1];
export const SLOT_W = 260, SLOT_H = 260;
let pieces = {}, connections = [];

// Color mapping for pieces
const PIECE_COLORS = {
  Command: '#0F9ED5',
  Event: '#FFC000',
  ReadModel: '#4EA72E',
  Wheel: '#ffffff',
  UI: '#ffffff'
};

// --- CORE STATE MANAGEMENT ---

export function resetState() { pieces = {}; connections = []; }

export function getPieces() { return pieces; } // Export current pieces for solution check


// --- GRID RENDERING AND D&D SETUP ---

export function createGrid(container, cols) {
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${cols}, ${SLOT_W}px)`;
  
    // Column loop starts at 1
    for (let c = 1; c <= cols; c++) { 
    GRID_ROWS.forEach((r, idx) => {
      const slot = document.createElement('div');
      const key = `${r}_${c}`;
      slot.id = key; 
      slot.className = 'grid-slot';
      slot.style.gridRow = idx + 1;
      slot.style.gridColumn = c; 

      // --- D&D LISTENERS for Grid Slots ---
      slot.addEventListener('dragover', (e) => {
          e.preventDefault(); // ESSENTIAL: Allows the piece to be dropped
          slot.classList.add('drag-hover');
      });

      slot.addEventListener('dragleave', () => {
          slot.classList.remove('drag-hover');
      });

      slot.addEventListener('drop', (e) => {
          e.preventDefault();
          slot.classList.remove('drag-hover');
          
          // Get piece data from the drag event
          const pieceData = JSON.parse(e.dataTransfer.getData('text/plain'));
          
          if (!pieceData || !pieceData.type) return;

          // Extract slot coordinates
          const [r, c] = key.split('_').map(Number);
          
          // Attempt to place the piece
          if (addPiece(r, c, pieceData.type, pieceData.name, pieceData.id)) {
              
              // 1. Handle piece movement (if dropped from another slot)
              if (pieceData.sourceSlot) {
                  removePiece(pieceData.sourceSlot);
              }

              // 2. Remove the piece from the tray (if dropped from the tray)
              const trayPiece = document.querySelector(`.draggable-piece[data-piece-id="${pieceData.id}"]`);
              if (trayPiece) {
                  trayPiece.remove();
              }
              
              // Call function to check puzzle state (defined in gameLoader.js)
              window.checkPuzzleState(); 
          }
      });
      // --- END D&D LISTENERS for Grid Slots ---

      container.appendChild(slot);
    });
  }
}


// --- PIECE PLACEMENT, MOVEMENT, AND REMOVAL ---

export function addPiece(r, c, type, name, id) {
  const key = `${r}_${c}`;
  pieces[key] = { r, c, type, name, id };
  const slot = document.getElementById(key);
  if (!slot) return false;
  // Check if slot is already occupied
  if (slot.querySelector('.flow-piece')) return false;

  const el = document.createElement('div');
  el.className = `flow-piece piece-${type}`;
  el.dataset.pieceId = id; // IMPORTANT: Unique ID for D&D tracking
  el.dataset.slot = key;
  el.style.backgroundColor = PIECE_COLORS[type] || '#999';

  // Icon Insertion Logic
  // NOTE: Removed contenteditable="true" for puzzle mode, pieces should be fixed
  let innerHTML = `<div class="piece-name-editable">${name}</div>`;
  if (type === 'Wheel') {
      innerHTML += `<img src="./images/wheel.png" class="wheel-icon" alt="Wheel Icon">`;
  }
  el.innerHTML = innerHTML;

  // Make placed pieces draggable for MOVEMENT
  el.setAttribute('draggable', 'true');
  
  // Attach dragstart listener for movement
  el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({
          id: id,
          type: type,
          name: name,
          sourceSlot: key // Track the source slot for moving pieces
      }));
  });

  // Dblclick now removes the piece and potentially returns it to the tray
  el.addEventListener('dblclick', () => {
      if (removePiece(key)) {
          // You could optionally re-render the piece back into the tray here
          // For simplicity now, we just remove it.
          // To return to tray: renderAvailablePieces(document.getElementById('piece-tray'), [{id, type, name}]);
          
          // Call function to check puzzle state (defined in gameLoader.js)
          window.checkPuzzleState();
      }
  });
  
  slot.appendChild(el);
  return true;
}

export function removePiece(key) {
    const slot = document.getElementById(key);
    if (slot) {
        const pieceEl = slot.querySelector('.flow-piece');
        if (pieceEl) {
            pieceEl.remove();
            delete pieces[key];
            return true;
        }
    }
    return false;
}


// --- TRAY RENDERING AND LISTENERS ---

export function renderAvailablePieces(container, pieces) {
    // Clear the container while keeping the H2 header
    const header = container.querySelector('h2');
    container.innerHTML = '';
    if (header) container.appendChild(header);

    const piecesContainer = document.createElement('div');
    piecesContainer.id = 'tray-pieces-container';
    container.appendChild(piecesContainer);

    pieces.forEach(p => {
        const el = document.createElement('div');
        
        el.className = `flow-piece piece-${p.type} draggable-piece`;
        el.dataset.type = p.type;
        el.dataset.name = p.name;
        el.dataset.pieceId = p.id; 
        
        el.setAttribute('draggable', 'true'); 
        el.style.backgroundColor = PIECE_COLORS[p.type] || '#999';

        let innerHTML = `<div class="piece-name-editable">${p.name}</div>`;
        if (p.type === 'Wheel') {
            innerHTML += `<img src="./images/wheel.png" class="wheel-icon" alt="Wheel Icon">`;
        }
        el.innerHTML = innerHTML;

        piecesContainer.appendChild(el);
    });
    // Set up drag listeners immediately after rendering
    setupDragListeners();
}

// Function to attach dragstart listeners to all pieces in the tray
function setupDragListeners() {
    const trayPieces = document.querySelectorAll('.draggable-piece');
    trayPieces.forEach(el => {
        el.addEventListener('dragstart', (e) => {
            // Set piece data for transfer (sourceSlot is null for tray pieces)
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


// --- ARROW RENDERING ---

export function setConnections(conns) { connections = conns; }

// --- compute anchors from DOM rects ---
function getAnchorFromDOM(r, c, segment, svgEl) {
  // Uses 1-based column 'c'
  const key = `${r}_${c}`; 
  const el = document.querySelector(`.flow-piece[data-slot="${key}"]`);
  if (!el) return { x: 0, y: 0 };

  const rect = el.getBoundingClientRect();

  let x = rect.left + rect.width / 2;
  let y = rect.top + rect.height / 2;
  switch(segment) {
    case 'top': y = rect.top; break;
    case 'bottom': y = rect.bottom; break;
    case 'left': x = rect.left; break;
    case 'right': x = rect.right; break;
  }

  const pt = svgEl.createSVGPoint();
  pt.x = x;
  pt.y = y;
  const svgPoint = pt.matrixTransform(svgEl.getScreenCTM().inverse());
  return svgPoint;
}

export function renderArrows(svgEl) {
  svgEl.innerHTML = '';
  // Removed '+ 1' since p.c is now 1-based
  const cols = Math.max(...Object.values(pieces).map(p => p.c)) || 1; 
  const rows = GRID_ROWS.length;

  svgEl.setAttribute('viewBox', `0 0 ${cols*SLOT_W} ${rows*SLOT_H}`);
  svgEl.style.width = `${cols*SLOT_W}px`;
  svgEl.style.height = `${rows*SLOT_H}px`;

  connections.forEach(conn => {
    const [r1,c1] = conn.start.split('_').map(Number);
    const [r2,c2] = conn.end.split('_').map(Number);

    const a = getAnchorFromDOM(r1, c1, conn.startSegment || 'bottom', svgEl);
    const b = getAnchorFromDOM(r2, c2, conn.endSegment || 'top', svgEl);

    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', `M ${a.x} ${a.y} C ${a.x} ${(a.y+b.y)/2}, ${b.x} ${(a.y+b.y)/2}, ${b.x} ${b.y}`);
    path.setAttribute('stroke','#475569');
    path.setAttribute('fill','none');
    path.setAttribute('stroke-width','2');
    svgEl.appendChild(path);

    const marker = document.createElementNS('http://www.w3.org/2000/svg','circle');
    marker.setAttribute('cx', b.x);
    marker.setAttribute('cy', b.y);
    marker.setAttribute('r',4);
    marker.setAttribute('fill','#475569');
    svgEl.appendChild(marker);
  });
}