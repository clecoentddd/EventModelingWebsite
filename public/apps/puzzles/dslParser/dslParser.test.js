// dslParser.test.js — Extended Node built-in tests for DSL Parser
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDSL, resolveConnections, validateSliceRules } from './dslParser.js';

//
// --- BASIC PARSING TESTS ---
//
test('parses DESCRIPTION and LEVEL correctly', () => {
  const input = `
    DESCRIPTION: "Sample Diagram"
    LEVEL: 2
  `;
  const { description, level, errors } = parseDSL(input);
  assert.equal(description, 'Sample Diagram');
  assert.equal(level, 2);
  assert.equal(errors.length, 0);
});

test('parses ELEMENT lines with coordinates', () => {
  const input = `
    ELEMENT: 1, UI, "Home", 1;1
    ELEMENT: 2, COMMAND, "Send", 2;1
  `;
  const { items, errors } = parseDSL(input);
  assert.equal(items.length, 2);
  assert.equal(errors.length, 0);
  assert.deepEqual(items[0].c, 1);
  assert.deepEqual(items[1].r, 1);
});

//
// --- COORDINATE EDGE CASES ---
//
test('flags invalid coordinate format', () => {
  const input = `ELEMENT: 1, UI, "Bad", wrongformat`;
  const { errors } = parseDSL(input);
  assert.ok(errors.some(e => e.reason.includes('Invalid coordinate format')));
});

test('flags non-numeric coordinates', () => {
  const input = `ELEMENT: 1, UI, "Bad", a;b`;
  const { errors } = parseDSL(input);
  assert.ok(errors.some(e => e.reason.includes('Non-numeric')));
});

//
// --- FLOW & BACK_FLOW TESTS ---
//
test('parses FLOW connections and resolves properly', () => {
  const input = `
    ELEMENT: 1, EVENT, "Click", 1;1
    ELEMENT: 2, UI, "Page", 1;2
    FLOW: 1 to 2
  `;
  const { items, rawFlows } = parseDSL(input);
  const { connections, errors } = resolveConnections(items, rawFlows);
  assert.equal(connections.length, 1);
  assert.equal(errors.length, 0);
});

test('flags invalid BACK_FLOW rule', () => {
  const input = `
    ELEMENT: 1, COMMAND, "Send", 1;1
    ELEMENT: 2, UI, "View", 2;1
    BACK_FLOW: 1 to 2
  `;
  const { items, rawFlows } = parseDSL(input);
  const { connections, errors } = resolveConnections(items, rawFlows);
  assert.ok(errors.length > 0);
  assert.ok(errors.some(e => e.reason.includes('Invalid BACK_FLOW')));
});

test('handles missing element in FLOW', () => {
  const input = `
    ELEMENT: 1, EVENT, "Start", 1;1
    FLOW: 1 to 99
  `;
  const { items, rawFlows } = parseDSL(input);
  const { connections } = resolveConnections(items, rawFlows);
  assert.equal(connections.length, 0);
});

//
// --- SLICE RULES TESTS ---
//
test('validates STATE_CHANGE slice rule', () => {
  const input = `
    ELEMENT: 1, UI, "Screen", 1;1
    ELEMENT: 2, COMMAND, "Send", 2;1
    ELEMENT: 3, EVENT, "Click", 3;1
    SLICE: STATE_CHANGE, "Flow1", 1,2,3
  `;
  const { slices, errors } = parseDSL(input);
  assert.equal(slices[0].type, 'STATE_CHANGE');
  assert.equal(errors.length, 0);
});

test('flags invalid STATE_CHANGE missing EVENT', () => {
  const input = `
    ELEMENT: 1, UI, "Screen", 1;1
    ELEMENT: 2, COMMAND, "Send", 2;1
    SLICE: STATE_CHANGE, "Broken", 1,2
  `;
  const { slices, items, errors } = parseDSL(input);
  
  // **FIX: Use the statically imported function directly.**
  const ruleErrors = [];
  validateSliceRules(slices, items, ruleErrors);
  assert.ok(ruleErrors.some(e => e.reason.includes('Invalid STATE_CHANGE')));
  // Note: Since this is now synchronous, the 'flags invalid STATE_CHANGE missing EVENT' warning is also fixed.
});

// The following two tests were already correctly defined with the `validateSliceRules` function
test('flags invalid VIEW_STATE rule (contains EVENT)', () => { // Removed `async` since there's no await
  const input = `
    ELEMENT: 1, READMODEL, "Model", 1;1
    ELEMENT: 2, EVENT, "Event", 2;1
    SLICE: VIEW_STATE, "BrokenView", 1,2
  `;
  const { slices, items } = parseDSL(input);
  
  const ruleErrors = [];
  validateSliceRules(slices, items, ruleErrors);
  assert.ok(ruleErrors.some(e => e.reason.includes('Invalid VIEW_STATE')));
});

test('flags invalid TRANSLATION slice (missing some required types)', () => { // Removed `async` since there's no await
  const input = `
    ELEMENT: 1, EXTERNAL_EVENT, "Inbound", 1;1
    ELEMENT: 2, COMMAND, "DoStuff", 2;1
    SLICE: TRANSLATION, "Incomplete", 1,2
  `;
  const { slices, items } = parseDSL(input);

  const ruleErrors = [];
  validateSliceRules(slices, items, ruleErrors);
  assert.ok(ruleErrors.some(e => e.reason.includes('Invalid TRANSLATION')));
});
//
// --- GENERAL ROBUSTNESS TESTS ---
//
test('handles unknown lines gracefully', () => {
  const input = `
    ELEMENT: 1, UI, "Main", 1;1
    RANDOMLINE: something
  `;
  const { items, errors } = parseDSL(input);
  assert.equal(items.length, 1);
  assert.equal(errors.length, 0);
});

test('handles empty input gracefully', () => {
  const result = parseDSL('');
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.errors, []);
});
