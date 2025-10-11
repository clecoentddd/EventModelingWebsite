// DSL Parser Module
export function parseDSL(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const items = [];
  const errors = [];

  // Helper: split by commas but respect quoted strings
  const splitCsv = (line) => line.split(/, ?(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s => s.trim());

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const parts = splitCsv(raw);
    if (parts.length < 3) { errors.push({ line: i + 1, raw, reason: 'Too few parts' }); continue; }
    let type = parts[0];
    if (type.toLowerCase() === 'screen') type = 'UI';
    type = type.trim();
    const name = parts[1].replace(/^"|"$/g, '').trim();

    // coords: allow forms 3;1 or 3:1 or 3,1 (last fallback)
    const coord = parts[2].replace(/\s+/g, '');
    let coordParts = coord.split(/[;:]/);
    if (coordParts.length !== 2) coordParts = coord.split(',');
    if (coordParts.length !== 2) { errors.push({ line: i + 1, raw, reason: 'Invalid coords' }); continue; }
    const c = parseInt(coordParts[0]);
    const r = parseInt(coordParts[1]);
    if (isNaN(c) || isNaN(r)) { errors.push({ line: i + 1, raw, reason: 'Non-numeric coords' }); continue; }

    let conn = null;
    if (parts.length >= 5) {
      const startSeg = parts[3];
      const endSeg = parts[4];
      let offset = 1;
      if (parts.length >= 6) {
        const v = parseInt(parts[5]);
        if (!isNaN(v) && v >= 2) offset = v;
      }
      conn = { startSegment: startSeg, endSegment: endSeg, targetOffset: offset };
    }

    items.push({ type, name, c, r, conn, raw, line: i + 1 });
  }

  return { items, errors };
}

export function resolveConnections(items) {
  const pieces = {};
  const connections = [];
  items.forEach(it => { const key = `${it.r}_${it.c}`; if (!pieces[key]) pieces[key] = it; });

  for (let i = 0; i < items.length; i++) {
    const start = items[i];
    if (!start.conn) continue;

    // Command forking
    if (start.type === 'Command') {
      let j = i + 1; let forks = 0;
      while (j < items.length && items[j].type === 'Event') {
        const end = items[j];
        connections.push({
          start: `${start.r}_${start.c}`,
          end: `${end.r}_${end.c}`,
          startSegment: start.conn.startSegment,
          endSegment: start.conn.endSegment
        });
        forks++; j++;
      }
      if (forks > 0) continue; // don't do N+X if we forked
    }

    // standard N+X
    const targetIdx = i + start.conn.targetOffset;
    if (targetIdx < items.length) {
      const end = items[targetIdx];
      connections.push({
        start: `${start.r}_${start.c}`,
        end: `${end.r}_${end.c}`,
        startSegment: start.conn.startSegment,
        endSegment: start.conn.endSegment
      });
    }
  }

  return { pieces, connections };
}
