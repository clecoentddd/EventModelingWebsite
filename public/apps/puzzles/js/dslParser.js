// DSL Parser Module

// Helper: split by commas but respect quoted strings
const splitCsv = (line) => line.split(/, ?(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(s => s.trim());

// Helper: parse coordinates from a string (e.g., "3;1" or "3,1")
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

// Helper: Dynamically determine the connector segment based on relative position
function determineSegments(r1, c1, r2, c2) {
    let startSegment = 'bottom';
    let endSegment = 'top';

    // Vertical flow (up or down)
    if (r2 !== r1) {
        startSegment = r2 < r1 ? 'bottom' : 'top';
        endSegment = r2 < r1 ? 'top' : 'bottom';
    } 
    // Horizontal flow (right)
    else if (c2 > c1) {
        startSegment = 'right';
        endSegment = 'left';
    }
    
    return { startSegment, endSegment };
}


// --- 1. PARSE DSL FUNCTION (Handles ELEMENT and FLOW) ---

export function parseDSL(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const elements = []; // For the pieces themselves
    const rawFlows = []; // For the explicit FLOW: lines
    const errors = [];
    
    console.log("--- DSL Parsing Start ---");

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const lineNumber = i + 1;
        
        // --- NEW: HANDLE ELEMENT LINES (ID, Type, Name, Coords) ---
        if (raw.startsWith('ELEMENT:')) {
            const parts = splitCsv(raw.substring(8)); // Skip "ELEMENT: "
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
            console.log(`[Parse] ELEMENT: ID ${id}, Type ${type}, Coords ${r}_${c}`);
            
        // --- NEW: HANDLE FLOW LINES (ID to ID) ---
        } else if (raw.startsWith('FLOW:')) {
            const flowData = raw.substring(5).split('to').map(s => s.trim());
            if (flowData.length === 2) {
                const startId = parseInt(flowData[0]);
                const endId = parseInt(flowData[1]);
                
                if (isNaN(startId) || isNaN(endId)) { 
                    errors.push({ line: lineNumber, raw, reason: 'FLOW IDs must be numeric' });
                    continue; 
                }
                rawFlows.push({ startId, endId, raw, line: lineNumber });
                console.log(`[Parse] FLOW: ${startId} -> ${endId}`);
            } else {
                 errors.push({ line: lineNumber, raw, reason: 'Invalid FLOW format (expected "X to Y")' });
            }
            
        // --- OLD: HANDLE LEGACY LINES (Type, Name, Coords, Segments, Offset) ---
        } else {
            const parts = splitCsv(raw);
            if (parts.length < 3) { errors.push({ line: lineNumber, raw, reason: 'Too few parts' }); continue; }
            
            let type = parts[0];
            if (type.toLowerCase() === 'screen') type = 'UI';
            type = type.trim();
            const name = parts[1].replace(/^"|"$/g, '').trim();

            const { c, r } = parseCoords(parts[2], lineNumber, errors);
            if (isNaN(c) || isNaN(r)) continue;

            let conn = null;
            // The rest of the legacy logic (startSeg, endSeg, offset)
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

            // For compatibility, old pieces get a temporary ID based on order
            const element = { type, name, c, r, conn, raw, line: lineNumber, id: elements.length + 1 };
            elements.push(element);
            console.log(`[Parse-Legacy] ID ${element.id}, Type ${type}, Coords ${r}_${c}, Conn: ${conn ? 'Yes' : 'No'}`);
        }
    }
    console.log(`[Parse] Finished. Elements: ${elements.length}, Flows: ${rawFlows.length}, Errors: ${errors.length}`);
    console.log("--- DSL Parsing End ---");

    return { items: elements, rawFlows, errors };
}


// --- 2. RESOLVE CONNECTIONS FUNCTION (Handles explicit and implicit flow) ---

export function resolveConnections(items, rawFlows) {
    const pieces = {};
    const idToKeyMap = {}; 
    const connections = [];
    const usedIds = new Set(); 

    // Defensive checks
    if (!rawFlows) rawFlows = [];
    if (!items) items = [];
    
    console.log("--- Connection Resolution Start ---");

    items.forEach(it => { 
        const key = `${it.r}_${it.c}`; 
        pieces[key] = it; 
        idToKeyMap[it.id] = key;
    });
    
    console.log("Piece ID to Key Map:", idToKeyMap);

    // A. Resolve EXPLICIT FLOW connections first
    rawFlows.forEach(flow => {
        const startKey = idToKeyMap[flow.startId];
        const endKey = idToKeyMap[flow.endId];

        if (!startKey || !endKey) {
            console.warn(`[Connect-Explicit] SKIPPED: Missing piece for flow ${flow.startId} -> ${flow.endId}. Keys: ${startKey} -> ${endKey}`);
            return; 
        }
        
        // Split the keys and convert to Number in one step
        const [r1_str, c1_str] = startKey.split('_');
        const [r2_str, c2_str] = endKey.split('_');
        
        // Convert to Numbers. This is the likely point of a silent failure if a key was malformed.
        const r1 = Number(r1_str);
        const c1 = Number(c1_str);
        const r2 = Number(r2_str);
        const c2 = Number(c2_str);
        
        // CRITICAL CHECK: Ensure coordinate parsing is successful 
        if (isNaN(r1) || isNaN(c1) || isNaN(r2) || isNaN(c2)) {
            console.error(`[CRITICAL ERROR] Coordinate conversion failed for flow ${flow.startId} -> ${flow.endId}. Keys: ${startKey} -> ${endKey}`);
            return; 
        }
        
        usedIds.add(flow.startId);
        
        console.log(`[Connect-Explicit Debug] Parsing success: Start(${r1},${c1}), End(${r2},${c2})`);

        const { startSegment, endSegment } = determineSegments(r1, c1, r2, c2);

        connections.push({
            start: startKey,
            end: endKey,
            startSegment,
            endSegment
        });
        console.log(`[Connect-Explicit] SUCCESS: Flow ${flow.startId} (${startKey}) -> ${flow.endId} (${endKey}) | Segments: ${startSegment} to ${endSegment}`);
    });
    
    // B. Resolve IMPLICIT/LEGACY connections for pieces not covered by explicit flow
    for (let i = 0; i < items.length; i++) {
        const start = items[i];
        
        // Skip pieces that already have explicit FLOW definitions
        if (usedIds.has(start.id)) continue; 
        
        // Skip pieces that do not contain legacy connection data
        if (!start.conn) continue;

        const startKey = `${start.r}_${start.c}`;
        const legacyStartSeg = start.conn.startSegment;
        const legacyEndSeg = start.conn.endSegment;

        // --- LEGACY RULE 1: Command forking to subsequent Events ---
        if (start.type === 'Command') {
            let j = i + 1; let forks = 0;
            while (j < items.length && items[j].type === 'Event') {
                const end = items[j];
                const endKey = `${end.r}_${end.c}`;
                
                connections.push({
                    start: startKey,
                    end: endKey,
                    startSegment: legacyStartSeg,
                    endSegment: legacyEndSeg
                });
                console.log(`[Connect-Legacy-Fork] Command ${start.id} (${startKey}) forks to Event ${end.id} (${endKey})`);
                forks++; j++;
            }
            if (forks > 0) continue; // don't do N+X if we forked
        }

        // --- LEGACY RULE 2: standard N+X ---
        const targetIdx = i + start.conn.targetOffset;
        if (targetIdx < items.length) {
            const end = items[targetIdx];
            const endKey = `${end.r}_${end.c}`;

            connections.push({
                start: startKey,
                end: endKey,
                startSegment: legacyStartSeg,
                endSegment: legacyEndSeg
            });
            console.log(`[Connect-Legacy-N+X] ${start.id} (${startKey}) -> ${end.id} (${endKey}) (Offset ${start.conn.targetOffset})`);
        }
    }
    
    console.log(`[Connect] Total connections resolved: ${connections.length}`);
    console.log("--- Connection Resolution End ---");


    return { pieces, connections };
}


// --- 3. SELF-CONTAINED UNIT TEST ---
function runDslParserTest() {
    // Note: The test now uses Number() conversion internally, mirroring the main fix.
    const testDsl = `
ELEMENT: 100, UI, "Test Screen", 1;1
ELEMENT: 101, Command, "Test Command", 2;0
ELEMENT: 102, Event, "Test Event", 3;-1
FLOW: 100 to 101
FLOW: 101 to 102
`;

    const { items, rawFlows, errors } = parseDSL(testDsl);

    if (errors.length > 0) {
        console.error("TEST FAILED: Parsing resulted in errors.", errors);
        return;
    }

    const { connections } = resolveConnections(items, rawFlows);
    
    if (connections.length === 2) {
        console.log("✅ DSL Parser Test PASSED: Resolved 2 connections correctly.");
    } else {
        console.error(`❌ DSL Parser Test FAILED: Expected 2 connections, got ${connections.length}.`);
        console.log("Failed Connections:", connections);
        console.log("Raw Flows:", rawFlows);
    }
}

// Run the test immediately. Check console output for PASS/FAIL.
runDslParserTest();