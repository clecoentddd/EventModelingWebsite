// public/apps/puzzles/js/flowRenderer.js - FINAL WITH HIGHLIGHT FIX

export const GRID_ROWS = [1, 0, -1];
export const SLOT_W = 260, SLOT_H = 260;
let pieces = {}, connections = [];

const PIECE_COLORS = {
  Command: '#0F9ED5',
  Event: '#FFC000',
  ReadModel: '#4EA72E',
  Wheel: '#ffffff',
  UI: '#ffffff'
};

export function resetState() { pieces = {}; connections = []; }

export function getPieces() { return pieces; }

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

      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-hover');
      });

      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-hover');

        const pieceData = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (!pieceData || !pieceData.type) return;

        const [r, c] = key.split('_').map(Number);
        if (addPiece(r, c, pieceData.type, pieceData.name, pieceData.id)) {
          if (pieceData.sourceSlot) removePiece(pieceData.sourceSlot);

          const trayPiece = document.querySelector(`.draggable-piece[data-piece-id="${pieceData.id}"]`);
          if (trayPiece) trayPiece.remove();

          window.checkPuzzleState();
        }
      });
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

  const solutionData = window.currentGameConfig?.solutionMap?.[key];
  if (solutionData && solutionData.dslId) {
    el.setAttribute('data-piece-id', solutionData.dslId);
    console.log(`[Renderer] Piece placed at ${key}. Set data-piece-id to ${solutionData.dslId}`);
  } else {
    console.warn(`[Renderer] Piece placed at ${key} but no DSL ID found in solutionMap.`);
  }

  let innerHTML = `<div class="piece-name-editable">${name}</div>`;
  if (type === 'Wheel') innerHTML += `<img src="./images/wheel.png" class="wheel-icon" alt="Wheel Icon">`;
  el.innerHTML = innerHTML;

  el.setAttribute('draggable', 'true');
  el.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id: id,
      type: type,
      name: name,
      sourceSlot: key
    }));
  });

  el.addEventListener('dblclick', () => {
    if (removePiece(key)) window.checkPuzzleState();
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

export function renderAvailablePieces(container, pieces) {
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
    if (p.type === 'Wheel') innerHTML += `<img src="./images/wheel.png" class="wheel-icon" alt="Wheel Icon">`;
    el.innerHTML = innerHTML;

    piecesContainer.appendChild(el);
  });
  setupDragListeners();
}

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

export function setConnections(conns) { connections = conns; }

function getAnchorFromDOM(r, c, segment, svgEl) {
  const key = `${r}_${c}`;
  const slot = document.getElementById(key);
  if (!slot) {
    console.warn(`[Anchor Log] Slot ${key} not found!`);
    return { x: 0, y: 0 };
  }

  const el = slot.querySelector('.flow-piece');
  if (!el) {
    console.warn(`[Anchor Log] No piece in slot ${key}`);
    return { x: 0, y: 0 };
  }

  const pieceRect = el.getBoundingClientRect();
  const svgRect = svgEl.getBoundingClientRect();

  // Default to center
  let x = pieceRect.left + pieceRect.width / 2;
  let y = pieceRect.top + pieceRect.height / 2;

  // Adjust based on segment
  switch (segment) {
    case 'top':
      y = pieceRect.top;
      x = pieceRect.left + pieceRect.width / 2;
      break;
    case 'bottom':
      y = pieceRect.bottom;
      x = pieceRect.left + pieceRect.width / 2;
      break;
    case 'left':
      x = pieceRect.left;
      y = pieceRect.top + pieceRect.height / 2;
      break;
    case 'right':
      x = pieceRect.right;
      y = pieceRect.top + pieceRect.height / 2;
      break;
  }

  const x_svg_rel = x - svgRect.left;
  const y_svg_rel = y - svgRect.top;

  const scaleX = svgEl.viewBox.baseVal.width / svgRect.width;
  const scaleY = svgEl.viewBox.baseVal.height / svgRect.height;

  const finalX = x_svg_rel * scaleX;
  const finalY = y_svg_rel * scaleY;

  console.log(`[Anchor Log] Slot ${key} (${segment}):
    pieceRect: left=${pieceRect.left.toFixed(2)}, top=${pieceRect.top.toFixed(2)}, width=${pieceRect.width.toFixed(2)}, height=${pieceRect.height.toFixed(2)}
    svgRect: left=${svgRect.left.toFixed(2)}, top=${svgRect.top.toFixed(2)}, width=${svgRect.width.toFixed(2)}, height=${svgRect.height.toFixed(2)}
    Segment-adjusted screen: X=${x.toFixed(2)}, Y=${y.toFixed(2)}
    SVG final: X=${finalX.toFixed(2)}, Y=${finalY.toFixed(2)}
  `);

  return { x: finalX, y: finalY };
}


export function renderArrows(svgEl) {
  svgEl.innerHTML = '';

  const pieceValues = Object.values(pieces);
  const maxCol = pieceValues.length > 0
    ? Math.max(...pieceValues.map(p => p.c))
    : 0;

  const colsToUse = Math.max(maxCol + 1, 6);
  const rows = GRID_ROWS.length;

  svgEl.setAttribute('viewBox', `0 0 ${colsToUse * SLOT_W} ${rows * SLOT_H}`);
  svgEl.style.width = `${colsToUse * SLOT_W}px`;
  svgEl.style.height = `${rows * SLOT_H}px`;

  console.log(`[Render Log] Drawing ${connections.length} connection(s). ViewBox: 0 0 ${colsToUse * SLOT_W} ${rows * SLOT_H}`);

  connections.forEach(conn => {
    const [r1, c1] = conn.start.split('_').map(Number);
    const [r2, c2] = conn.end.split('_').map(Number);

    const a = getAnchorFromDOM(r1, c1, conn.startSegment || 'bottom', svgEl);
    const b = getAnchorFromDOM(r2, c2, conn.endSegment || 'top', svgEl);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const controlPointY = (a.y + b.y) / 2;

    path.setAttribute('d', `M ${a.x} ${a.y} C ${a.x} ${controlPointY}, ${b.x} ${controlPointY}, ${b.x} ${b.y}`);

    // --- DASHED ARROW LOGIC ---
    const styleRaw = conn.style;
    console.log(`[DEBUG] Connection ${conn.start} -> ${conn.end} raw style: "${styleRaw}"`);

    const styleType = (styleRaw || '').trim().toLowerCase();
    const isDashed = styleType === 'dashed';
    console.log(`[DEBUG] Normalized style: "${styleType}", isDashed: ${isDashed}`);

    const strokeColorFinal = isDashed ? '#000000' : '#475569';

    path.setAttribute('stroke', strokeColorFinal);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '2');

    if (isDashed) path.setAttribute('stroke-dasharray', '5,5');

    svgEl.appendChild(path);

    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('cx', b.x);
    marker.setAttribute('cy', b.y);
    marker.setAttribute('r', 4);
    marker.setAttribute('fill', strokeColorFinal);
    svgEl.appendChild(marker);

    console.log(`[Render Log] Connection ${conn.start} -> ${conn.end} drawn from (${a.x.toFixed(2)}, ${a.y.toFixed(2)}) to (${b.x.toFixed(2)}, ${b.y.toFixed(2)}) with style: ${styleType || 'solid'}`);
  });
}

