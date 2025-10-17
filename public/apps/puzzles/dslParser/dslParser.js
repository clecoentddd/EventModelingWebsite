// DSL Parser Module - FINAL VERSION with FLOW, BACK_FLOW, SLICE support + RULES + LOGGING

// Helper: split by commas but respect quoted strings
const splitCsv = (line) =>
  line.split(/, ?(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((s) => s.trim());

// Helper: parse coordinates from a string (e.g., "3;1" or "3,1")
const parseCoords = (coordRaw, line, errors) => {
  const coord = coordRaw.replace(/\s+/g, '');
  let coordParts = coord.split(/[;:]/);
  if (coordParts.length !== 2) coordParts = coord.split(',');

  if (coordParts.length !== 2) {
    errors.push({ line, raw: coordRaw, reason: 'Invalid coordinate format (expected C;R or C,R)' });
    console.warn(`[ParseCoords] Invalid format: "${coordRaw}" on line ${line}`);
    return { c: NaN, r: NaN };
  }

  const c = parseInt(coordParts[0]);
  const r = parseInt(coordParts[1]);

  if (isNaN(c) || isNaN(r)) {
    errors.push({ line, raw: coordRaw, reason: 'Non-numeric coordinates' });
    console.warn(`[ParseCoords] Non-numeric: "${coordRaw}"`);
  }
  return { c, r };
};

// Helper: determine connector segments
function determineSegments(r1, c1, r2, c2) {
  let startSegment = 'bottom';
  let endSegment = 'top';

  if (r2 !== r1) {
    startSegment = r2 < r1 ? 'bottom' : 'top';
    endSegment = r2 < r1 ? 'top' : 'bottom';
  } else if (c2 > c1) {
    startSegment = 'right';
    endSegment = 'left';
  }

  return { startSegment, endSegment };
}

// --- SLICE RULE VALIDATION ---
export function validateSliceRules(slices, elements, errors) {
  for (const s of slices) {
    const sliceElements = elements.filter((e) => s.columns.includes(e.c));
    const types = new Set(sliceElements.map((e) => e.type.toUpperCase()));

    switch (s.type) {
      case 'STATE_CHANGE':
      case 'AUTOMATION':
        if (!types.has('UI') || !types.has('COMMAND') || !Array.from(types).some((t) => t === 'EVENT')) {
          errors.push({
            line: s.line,
            raw: s.raw,
            reason: `Invalid ${s.type}: must include UI, COMMAND, and ≥1 EVENT`,
          });
        }
        break;

      case 'VIEW_STATE':
        if (!types.has('READMODEL') || types.has('EVENT')) {
          errors.push({
            line: s.line,
            raw: s.raw,
            reason: `Invalid VIEW_STATE: needs ≥1 READMODEL and no EVENT`,
          });
        }
        break;

      case 'TRANSLATION':
        const required = ['EXTERNAL_EVENT', 'AUTOMATION', 'COMMAND', 'EVENT'];
        if (!required.every((t) => types.has(t))) {
          errors.push({
            line: s.line,
            raw: s.raw,
            reason: `Invalid TRANSLATION: must include ${required.join(', ')}`,
          });
        }
        break;
    }
  }
}

// --- 1. PARSE DSL FUNCTION ---
export function parseDSL(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const elements = [];
  const rawFlows = [];
  const slices = [];
  const errors = [];

  let description = '';
  let level = null;

  console.groupCollapsed('--- DSL Parsing Start ---');
  console.log(`[Parse] Total lines: ${lines.length}`);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNumber = i + 1;

    // --- DESCRIPTION ---
    if (raw.startsWith('DESCRIPTION')) {
      const match = raw.match(/DESCRIPTION\s*:?\s*"(.+)"$/);
      console.log(`[Parse] Found DESCRIPTION line: "${raw}"`);
      if (match) {
        description = match[1];
        console.log(`[Parse] ✅ Description set to: "${description}"`);
      } else {
        errors.push({ line: lineNumber, raw, reason: 'Invalid DESCRIPTION format (use quotes)' });
        console.warn(`[Parse] ⚠ Invalid DESCRIPTION format: ${raw}`);
      }
      continue;
    }

    // --- LEVEL ---
    if (raw.startsWith('LEVEL')) {
      const match = raw.match(/LEVEL\s*:?\s*(\d+)/);
      console.log(`[Parse] Found LEVEL line: "${raw}"`);
      if (match) {
        level = parseInt(match[1]);
        console.log(`[Parse] ✅ Level set to: ${level}`);
      } else {
        errors.push({ line: lineNumber, raw, reason: 'Invalid LEVEL (must be numeric)' });
        console.warn(`[Parse] ⚠ Invalid LEVEL: ${raw}`);
      }
      continue;
    }

    // --- ELEMENT ---
    if (raw.startsWith('ELEMENT:')) {
      const parts = splitCsv(raw.substring(8));
      if (parts.length < 4) {
        errors.push({ line: lineNumber, raw, reason: 'Too few parts in ELEMENT: (expected ID, Type, Name, Coords)' });
        console.warn(`[Parse] ⚠ ELEMENT too few parts: ${raw}`);
        continue;
      }

      const id = parseInt(parts[0].trim());
      if (isNaN(id)) {
        errors.push({ line: lineNumber, raw, reason: 'ELEMENT ID must be numeric' });
        console.warn(`[Parse] ⚠ Invalid ELEMENT ID: ${parts[0]}`);
        continue;
      }

      let type = parts[1];
      if (type.toLowerCase() === 'screen') type = 'UI';
      type = type.trim();
      const name = parts[2].replace(/^"|"$/g, '').trim();

      const { c, r } = parseCoords(parts[3], lineNumber, errors);
      if (isNaN(c) || isNaN(r)) continue;

      const element = { type, name, c, r, raw, line: lineNumber, id };
      elements.push(element);
      console.log(`[Parse] Added ELEMENT #${id} (${type}) "${name}" @ ${c},${r}`);

      continue;
    }

    // --- SLICE ---
    if (raw.startsWith('SLICE:')) {
      const parts = splitCsv(raw.substring(6));
      if (parts.length < 3) {
        errors.push({ line: lineNumber, raw, reason: 'Too few parts in SLICE: (expected Type, Name, Columns...)' });
        console.warn(`[Parse] ⚠ SLICE too few parts: ${raw}`);
        continue;
      }

      const type = parts[0].trim().toUpperCase();
      const name = parts[1].replace(/^"|"$/g, '').trim();
      const columns = parts.slice(2).map((v) => parseInt(v)).filter((v) => !isNaN(v));

      if (columns.length === 0) {
        errors.push({ line: lineNumber, raw, reason: 'SLICE must include at least one numeric column' });
        continue;
      }

      const validTypes = ['STATE_CHANGE', 'VIEW_STATE', 'AUTOMATION', 'TRANSLATION'];
      if (!validTypes.includes(type)) {
        errors.push({ line: lineNumber, raw, reason: `Invalid SLICE type: ${type}` });
        console.warn(`[Parse] ⚠ Invalid SLICE type: ${type}`);
        continue;
      }

      slices.push({ type, name, columns, raw, line: lineNumber });
      console.log(`[Parse] Added SLICE (${type}) "${name}" on cols ${columns.join(',')}`);
      continue;
    }

    // --- FLOW ---
    if (raw.startsWith('FLOW:')) {
      const match = raw.match(/FLOW:\s*(\d+)\s+to\s+(\d+)/);
      if (match) {
        const startId = parseInt(match[1]);
        const endId = parseInt(match[2]);
        rawFlows.push({ startId, endId, line: lineNumber, raw, style: 'solid' });
        console.log(`[Parse] FLOW ${startId} -> ${endId}`);
      } else {
        errors.push({ line: lineNumber, raw, reason: 'Invalid FLOW syntax (expected "FLOW: X to Y")' });
        console.warn(`[Parse] ⚠ Invalid FLOW line: ${raw}`);
      }
      continue;
    }

    // --- BACK_FLOW ---
    if (raw.startsWith('BACK_FLOW:')) {
      const match = raw.match(/BACK_FLOW:\s*(\d+)\s+to\s+(\d+)/);
      if (match) {
        const startId = parseInt(match[1]);
        const endId = parseInt(match[2]);
        rawFlows.push({ startId, endId, line: lineNumber, raw, style: 'back' });
        console.log(`[Parse] BACK_FLOW ${startId} -> ${endId}`);
      } else {
        errors.push({ line: lineNumber, raw, reason: 'Invalid BACK_FLOW syntax (expected "BACK_FLOW: X to Y")' });
        console.warn(`[Parse] ⚠ Invalid BACK_FLOW line: ${raw}`);
      }
      continue;
    }

    // Unrecognized line
    console.warn(`[Parse] ⚠ Ignored unknown line: "${raw}"`);
  }

  // Validate SLICE rules
  validateSliceRules(slices, elements, errors);

  console.log(`[Parse] Finished. Elements: ${elements.length}, Flows: ${rawFlows.length}, Slices: ${slices.length}, Errors: ${errors.length}`);
  console.log(`[Parse] Description: "${description}" | Level: ${level}`);
  console.groupEnd();

  return { items: elements, rawFlows, slices, errors, description, level };
}

// --- 2. RESOLVE CONNECTIONS FUNCTION ---
export function resolveConnections(items, rawFlows) {
  const pieces = {};
  const idToKeyMap = {};
  const connections = [];
  const usedIds = new Set();
  const errors = [];

  if (!rawFlows) rawFlows = [];
  if (!items) items = [];

  console.groupCollapsed('--- Connection Resolution Start ---');
  console.log(`[Connect] Items: ${items.length}, RawFlows: ${rawFlows.length}`);

  items.forEach((it) => {
    const key = `${it.r}_${it.c}`;
    pieces[key] = it;
    idToKeyMap[it.id] = key;
  });

  // A. Resolve explicit FLOW connections
  rawFlows.forEach((flow) => {
    const startKey = idToKeyMap[flow.startId];
    const endKey = idToKeyMap[flow.endId];

    if (!startKey || !endKey) {
      console.warn(`[Connect-Explicit] Missing piece for ${flow.startId} -> ${flow.endId}`);
      return;
    }

    const start = pieces[startKey];
    const end = pieces[endKey];
    const [r1, c1, r2, c2] = [startKey, endKey].flatMap((k) => k.split('_').map(Number));

    let startSegment;
    let endSegment;

    if (flow.style === 'back') {
      startSegment = 'left';
      endSegment = 'bottom';
      flow.style = 'dashed';
      if (!(start.type === 'Event' && end.type === 'ReadModel')) {
        errors.push({ line: flow.line, raw: flow.raw, reason: `Invalid BACK_FLOW: ${start.type} -> ${end.type}` });
        console.warn(`[Connect] ⚠ Invalid BACK_FLOW rule: ${start.type} -> ${end.type}`);
        return;
      }
    } else {
      ({ startSegment, endSegment } = determineSegments(r1, c1, r2, c2));
    }

    usedIds.add(flow.startId);
    connections.push({
      start: startKey,
      end: endKey,
      style: flow.style || 'solid',
      startSegment,
      endSegment,
    });
    console.log(`[Connect] ✅ ${flow.style.toUpperCase()} ${start.type}(${flow.startId}) -> ${end.type}(${flow.endId})`);
  });

  console.log(`[Connect] Total connections resolved: ${connections.length}`);
  if (errors.length > 0) console.warn('[RULE ERRORS]', errors);
  console.groupEnd();

  return { pieces, connections, errors };
}
