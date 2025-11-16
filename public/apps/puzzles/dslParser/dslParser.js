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
// ALGORITHM POSITION VALIDATION
// ---------------------------------------------------------------------------

export function validateAlgorithmPositioning(elements, rawFlows, errors) {
  // Check for duplicate positions (same c, r)
  const positionMap = {};
  elements.forEach(el => {
    const key = `${el.c},${el.r}`;
    if (!positionMap[key]) positionMap[key] = [];
    positionMap[key].push(el);
  });
  Object.entries(positionMap).forEach(([key, els]) => {
    if (els.length > 1) {
      const names = els.map(e => `"${e.name}"`).join(', ');
      els.forEach(e => {
        errors.push({
          line: e.line,
          raw: e.raw,
          reason: `Multiple elements share the same position (${key}): ${names}`,
          type: 'positioning'
        });
      });
    }
  });
  // Build flow map for command -> events relationships
  const flowMap = {};
  rawFlows.forEach(flow => {
    if (!flowMap[flow.startId]) flowMap[flow.startId] = [];
    flowMap[flow.startId].push(flow.endId);
  });

  // Strict flow direction validation
  rawFlows.forEach(flow => {
    const from = elements.find(e => e.id === flow.startId);
    const to = elements.find(e => e.id === flow.endId);
    if (!(from && to && from.type && to.type)) return;
    const fromType = from.type.toUpperCase();
    const toType = to.type.toUpperCase();
    // Enforce: SCREEN cannot be linked to AUTOMATION
    if (fromType === 'SCREEN' && toType === 'AUTOMATION') {
      errors.push({
        line: flow.line,
        raw: `${fromType} -> ${toType}`,
        reason: `Invalid FLOW: SCREEN cannot be linked to AUTOMATION (from "${from.name}" to "${to.name}")`,
        type: 'flow-type'
      });
      return;
    }
    const allowed = [
      ["SCREEN", "COMMAND"],
      ["COMMAND", "EVENT"],
      ["EVENT", "READMODEL"],
      ["AUTOMATION", "COMMAND"],
      ["AUTOMATION", "EVENT"],
      ["COMMAND", "AUTOMATION"],
      ["READMODEL", "SCREEN"], // allow readmodel to screen for view flows
      ["READMODEL", "AUTOMATION"], // allow readmodel to automation
      ["EXTERNALEVENT", "AUTOMATION"],
      ["EXTERNAL_EVENT", "AUTOMATION"]
    ];
    const isAllowed = allowed.some(([a, b]) => fromType === a && toType === b);
    if (!isAllowed) {
      const warn = {
        line: flow.line, // Always use the FLOW line number
        raw: `${fromType} -> ${toType}`,
        reason: `Invalid FLOW: Not allowed from ${fromType} to ${toType} (from "${from.name}" to "${to.name}")`,
        type: 'flow-type'
      };
      errors.push(warn);
    }
  });
  console.log('[DSLParser] Errors after SCREEN->EVENT flow check:', errors);

  // Group elements by type for analysis
  const elementById = {};
  elements.forEach(el => elementById[el.id] = el);

  elements.forEach(element => {
    const { id, type, r, c, line, raw } = element;
    let expectedRow = null;
    let reason = '';

    switch (type.toUpperCase()) {
      case 'SCREEN':
        if (r < 1) {
          expectedRow = 1;
          reason = 'Screens should be at row 1 or higher';
        }
        break;

      case 'COMMAND':
        if (r !== 0) {
          expectedRow = 0;
          reason = 'Commands should be at row 0';
        }
        break;

      case 'EVENT':
        if (r >= 0) {
          expectedRow = -1;
          reason = 'Events should be at row -1 or lower';
        }
        break;

      case 'EXTERNALEVENT':
      case 'EXTERNAL_EVENT':
        // External events should be at the lowest level
        const allEventRows = elements
          .filter(el => el.type.toUpperCase().includes('EVENT'))
          .map(el => el.r);
        const lowestRow = Math.min(...allEventRows);
        
        if (r > lowestRow || r >= -1) {
          expectedRow = Math.min(lowestRow, -2);
          reason = 'External Events should be at the lowest level (typically -2 or lower)';
        }
        break;

      case 'AUTOMATION':
        if (r < 1) {
          expectedRow = 1;
          reason = 'Automations should be at row 1 or higher';
        }
        break;

      case 'READMODEL':
        if (r !== 0) {
          expectedRow = 0;
          reason = 'ReadModels should be at row 0';
        }
        break;
    }

    // Check multi-event branching from commands
    if (type.toUpperCase() === 'COMMAND' && flowMap[id]) {
      const connectedEvents = flowMap[id]
        .map(targetId => elementById[targetId])
        .filter(el => el && el.type.toUpperCase() === 'EVENT');

      if (connectedEvents.length > 1) {
        // Check if events are in consecutive columns
        const eventColumns = connectedEvents.map(e => e.c).sort((a, b) => a - b);
        let hasColumnGaps = false;
        for (let i = 1; i < eventColumns.length; i++) {
          if (eventColumns[i] - eventColumns[i-1] > 1) {
            hasColumnGaps = true;
            break;
          }
        }

        if (hasColumnGaps) {
          connectedEvents.forEach(event => {
            errors.push({
              line: event.line,
              raw: event.raw,
              reason: `Element "${event.name}" should be positioned in consecutive columns with other events from command ${id}`,
              type: 'positioning'
            });
          });
        }
      }
    }

    if (expectedRow !== null) {
      errors.push({
        line,
        raw,
        reason: `Element "${element.name}" should be positioned at row ${expectedRow}, but is at row ${r}. ${reason}`,
        type: 'positioning'
      });
    }
  });
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

  const lines = text.split('\n');
  const elements = [];
  const rawFlows = [];
  const slices = [];
  const errors = [];

  let description = '';
  let level = null;
  let lastElement = null;
  let currentTextLines = [];
  let inTextBlock = false;

  console.groupCollapsed('--- DSL Parsing Start ---');
  console.log(`[Parse] Total lines: ${lines.length}`);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNumber = i + 1;
    const trimmed = raw.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      // Still count as a line, but skip processing
      continue;
    }

    // Handle ongoing TEXT block
    if (inTextBlock) {
      if (trimmed && (trimmed.startsWith('DESCRIPTION') || trimmed.startsWith('LEVEL') || trimmed.startsWith('ELEMENT') || trimmed.startsWith('SLICE') || trimmed.startsWith('FLOW') || trimmed.startsWith('BACK_FLOW') || trimmed.startsWith('TEXT'))) {
        // End of text block, attach to lastElement
        if (lastElement) {
          lastElement.text = currentTextLines.join('\n').trim();
          console.log(`[DSL Parser] Attached TEXT to element ID=${lastElement.id}:`, lastElement.text);
        }
        currentTextLines = [];
        inTextBlock = false;
        // Fall through to process this line
      } else {
        currentTextLines.push(raw);
        continue;
      }
    }

    // --- DESCRIPTION ---
    if (trimmed.startsWith('DESCRIPTION')) {
      const match = trimmed.match(/DESCRIPTION\s*:?\s*"(.+)"$/);
      if (match) description = match[1];
      else errors.push({ line: lineNumber, raw, reason: 'Invalid DESCRIPTION format (use quotes)' });
      continue;
    }

    // --- LEVEL ---
    if (trimmed.startsWith('LEVEL')) {
      const match = trimmed.match(/LEVEL\s*:?\s*(\d+)/);
      if (match) level = parseInt(match[1]);
      else errors.push({ line: lineNumber, raw, reason: 'Invalid LEVEL (must be numeric)' });
      continue;
    }

    // --- ELEMENT ---
    if (trimmed.startsWith('ELEMENT:')) {
      const parts = splitCsv(trimmed.substring(8));
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
      // Use 'SCREEN' as the official keyword, do not convert to 'UI'
      if (type.toLowerCase() === 'screen') type = 'SCREEN';
      const name = parts[2].replace(/^"|"$/g, '').trim();

      const { c, r } = parseCoords(parts[3], lineNumber, errors);
      if (isNaN(c) || isNaN(r)) continue;

      const element = { id, type, name, c, r, raw, line: lineNumber };
      elements.push(element);
      lastElement = element;
      continue;
    }

    // --- TEXT ---
    if (trimmed.startsWith('TEXT:')) {
      inTextBlock = true;
      continue;
    }

    // --- SLICE ---
    if (trimmed.startsWith('SLICE:')) {
      const parts = splitCsv(trimmed.substring(6));
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
    if (trimmed.startsWith('FLOW:')) {
      const match = trimmed.match(/FLOW:\s*(\d+)\s+to\s+(\d+)/);
      if (match)
        rawFlows.push({ startId: +match[1], endId: +match[2], line: lineNumber, raw, style: 'solid' });
      else errors.push({ line: lineNumber, raw, reason: 'Invalid FLOW syntax' });
      continue;
    }

    // --- BACK_FLOW ---
    if (trimmed.startsWith('BACK_FLOW:')) {
      const match = trimmed.match(/BACK_FLOW:\s*(\d+)\s+to\s+(\d+)/);
      if (match)
        rawFlows.push({ startId: +match[1], endId: +match[2], line: lineNumber, raw, style: 'back' });
      else errors.push({ line: lineNumber, raw, reason: 'Invalid BACK_FLOW syntax' });
      continue;
    }

    // --- Unknown line ---
    errors.push({ line: lineNumber, raw, reason: 'Unknown directive' });
  }

  validateSliceRules(slices, elements, errors);
  validateAlgorithmPositioning(elements, rawFlows, errors);

  // Handle TEXT block at end of file
  if (inTextBlock && lastElement) {
    lastElement.text = currentTextLines.join('\n').trim();
    console.log(`[DSL Parser] Attached final TEXT to element ID=${lastElement.id}:`, lastElement.text);
  }

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
