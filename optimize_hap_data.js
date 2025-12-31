const fs = require('fs');
const path = require('path');

// 1. Read the existing file (simulating browser load or just reading content)
// Since the file is a JS file assigning a global, we can try to eval it or parse the JSON part if we extract it.
// Simpler: Read file, regex extract the JSON object.

const filePath = path.join(__dirname, 'data/hap_data.js');
const fileContent = fs.readFileSync(filePath, 'utf8');

// Extract the object from "const HAP_DATA = { ... }"
const jsonMatch = fileContent.match(/const HAP_DATA\s*=\s*(\{[\s\S]*?\})\s*;/);

if (!jsonMatch) {
    console.error("Could not find HAP_DATA object");
    process.exit(1);
}

// Ensure keys are quoted so JSON.parse relies less on loose parsing if needed, 
// but eval is safer for this specific trusted transformation task in this context.
const data = eval('(' + jsonMatch[1] + ')');

// 2. Validate assumptions
// T: 0..45 (46 values)
// H: 0..100 (101 values)
// Total expected: 46 * 101 = 4646

const tVals = data.air_temp_c;
const hVals = data.humidity_pct;
const adjustments = data.logspeed_adjust;

console.log(`Original Lengths -> T: ${tVals.length}, H: ${hVals.length}, Adj: ${adjustments.length}`);

if (adjustments.length !== 4646) {
    console.error("Unexpected data length!");
}

// 3. Verify ordering
// The current structure repeats T 0-45 for each H 0, then H 1, etc? Or T 0 for H 0..100?
// Let's check the arrays.
// If tVals is 0,1,2...45, 0,1,2...45 -> It loops T for each H step.
// If tVals is 0,0,0... (101 times), 1,1,1... -> It loops H for each T step.

// Check first 50 values of T
// console.log("T Start:", tVals.slice(0, 50)); 
// result of viewing file earlier: 0, 1, 2... 45, 0, 1, 2...
// So it iterates T (Inner Loop) for each H (Outer Loop).
// Index = (H * 46) + T

// 4. Generate Optimized Content
// We only need the adjustments array.
const uniqueTVals = [...new Set(tVals)].sort((a, b) => a - b);
const uniqueHVals = [...new Set(hVals)].sort((a, b) => a - b);

console.log(`T Range: ${Math.min(...uniqueTVals)} - ${Math.max(...uniqueTVals)} (Count: ${uniqueTVals.length})`);
console.log(`H Range: ${Math.min(...uniqueHVals)} - ${Math.max(...uniqueHVals)} (Count: ${uniqueHVals.length})`);

const newContent = `// Optimized HAP Data (Flat Grid)
// T Range: 0-45°C (Cols)
// H Range: 0-100% (Rows)
// Index = (Humidity * 46) + Temperature
const HAP_DATA = {
    minT: 0,
    maxT: 45,
    stepH: 101, // 0 to 100
    grid: [${adjustments.join(',')}]
};
`;

// 5. Write Check
const outPath = path.join(__dirname, 'data/hap_data_optimized.js');
fs.writeFileSync(outPath, newContent);
console.log("Optimized file written to:", outPath);
