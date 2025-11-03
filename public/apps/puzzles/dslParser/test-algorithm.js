import { parseDSL } from './dslParser.js';
import fs from 'fs';

const dslContent = fs.readFileSync('../games/ruptureDeStock.dsl', 'utf8');
const result = parseDSL(dslContent);

console.log('=== ALGORITHM POSITIONING VALIDATION ===');
const positioningErrors = result.errors.filter(err => 
  err.reason.includes('should be positioned') || 
  err.reason.includes('Multi-event branching')
);

if (positioningErrors.length === 0) {
  console.log('✅ All elements are positioned correctly according to the algorithm');
} else {
  console.log('⚠️ Positioning conflicts found:');
  positioningErrors.forEach(err => {
    console.log('Element conflicts: ' + err.reason);
  });
}

console.log('\nAll errors:');
result.errors.forEach(err => {
  console.log(`Line ${err.line}: ${err.reason}`);
});