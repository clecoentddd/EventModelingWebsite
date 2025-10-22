// DSL Parser Module - FINAL VERSION
// FLOW, BACK_FLOW, SLICE, TEXT support + RULES + LOGGING

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// TEXT PARSING SUPPORT
// ---------------------------------------------------------------------------

function parseTextBlock(raw, line, errors) {
  const content = raw.substring(5).trim(); // remove "TEXT:"
  if (!content) {
    errors.push({ line, raw, reason: 'Empty TEXT block' });
    return {};
  }

  // Split by ";" and trim
  const parts = content.split(';').map(p => p.trim()).filter(Boolean);
  const textObj = {};

  for (const part of parts) {
    const [key, ...rest] = part.split(':');
    if (!key || rest.length === 0) {
      errors.push({ line, raw: part, reason: 'Invalid TEXT key:value format' });
      continue;
    }
    const value = rest.join(':').trim();
    textObj[key.trim()] = value;
  }

  return textObj;
}

// ---------------------------------------------------------------------------
// SLICE RULE VALIDATION
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 1. MAIN DSL PARSER
// ---------------------------------------------------------------------------

export function parseDSL(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const elements = [];
  const rawFlows = [];
  const slices = [];
  const errors = [];

  let description = '';
  let level = null;
  let lastElement = null;

  console.groupCollapsed('--- DSL Parsing Start ---');
  console.log(`[Parse] Total lines: ${lines.length}`);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNumber = i + 1;

    // --- DESCRIPTION ---
    if (raw.startsWith('DESCRIPTION')) {
      const match = raw.match(/DESCRIPTION\s*:?\s*"(.+)"$/);
      if (match) description = match[1];
      else errors.push({ line: lineNumber, raw, reason: 'Invalid DESCRIPTION format (use quotes)' });
      continue;
    }

    // --- LEVEL ---
    if (raw.startsWith('LEVEL')) {
      const match = raw.match(/LEVEL\s*:?\s*(\d+)/);
      if (match) level = parseInt(match[1]);
      else errors.push({ line: lineNumber, raw, reason: 'Invalid LEVEL (must be numeric)' });
      continue;
    }

    // --- ELEMENT ---
    if (raw.startsWith('ELEMENT:')) {
      const parts = splitCsv(raw.substring(8));
      if (parts.length < 4) {
        errors.push({ line: lineNumber, raw, reason: 'Too few parts in ELEMENT:' });
        continue;
      }

      const id = parseInt(parts[0].trim());
      if (isNaN(id)) {
        errors.push({ line: lineNumber, raw, reason: 'ELEMENT ID must be numeric' });
        continue;
      }

      let type = parts[1].trim();
      if (type.toLowerCase() === 'screen') type = 'UI';
      const name = parts[2].replace(/^"|"$/g, '').trim();

      const { c, r } = parseCoords(parts[3], lineNumber, errors);
      if (isNaN(c) || isNaN(r)) continue;

      const element = { id, type, name, c, r, raw, line: lineNumber };
      elements.push(element);
      lastElement = element;
      continue;
    }

    // --- TEXT ---
    if (raw.startsWith('TEXT:')) {
    const textRaw = raw.substring(5).trim();
    const text = textRaw
        .split(';')          // split by semicolon
        .map(s => s.trim())  // trim spaces before/after
        .join('\n');         // join with new line
    if (lastElement) {
        lastElement.text = text;
        console.log(`[DSL Parser] Attached TEXT to element ID=${lastElement.id}:`, text);
    } else {
        errors.push({ line: i+1, raw, reason: 'TEXT without preceding ELEMENT' });
        console.warn(`[DSL Parser] TEXT ignored, no previous ELEMENT`);
    }
    continue;
}

    // --- SLICE ---
    if (raw.startsWith('SLICE:')) {
      const parts = splitCsv(raw.substring(6));
      if (parts.length < 3) {
        errors.push({ line: lineNumber, raw, reason: 'Too few parts in SLICE:' });
        continue;
      }

      const type = parts[0].trim().toUpperCase();
      const name = parts[1].replace(/^"|"$/g, '').trim();
      const columns = parts.slice(2).map((v) => parseInt(v)).filter((v) => !isNaN(v));

      if (columns.length === 0)
        errors.push({ line: lineNumber, raw, reason: 'SLICE must include numeric columns' });
      else slices.push({ type, name, columns, raw, line: lineNumber });
      continue;
    }

    // --- FLOW ---
    if (raw.startsWith('FLOW:')) {
      const match = raw.match(/FLOW:\s*(\d+)\s+to\s+(\d+)/);
      if (match)
        rawFlows.push({ startId: +match[1], endId: +match[2], line: lineNumber, raw, style: 'solid' });
      else errors.push({ line: lineNumber, raw, reason: 'Invalid FLOW syntax' });
      continue;
    }

    // --- BACK_FLOW ---
    if (raw.startsWith('BACK_FLOW:')) {
      const match = raw.match(/BACK_FLOW:\s*(\d+)\s+to\s+(\d+)/);
      if (match)
        rawFlows.push({ startId: +match[1], endId: +match[2], line: lineNumber, raw, style: 'back' });
      else errors.push({ line: lineNumber, raw, reason: 'Invalid BACK_FLOW syntax' });
      continue;
    }

    // --- Unknown line ---
    errors.push({ line: lineNumber, raw, reason: 'Unknown directive' });
  }

  validateSliceRules(slices, elements, errors);

  console.groupEnd();
  return { items: elements, rawFlows, slices, errors, description, level };
}

// ---------------------------------------------------------------------------
// 2. CONNECTION RESOLUTION
// ---------------------------------------------------------------------------

export function resolveConnections(items, rawFlows) {
  const pieces = {};
  const idToKeyMap = {};
  const connections = [];
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

  rawFlows.forEach((flow) => {
    const startKey = idToKeyMap[flow.startId];
    const endKey = idToKeyMap[flow.endId];

    if (!startKey || !endKey) {
      console.warn(`[Connect] Missing element for ${flow.startId} -> ${flow.endId}`);
      return;
    }

    const start = pieces[startKey];
    const end = pieces[endKey];
    const [r1, c1, r2, c2] = [startKey, endKey].flatMap((k) => k.split('_').map(Number));

    let startSegment, endSegment;
    if (flow.style === 'back') {
      startSegment = 'left';
      endSegment = 'bottom';
      flow.style = 'dashed';
      if (!(start.type === 'Event' && end.type === 'ReadModel')) {
        errors.push({ line: flow.line, raw: flow.raw, reason: `Invalid BACK_FLOW: ${start.type} -> ${end.type}` });
        return;
      }
    } else {
      ({ startSegment, endSegment } = determineSegments(r1, c1, r2, c2));
    }

    connections.push({
      start: startKey,
      end: endKey,
      style: flow.style || 'solid',
      startSegment,
      endSegment,
    });
  });

  console.groupEnd();
  return { pieces, connections, errors };
}
