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

export function resetState() { pieces = {}; connections = []; }

export function createGrid(container, cols) {
  container.innerHTML = '';
  container.style.gridTemplateColumns = `repeat(${cols}, ${SLOT_W}px)`;
  
    // Column loop starts at 1
    for (let c = 1; c <= cols; c++) { 
    GRID_ROWS.forEach((r, idx) => {
      const slot = document.createElement('div');
      // ID uses 1-based column 'c'
      slot.id = `${r}_${c}`; 
      slot.className = 'grid-slot';
      slot.style.gridRow = idx + 1;
      // gridColumn is set directly to 'c'
      slot.style.gridColumn = c; 

      container.appendChild(slot);
    });
  }
}

export function addPiece(r, c, type, name, id) {
  const key = `${r}_${c}`;
  pieces[key] = { r, c, type, name, id };
  const slot = document.getElementById(key);
  if (!slot) return false;
  if (slot.querySelector('.flow-piece')) return false;

  const el = document.createElement('div');
  el.className = `flow-piece piece-${type}`;
  el.dataset.slot = key;
  el.style.backgroundColor = PIECE_COLORS[type] || '#999';

  // Icon Insertion Logic
  let innerHTML = `<div class="piece-name-editable" contenteditable="true">${name}</div>`;
  if (type === 'Wheel') {
      innerHTML += `<img src="./images/wheel.png" class="wheel-icon" alt="Wheel Icon">`;
  }
  el.innerHTML = innerHTML;

 el.addEventListener('dblclick', () => {
    const span = el.querySelector('.piece-name-editable');
    if (span) span.focus();
  });
  slot.appendChild(el);
  return true;
}

export function setConnections(conns) { connections = conns; }

// --- compute anchors from DOM rects ---
function getAnchorFromDOM(r, c, segment, svgEl) {
  // Uses 1-based column 'c'
  const key = `${r}_${c}`; 
  const el = document.querySelector(`.flow-piece[data-slot="${key}"]`);
  if (!el) return { x: 0, y: 0 };

  const rect = el.getBoundingClientRect();
  console.log(`Piece ${key} "${el.textContent.trim()}" DOM rect:`, rect);

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
  console.log(`Anchor for piece ${key} (${segment}):`, svgPoint);
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

    console.log(`Drawing arrow from ${conn.start} to ${conn.end}`);
    console.log('Start:', a, 'End:', b);

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