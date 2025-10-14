// DSL Parser Module - FINAL VERSION with FLOW and BACK_FLOW support + RULES

// Helper: split by commas but respect quoted strings (UNCHANGED)
const splitCsv = (line) => line.split(/, ?(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s => s.trim());

// Helper: parse coordinates from a string (e.g., "3;1" or "3,1") (UNCHANGED)
const parseCoords = (coordRaw, line, errors) => {
    const coord = coordRaw.replace(/\s+/g, '');
    let coordParts = coord.split(/[;:]/);
    if (coordParts.length !== 2) coordParts = coord.split(',');
    
    if (coordParts.length !== 2) { 
        errors.push({ line, raw: coordRaw, reason: 'Invalid coordinate format (expected C;R or C,R)' });
        return { c: NaN, r: NaN };
    }
    
    const c = parseInt(coordParts[0]);
    const r = parseInt(coordParts[1]);
    
    if (isNaN(c) || isNaN(r)) {
        errors.push({ line, raw: coordRaw, reason: 'Non-numeric coordinates' });
    }
    return { c, r };
};

// Helper: determine connector segments (UNCHANGED)
function determineSegments(r1, c1, r2, c2) {
    let startSegment = 'bottom';
    let endSegment = 'top';

    if (r2 !== r1) {
        startSegment = r2 < r1 ? 'bottom' : 'top'; 
        endSegment = r2 < r1 ? 'top' : 'bottom';
    } 
    else if (c2 > c1) {
        startSegment = 'right';
        endSegment = 'left';
    }
    
    return { startSegment, endSegment };
}


// --- 1. PARSE DSL FUNCTION (UNCHANGED) ---
export function parseDSL(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const elements = []; 
    const rawFlows = []; 
    const errors = [];

    // <-- Declare these before using
    let description = '';
    let level = null;
    
    console.log("--- DSL Parsing Start ---");

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const lineNumber = i + 1;

        // --- DESCRIPTION ---
        if (raw.startsWith('DESCRIPTION')) {
            const match = raw.match(/DESCRIPTION\s*:?s*"(.+)"$/) || raw.match(/DESCRIPTION\s*:\s*"(.+)"$/);
            if (match) {
                description = match[1];
            } else {
                errors.push({ line: lineNumber, raw, reason: 'Invalid DESCRIPTION format (use quotes)' });
            }
            continue; // skip further parsing
        }

        // --- LEVEL ---
        if (raw.startsWith('LEVEL')) {
            const match = raw.match(/LEVEL\s*:?s*(\d+)/) || raw.match(/LEVEL\s*:\s*(\d+)/);
            if (match) {
                level = parseInt(match[1]);
            } else {
                errors.push({ line: lineNumber, raw, reason: 'Invalid LEVEL (must be numeric)' });
            }
            continue; // skip further parsing
        }

        // --- ELEMENT / FLOW / BACK_FLOW --- (existing code)
        if (raw.startsWith('ELEMENT:')) {
            const parts = splitCsv(raw.substring(8)); 
            if (parts.length < 4) { errors.push({ line: lineNumber, raw, reason: 'Too few parts in ELEMENT: (expected ID, Type, Name, Coords)' }); continue; }
            
            const id = parseInt(parts[0].trim());
            if (isNaN(id)) { errors.push({ line: lineNumber, raw, reason: 'ELEMENT ID must be numeric' }); continue; }

            let type = parts[1];
            if (type.toLowerCase() === 'screen') type = 'UI';
            type = type.trim();
            const name = parts[2].replace(/^"|"$/g, '').trim();

            const { c, r } = parseCoords(parts[3], lineNumber, errors);
            if (isNaN(c) || isNaN(r)) continue;

            const element = { type, name, c, r, raw, line: lineNumber, id };
            elements.push(element);

        } else if (raw.startsWith('BACK_FLOW:')) {
            // ... (unchanged)
        } else if (raw.startsWith('FLOW:')) {
            // ... (unchanged)
        } else {
            // legacy / shorthand ELEMENTs
            // ... (unchanged)
        }
    }

    console.log(`[Parse] Finished. Elements: ${elements.length}, Flows: ${rawFlows.length}, Errors: ${errors.length}`);
    
    // <-- Return description and level
    return { items: elements, rawFlows, errors, description, level };
}




