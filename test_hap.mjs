import { HAPCalculator } from './src/modules/core.js';
import { HAP_GRID } from './data/hap_grid.js';

console.log("Testing HAP Logic...");

if (!HAP_GRID || HAP_GRID.length < 100) {
    console.error("Grid Invalid:", HAP_GRID ? HAP_GRID.length : 'null');
    process.exit(1);
}

const calc = new HAPCalculator(HAP_GRID);

// Test Case 1: Neutral (10C, 10C) - Should be near 0 adjustment
const paceNeutral = 300; // 5:00/km
const resNeutral = calc.calculatePaceInHeat(paceNeutral, 10, 10);
console.log(`10C/10C: 300s -> ${resNeutral.toFixed(2)}s (Diff: ${(resNeutral - paceNeutral).toFixed(4)})`);

// Test Case 2: Hot (30C, 20C Dew) -> High Humidity
const resHot = calc.calculatePaceInHeat(paceNeutral, 30, 20);
console.log(`30C/20Dew: 300s -> ${resHot.toFixed(2)}s`);

if (resHot <= resNeutral + 1) {
    console.error("FAIL: Hot weather should slow down pace significantly.");
} else {
    console.log("PASS: Hot weather slowed down pace.");
}

// Test Case 3: Edge (45C, 100% implicitly checked via max)
const resHell = calc.calculatePaceInHeat(paceNeutral, 45, 45); // 45C, 45Dew -> 100% RH approx
console.log(`45C/45Dew: 300s -> ${resHell.toFixed(2)}s`);
