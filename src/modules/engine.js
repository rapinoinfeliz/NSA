import { VDOT_MATH, getEasyPace } from './core.js';

export function calculatePacingState(inputs, hapCalc) {
    const { distance, timeSec, temp, dew } = inputs;

    // Default Result Structure
    const result = {
        valid: false,
        vdot: 0,
        pred5kSec: 0,
        pred5kPace: 0,
        inputPaceSec: 0,
        paces: {
            threshold: 0,
            p10min: 0,
            p6min: 0,
            p3min: 0,
            easy: 0
        },
        weather: {
            valid: false,
            impactPct: 0,
            adjustedPaces: {}, // key: paceSec
            temp: temp,
            dew: dew
        }
    };

    if (!distance || !timeSec || distance <= 0) {
        return result;
    }

    result.valid = true;
    result.inputPaceSec = timeSec / (distance / 1000);

    const vdotScore = VDOT_MATH.calculateVDOT(distance, timeSec);
    result.vdot = vdotScore;

    const pred5kSec = VDOT_MATH.solveTime(vdotScore, 5000);
    const pred5kPace = pred5kSec / 5;
    result.pred5kSec = pred5kSec;
    result.pred5kPace = pred5kPace;

    // Calculate Paces
    result.paces.threshold = VDOT_MATH.calculateThresholdPace(vdotScore);
    result.paces.p10min = 1.0552 * pred5kPace + 15.19;
    result.paces.p6min = 1.0256 * pred5kPace + 14.12;
    result.paces.p3min = 1.0020 * pred5kPace + 13.20;
    result.paces.easy = getEasyPace(pred5kSec);

    // Weather Logic
    const useWeather = hapCalc && !isNaN(temp);
    const d = !isNaN(dew) ? dew : temp;

    if (useWeather) {
        result.weather.valid = true;
        result.weather.dew = d;

        // Impact on Ref Pace
        const ref = 300;
        const adjRef = hapCalc.calculatePaceInHeat(ref, temp, d);
        result.weather.impactPct = ((adjRef - ref) / ref) * 100;

        // Adjust all calculated paces
        Object.keys(result.paces).forEach(key => {
            const val = result.paces[key];
            if (val > 0) {
                result.weather.adjustedPaces[key] = hapCalc.calculatePaceInHeat(val, temp, d);
            } else {
                result.weather.adjustedPaces[key] = 0;
            }
        });
    }

    return result;
}