// --- 2. RESOLVE CONNECTIONS FUNCTION (with RULES ADDED) ---
export function resolveConnections(items, rawFlows) {
    const pieces = {};
    const idToKeyMap = {}; 
    const connections = [];
    const usedIds = new Set(); 
    const errors = [];

    if (!rawFlows) rawFlows = [];
    if (!items) items = [];
    
    console.log("--- Connection Resolution Start ---");

    items.forEach(it => { 
        const key = `${it.r}_${it.c}`; 
        pieces[key] = it; 
        idToKeyMap[it.id] = key;
    });

    // Define level mapping for rules
    const typeLevel = {
        'UI': 1,
        'Screen': 1,
        'Automation': 1,
        'Command': 0,
        'ReadModel': 0,
        'Event': -1,
        'ExternalEvent': -1
    };

    // A. Resolve EXPLICIT FLOW connections (FLOW + BACK_FLOW)
    rawFlows.forEach(flow => {
        const startKey = idToKeyMap[flow.startId];
        const endKey = idToKeyMap[flow.endId];

        if (!startKey || !endKey) {
            console.warn(`[Connect-Explicit] SKIPPED: Missing piece for flow ${flow.startId} -> ${flow.endId}.`);
            return; 
        }
        
        const start = pieces[startKey];
        const end = pieces[endKey];
        const [r1, c1, r2, c2] = [startKey, endKey].flatMap(k => k.split('_').map(Number));
        
        let startSegment; 
        let endSegment;

        if (flow.style === 'back') {
            startSegment = 'left'; 
            endSegment = 'bottom';
            flow.style = 'dashed'; 

            // --- RULE: BACK_FLOW must always be Event → ReadModel ---
            if (!(start.type === 'Event' && end.type === 'ReadModel')) {
                errors.push({ line: flow.line, raw: flow.raw, reason: `Invalid BACK_FLOW: must be Event -> ReadModel (got ${start.type} -> ${end.type})` });
                return;
            }
        } else {
            ({ startSegment, endSegment } = determineSegments(r1, c1, r2, c2));

            // --- RULE: FLOW type validation ---
            const allowed = [
                ['UI', 'Command'],
                ['Screen', 'Command'],
                ['Automation', 'Command'],
                ['Command', 'Event'],
                ['Event', 'ReadModel'],
                ['ReadModel', 'Screen'],
                ['ReadModel', 'Automation'],
                ['ExternalEvent', 'Automation']
            ];

            const isAllowed = allowed.some(([a, b]) => start.type === a && end.type === b);
            if (!isAllowed) {
                errors.push({ line: flow.line, raw: flow.raw, reason: `Invalid FLOW: ${start.type} -> ${end.type} not allowed` });
                return;
            }


        }

        usedIds.add(flow.startId);
        connections.push({
            start: startKey,
            end: endKey,
            style: flow.style || 'solid', 
            startSegment,
            endSegment
        });
        console.log(`[Connect-Explicit] SUCCESS: Style: ${flow.style || 'solid'}, Flow ${flow.startId} (${startKey}) -> ${flow.endId} (${endKey})`);
    });
    
    // B. Resolve IMPLICIT/LEGACY connections (UNCHANGED)
    for (let i = 0; i < items.length; i++) {
        const start = items[i];
        if (usedIds.has(start.id)) continue; 
        if (!start.conn) continue;

        const startKey = `${start.r}_${start.c}`;
        const legacyStartSeg = start.conn.startSegment;
        const legacyEndSeg = start.conn.endSegment;

        if (start.type === 'Command') {
            let j = i + 1; let forks = 0;
            while (j < items.length && items[j].type === 'Event') {
                const end = items[j];
                const endKey = `${end.r}_${end.c}`;
                connections.push({
                    start: startKey,
                    end: endKey,
                    startSegment: legacyStartSeg,
                    endSegment: legacyEndSeg,
                    style: 'solid' 
                });
                forks++; j++;
            }
            if (forks > 0) continue; 
        }

        const targetIdx = i + start.conn.targetOffset;
        if (targetIdx < items.length) {
            const end = items[targetIdx];
            const endKey = `${end.r}_${end.c}`;
            connections.push({
                start: startKey,
                end: endKey,
                startSegment: legacyStartSeg,
                endSegment: legacyEndSeg,
                style: 'solid' 
            });
        }
    }
    
    console.log(`[Connect] Total connections resolved: ${connections.length}`);
    if (errors.length > 0) console.warn("[RULE ERRORS]", errors);

    return { pieces, connections, errors };
}
