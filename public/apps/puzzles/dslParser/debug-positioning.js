// Test script to verify positioning error detection
import { parseDSL } from './dslParser.js';

const testDSL = `ELEMENT: 1, Screen, "Select Espresso", 1;1
ELEMENT: 2, Command, "Order Espresso", 1;0
ELEMENT: 3, Event, "Espresso Ordered", 1;0`;

console.log('=== Testing positioning validation ===');
const result = parseDSL(testDSL);
console.log('All errors:', result.errors);

const positioningErrors = result.errors.filter(err => err.type === 'positioning');
console.log('Positioning errors:', positioningErrors);

if (positioningErrors.length > 0) {
    console.log('Found positioning errors:');
    positioningErrors.forEach(err => {
        console.log(`- ${err.reason}`);
    });
} else {
    console.log('No positioning errors found');
}