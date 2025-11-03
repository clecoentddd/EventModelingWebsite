import { parseDSL } from './dslParser.js';
import fs from 'fs';

const dslContent = fs.readFileSync('./test-positioning-errors.dsl', 'utf8');
const result = parseDSL(dslContent);

console.log('=== TESTING POSITIONING VALIDATION ===');
const positioningErrors = result.errors.filter(err => err.type === 'positioning');

if (positioningErrors.length === 0) {
  console.log('✅ All elements are positioned correctly');
} else {
  console.log('⚠️ Positioning conflicts found:');
  positioningErrors.forEach(err => {
    console.log(`  - ${err.reason}`);
  });
}