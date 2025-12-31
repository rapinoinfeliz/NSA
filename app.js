// Main Application Logic
        window.openTab = function (tabName, btn) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tabName).classList.add('active');

            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            if (btn) btn.classList.add('active');

            // Hide tooltip if exists
            const tooltip = document.getElementById('forecast-tooltip');
            if (tooltip) {
                tooltip.style.opacity = '0';
                tooltip.style.display = 'none'; // Force hide
            }
            if (window.hideForeTooltip) window.hideForeTooltip();

            // Trigger Chart Render if Forecast/Climate Tab
            if (tabName === 'climate' && window.renderClimateHeatmap) {
                setTimeout(window.renderClimateHeatmap, 50);
            }
            if ((tabName === 'forecast' || tabName === 'forecast16') && window.renderAllForecasts) {
                setTimeout(window.renderAllForecasts, 100);
            }
        }
        console.log("Main application script starting...");
        (function () {
            try {
                // --- Immutable Data ---
                const VDOT_DATA = [
                    { t: 15.00, v: 67 }, { t: 16.00, v: 63 }, { t: 17.00, v: 59 },
                    { t: 18.00, v: 56 }, { t: 19.00, v: 53 }, { t: 20.00, v: 49.8 },
                    { t: 21.00, v: 47 }, { t: 22.00, v: 45 }, { t: 23.00, v: 43 },
                    { t: 24.00, v: 41 }, { t: 25.00, v: 39 }, { t: 26.00, v: 37 },
                    { t: 27.00, v: 35.5 }, { t: 28.00, v: 34 }, { t: 29.00, v: 32.5 },
                    { t: 30.00, v: 31 }, { t: 32.00, v: 29 }, { t: 35.00, v: 26 },
                    { t: 40.00, v: 22 }
                ];

                // Easy Pace Table (5k Time Seconds -> Easy Pace Seconds/km)
                // Data provided by user
                const EASY_DATA = [
                    { t: 1800, p: 514 }, { t: 1780, p: 509 }, { t: 1760, p: 503 },
                    { t: 1740, p: 497 }, { t: 1720, p: 491 }, { t: 1700, p: 485 },
                    { t: 1680, p: 480 }, { t: 1660, p: 474 }, { t: 1640, p: 469 },
                    { t: 1620, p: 463 }, { t: 1600, p: 457 }, { t: 1580, p: 451 },
                    { t: 1560, p: 446 }, { t: 1540, p: 440 }, { t: 1520, p: 434 },
                    { t: 1500, p: 429 }, { t: 1480, p: 423 }, { t: 1460, p: 418 },
                    { t: 1440, p: 412 }, { t: 1420, p: 406 }, { t: 1400, p: 401 },
                    { t: 1380, p: 395 }, { t: 1360, p: 389 }, { t: 1340, p: 383 },
                    { t: 1320, p: 378 }, { t: 1300, p: 372 }, { t: 1280, p: 366 },
                    { t: 1260, p: 361 }, { t: 1240, p: 355 }, { t: 1220, p: 350 },
                    { t: 1200, p: 343 }, { t: 1180, p: 337 }, { t: 1160, p: 331 },
                    { t: 1140, p: 326 }, { t: 1120, p: 320 }, { t: 1100, p: 314 },
                    { t: 1080, p: 308 }, { t: 1060, p: 302 }, { t: 1040, p: 298 },
                    { t: 1020, p: 292 }, { t: 1000, p: 286 }, { t: 980, p: 280 },
                    { t: 960, p: 274 }, { t: 940, p: 268 }, { t: 920, p: 262 }
                ].sort((a, b) => a.t - b.t); // Ensure sorted by time ascending (fastest to slowest logic, but values are time so bigger is slower)

                // --- Selectors ---
                const $ = (id) => document.getElementById(id);

                // Expose globally
                window.els = {
                    distPreset: $('dist-preset'),
                    distance: $('distance'),
                    time: $('time'),
                    inputPace: $('input-pace'),
                    temp: $('temp'),
                    dew: $('dew'),
                    weatherImpact: $('weather-impact'),
                    vdot: $('vdot-val'),
                    pred5k: $('pred-5k'),
                    pace3: $('pace-3min'),
                    dist3: $('dist-3min'),
                    pace6: $('pace-6min'),
                    dist6: $('dist-6min'),
                    pace10: $('pace-10min'),
                    dist10: $('dist-10min'),
                    paceEasy: $('pace-easy'),
                    copyBtn: $('copy-btn')
                };
                const els = window.els;

                // --- HAP Logic ---
                class HAPCalculator {
                    constructor(data) {
                        this.x_vals = [...new Set(data.air_temp_c)].sort((a, b) => a - b);
                        // y_vals (humidity) are 0-100 integers
                        this.y_vals = Array.from({ length: 101 }, (_, i) => i);
                        this.values = {};

                        for (let i = 0; i < data.air_temp_c.length; i++) {
                            const t = data.air_temp_c[i];
                            const h = data.humidity_pct[i];
                            const adj = data.logspeed_adjust[i];
                            this.values[`${t}|${h}`] = adj;
                        }
                    }

                    _bracket(arr, val) {
                        const n = arr.length;
                        if (val <= arr[0]) return [0, 1, 0.0];
                        if (val >= arr[n - 1]) return [n - 2, n - 1, 1.0];
                        for (let i = 0; i < n - 1; i++) {
                            if (val >= arr[i] && val <= arr[i + 1]) {
                                return [i, i + 1, (val - arr[i]) / (arr[i + 1] - arr[i])];
                            }
                        }
                        return [0, 1, 0.0];
                    }

                    _getZ(ix, iy) {
                        const x = this.x_vals[ix];
                        const y = this.y_vals[iy];
                        return this.values[`${x}|${y}`] || 0.0;
                    }

                    calculateHumidity(tempC, dewC) {
                        if (dewC > tempC) dewC = tempC;
                        const a = 17.625;
                        const b = 243.04;
                        const es = 6.112 * Math.exp((a * tempC) / (b + tempC));
                        const e = 6.112 * Math.exp((a * dewC) / (b + dewC));
                        let rh = (e / es) * 100;
                        return Math.max(0, Math.min(100, rh));
                    }

                    getAdjustment(tempC, dewC) {
                        // Calc RH
                        const rh = this.calculateHumidity(tempC, dewC);

                        // Interpolate
                        const [ix0, ix1, tx] = this._bracket(this.x_vals, tempC);
                        const [iy0, iy1, ty] = this._bracket(this.y_vals, rh);

                        const z11 = this._getZ(ix0, iy0);
                        const z21 = this._getZ(ix1, iy0);
                        const z12 = this._getZ(ix0, iy1);
                        const z22 = this._getZ(ix1, iy1);

                        const r1 = z11 * (1 - tx) + z21 * tx;
                        const r2 = z12 * (1 - tx) + z22 * tx;

                        return r1 * (1 - ty) + r2 * ty;
                    }

                    // Calculate Pace in Heat given a Neutral Pace
                    // Neutral Speed = Actual Speed * Factor (where factor > 1 usually?)
                    // Actually: log(Neutral) = log(Actual in Heat) - Adj (Adj is negative penalty)
                    // So: log(Actual in Heat) = log(Neutral) + Adj
                    // Since Adj is negative, Actual Speed < Neutral Speed -> Slower pace. Correct.
                    calculatePaceInHeat(neutralPaceSec, temp, dew) {
                        if (!neutralPaceSec || neutralPaceSec <= 0) return 0;
                        const neutralSpeed = 1000.0 / neutralPaceSec; // m/s
                        const adj = this.getAdjustment(temp, dew);

                        const actualLogSpeed = Math.log(neutralSpeed) + adj;
                        const actualSpeed = Math.exp(actualLogSpeed);

                        return 1000.0 / actualSpeed; // sec/km
                    }
                }

                const hapCalc = (typeof HAP_DATA !== 'undefined') ? new HAPCalculator(HAP_DATA) : null;
                window.hapCalc = hapCalc; // Expose globally for ClimateManager

                // --- Logic ---
                function parseTime(str) {
                    if (!str) return 0;
                    const parts = str.trim().split(':').map(Number);
                    // Handle MM:SS or empty
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        return parts[0] * 60 + parts[1];
                    }
                    // Handle HH:MM:SS
                    if (parts.length === 3 && !isNaN(parts[0])) {
                        return parts[0] * 3600 + parts[1] * 60 + parts[2];
                    }
                    return 0;
                }

                function formatTime(sec) {
                    if (!sec || isNaN(sec) || sec === Infinity) return "--:--";
                    let m = Math.floor(sec / 60);
                    let s = Math.round(sec % 60);
                    if (s === 60) { m++; s = 0; }
                    return `${m}:${s.toString().padStart(2, '0')}`;
                }

                // --- Authentic VDOT Logic ---
                const VDOT_MATH = {
                    getPercentMax: (tMin) => {
                        return 0.8 + 0.1894393 * Math.exp(-0.012778 * tMin) + 0.2989558 * Math.exp(-0.1932605 * tMin);
                    },
                    getOxygenCost: (v) => { // v in m/min
                        return -4.60 + 0.182258 * v + 0.000104 * (v * v);
                    },
                    calculateVDOT: (distMeters, timeSec) => {
                        if (timeSec <= 0) return 0;
                        const v = distMeters / (timeSec / 60); // m/min
                        const cost = VDOT_MATH.getOxygenCost(v);
                        const pct = VDOT_MATH.getPercentMax(timeSec / 60);
                        return cost / pct;
                    },
                    solveTime: (vdot, distMeters) => {
                        // Binary Search for Time
                        let low = 1.0; // 1 second
                        let high = 100 * 3600.0; // 100 hours
                        let bestT = low;

                        for (let i = 0; i < 30; i++) {
                            const mid = (low + high) / 2;
                            const v = distMeters / (mid / 60);
                            const cost = VDOT_MATH.getOxygenCost(v);
                            const pct = VDOT_MATH.getPercentMax(mid / 60);
                            const calcVDOT = cost / pct;

                            // VDOT decreases as Time increases (slower run = lower VDOT)
                            if (calcVDOT > vdot) {
                                // Need lower VDOT -> Slower time -> Higher T
                                low = mid;
                            } else {
                                high = mid;
                            }
                            bestT = mid;
                        }
                        return bestT;
                    },
                    calculateThresholdPace: (vdot) => {
                        // Threshold intensity is typically ~88% of VO2Max per Daniels tables (approx 60 min race pace)
                        // A fixed 88% aligns better with standard tables than the exact 60-min curve calculation (~88.8%)
                        if (!vdot || vdot <= 0) return 0;
                        const fraction = 0.88;
                        const targetCost = vdot * fraction;

                        // Solve Quadratic: 0.000104*v^2 + 0.182258*v - 4.60 = targetCost
                        // ax^2 + bx + c = 0
                        const a = 0.000104;
                        const b = 0.182258;
                        const c = -4.60 - targetCost;

                        // Quadratic formula: v = (-b + sqrt(b^2 - 4ac)) / 2a
                        // We want positive velocity
                        const det = b * b - 4 * a * c;
                        if (det < 0) return 0; // Should not happen for valid VDOT

                        const v_m_min = (-b + Math.sqrt(det)) / (2 * a);

                        // Convert v (m/min) to pace (sec/km)
                        // sec/km = 1000 / (v_m_min / 60) = 60000 / v_m_min
                        return 60000 / v_m_min;
                    }
                };

                function getVDOT(fiveKSeconds) {
                    // Use actual formula logic based on 5k input
                    const v = VDOT_MATH.calculateVDOT(5000, fiveKSeconds);
                    return v.toFixed(1);
                }

                function getEasyPace(fiveKSeconds) {
                    // Extrapolation limits
                    if (fiveKSeconds < 920) return 262; // Cap at 15:20
                    if (fiveKSeconds > 1800) return 514; // Cap at 30:00

                    // Interpolation
                    for (let i = 0; i < EASY_DATA.length - 1; i++) {
                        const cur = EASY_DATA[i];
                        const next = EASY_DATA[i + 1];
                        // EASY_DATA is sorted by T ascending (920 -> 1800)
                        if (fiveKSeconds >= cur.t && fiveKSeconds <= next.t) {
                            const ratio = (fiveKSeconds - cur.t) / (next.t - cur.t);
                            return cur.p + ratio * (next.p - cur.p);
                        }
                    }
                    return 0;
                }

                function update() {
                    const d = parseFloat(els.distance.value);
                    const tSec = parseTime(els.time.value);

                    if (!d || !tSec || d <= 0) {
                        els.pred5k.textContent = "--:--";
                        els.vdot.textContent = "--";
                        return;
                    }

                    // Sync Pace Input (if not active)
                    if (document.activeElement !== els.inputPace) {
                        const paceSec = tSec / (d / 1000);
                        els.inputPace.value = formatTime(paceSec);
                    }

                    // 1. Calculate VDOT directly from Input (pure Daniels)
                    // This replaces Riegel to ensure consistency with the VDOT Details table
                    const vdotScore = VDOT_MATH.calculateVDOT(d, tSec);

                    // Predict 5k using that VDOT
                    const pred5kSec = VDOT_MATH.solveTime(vdotScore, 5000);
                    const pred5kPace = pred5kSec / 5;

                    els.pred5k.textContent = formatTime(pred5kSec);
                    els.vdot.textContent = vdotScore.toFixed(1);

                    // Threshold Logic
                    const tPaceSec = VDOT_MATH.calculateThresholdPace(vdotScore);
                    const elThreshold = document.getElementById('vdot-threshold');
                    if (elThreshold) {
                        elThreshold.textContent = `${formatTime(tPaceSec)}/km`;
                    }

                    // Weather Logic
                    const temp = parseFloat(els.temp.value);
                    const dew = parseFloat(els.dew.value);
                    let useWeather = false;
                    if (!isNaN(temp) && hapCalc) {
                        useWeather = true;
                    }
                    const dw = !isNaN(dew) ? dew : temp; // Default dew to temp if missing (100% RH worst case, or maybe temp-10?) 
                    // Actually if dew is missing, maybe assume dry? Let's use 0 or avg?
                    // HAPCalculator handles logic constraints, but we need to pass a value.
                    // Let's pass the input value directly and let HAPCalc handle or use a safe fallback in UI interaction.
                    // If user didn't input Dew, let's treat it as "No Adjustment" or skip? 
                    // User requirement implies inputs. Use logical fallback if only temp is there?
                    // Standard convention: if dew missing, maybe dont calc? 
                    // I will calc only if both or assume something. 
                    // Let's assume Dew = Temp (100% Humidity) is bad default.
                    // Let's assume Dew = Temp - 10 (approx 50% RH) if missing?
                    // For now, require both or stick to standard if missing. 
                    // Actually, let's just pass what we have. 

                    // Actually, let's just pass what we have. 

                    const validWeather = useWeather && !isNaN(dw);

                    // Save State Logic (Syncs on every update)
                    saveState();

                    // Helper to render pace with adjustment
                    const renderPace = (paceSec, elPace, elDist) => {
                        // 1. Normal Pace & Distance
                        let paceHtml = formatTime(paceSec) + "/km";
                        elPace.style.color = ""; // Reset color

                        let duration = 0;
                        if (elDist) {
                            if (elDist.id.includes('10min')) duration = 600;
                            else if (elDist.id.includes('6min')) duration = 360;
                            else if (elDist.id.includes('3min')) duration = 180;
                        }

                        let distHtml = "";
                        if (elDist) {
                            const normDist = Math.round((duration / paceSec) * 1000);
                            distHtml = normDist + " m";
                        }

                        // 2. Weather Adjustment
                        if (validWeather) {
                            const adjPaceSec = hapCalc.calculatePaceInHeat(paceSec, temp, dw);
                            // Show if impact > 1 sec/km
                            if (adjPaceSec > paceSec + 1) {
                                const adjPaceStr = formatTime(adjPaceSec);
                                // "Discreet" side display in lactate-color (pink)
                                paceHtml += ` <span style="color:var(--lactate-color); font-size:0.85em; margin-left:4px;">(${adjPaceStr})</span>`;

                                if (elDist) {
                                    const adjDist = Math.round((duration / adjPaceSec) * 1000);
                                    distHtml += ` <span style="color:var(--lactate-color); font-size:0.85em; margin-left:4px;">(${adjDist} m)</span>`;
                                }
                            }
                        }

                        elPace.innerHTML = paceHtml;
                        if (elDist) elDist.innerHTML = distHtml;
                    };

                    // 2. Calculate Paces
                    // 30KP (10min)
                    const p10 = 1.0552 * pred5kPace + 15.19;
                    renderPace(p10, els.pace10, els.dist10);

                    // HMP (6min)
                    const p6 = 1.0256 * pred5kPace + 14.12;
                    renderPace(p6, els.pace6, els.dist6);

                    // 15KP (3min)
                    const p3 = 1.0020 * pred5kPace + 13.20;
                    renderPace(p3, els.pace3, els.dist3);

                    // Easy Pace
                    const pEasy = getEasyPace(pred5kSec);
                    // Easy pace logic might differ? Just apply same adj?
                    // HAP is usually for quality, but heat affects easy runs too.
                    renderPace(pEasy, els.paceEasy, null);

                    // Update Weather Impact Text
                    if (validWeather) {
                        const adj = hapCalc.getAdjustment(temp, dw); // negative
                        // Impact % = (Neutral - Actual) / Actual ?? 
                        // Or % slow down.
                        // (Actual - Neutral) / Neutral.
                        // Actual = Exp(Log(N) + adj) ... wait.
                        // Let's just calculate for a reference pace (e.g. 5:00/km = 300s)
                        const ref = 300;
                        const res = hapCalc.calculatePaceInHeat(ref, temp, dw);
                        const pct = ((res - ref) / ref) * 100;
                        els.weatherImpact.textContent = `Heat Impact: ~${pct.toFixed(1)}% slowdown`;
                    } else {
                        els.weatherImpact.textContent = "";
                    }

                    // Save State on every update
                    saveState();
                }

                function copyResults() {
                    const inputTime = els.time.value;
                    const inputDist = els.distance.value;
                    const currentVDOT = els.vdot.textContent;

                    // Strip HTML from text content for copy
                    const getTxt = (el) => el.innerText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

                    const results = [
                        `NSA Pacing (TT: ${inputDist}m in ${inputTime})`,
                        `VDOT: ${currentVDOT}`,
                        ``,
                        `Sub-T Workouts:`,
                        `- 10min (30KP): ${getTxt(els.pace10)}`,
                        `- 6min (HMP): ${getTxt(els.pace6)}`,
                        `- 3min (15KP): ${getTxt(els.pace3)}`,
                        ``,
                        `Easy Pace: ${getTxt(els.paceEasy)}`
                    ];

                    if (els.temp.value) {
                        results.splice(2, 0, `Weather: ${els.temp.value}°C (Dew: ${els.dew.value || '-'}°C)`);
                    }

                    navigator.clipboard.writeText(results.join('\n')).then(() => {
                        const btn = document.getElementById('copy-btn');
                        const originalText = " Copy"; // btn.childNodes[2].textContent
                        // Simplification for reliability
                        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
                        setTimeout(() => {
                            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
                        }, 1500);
                    }).catch(err => console.error("Failed to copy", err));
                }

                // --- Persistence ---
                function saveState() {
                    try {
                        const state = {
                            distance: els.distance.value,
                            time: els.time.value
                        };
                        localStorage.setItem('vdot_calc_state', JSON.stringify(state));
                    } catch (e) {
                        // Ignore storage errors
                    }
                }

                function loadState() {
                    try {
                        const saved = localStorage.getItem('vdot_calc_state');
                        if (saved) {
                            const state = JSON.parse(saved);
                            if (state.distance) els.distance.value = state.distance;
                            if (state.time) els.time.value = state.time;
                            // Sync preset dropdown if match found
                            const val = els.distance.value;
                            if (els.distPreset) {
                                let foundOptions = Array.from(els.distPreset.options).filter(o => o.value === val);
                                els.distPreset.value = foundOptions.length > 0 ? val : 'custom';
                            }
                        }
                    } catch (e) {
                        console.error('Failed to load state', e);
                    }
                }

                // --- Event Listeners ---
                if (els.distPreset) {
                    els.distPreset.addEventListener('change', () => {
                        const val = els.distPreset.value;
                        if (val !== 'custom') {
                            els.distance.value = val;
                            update();
                        }
                    });
                }

                if (els.distance) {
                    els.distance.addEventListener('input', () => {
                        const val = els.distance.value;
                        // Sync dropdown logic
                        let foundOptions = Array.from(els.distPreset.options).filter(o => o.value === val);
                        els.distPreset.value = foundOptions.length > 0 ? val : 'custom';
                        update();
                    });
                }

                if (els.time) els.time.addEventListener('input', update);

                if (els.inputPace) {
                    els.inputPace.addEventListener('input', () => {
                        const d = parseFloat(els.distance.value);
                        const pSec = parseTime(els.inputPace.value);
                        if (d > 0 && pSec > 0) {
                            const tSec = pSec * (d / 1000);
                            els.time.value = formatTime(tSec);
                            update();
                        }
                    });
                }
                if (els.temp) els.temp.addEventListener('input', update);
                if (els.dew) els.dew.addEventListener('input', update); // Assuming dew element exists

                if (els.copyBtn) {
                    els.copyBtn.addEventListener('click', copyResults);
                }

                // --- Forecast Logic ---
                let forecastData = [];
                window.selectedClimateKey = null; // "w-h"
                window.currentPaceMode = 'HMP';
                window.setPaceMode = function (mode) {
                    window.currentPaceMode = mode;
                    // Update Buttons (Sync across both tabs - now just one actually, but safe to keep)
                    ['pace-tag-container-16'].forEach(id => {
                        const container = document.getElementById(id);
                        if (container) {
                            const btns = container.querySelectorAll('.tag-btn');
                            btns.forEach(btn => {
                                if (btn.getAttribute('onclick').includes("'" + mode + "'")) {
                                    btn.classList.add('active');
                                } else {
                                    btn.classList.remove('active');
                                }
                            });
                        }
                    });
                    renderAllForecasts();
                };

                // --- Rendering Functions ---
                function _unused_renderCurrentTab(current) { return; }
                /*
                function renderCurrentTab(current) {
                    const container = document.getElementById('current-content');
                    if (!container) return;

                    // Calculate metrics
                    const rh = hapCalc.calculateHumidity(current.temperature_2m, current.dew_point_2m);
                    const refPace = 300;
                    const adjPace = hapCalc.calculatePaceInHeat(refPace, current.temperature_2m, current.dew_point_2m);
                    const pct = ((adjPace - refPace) / refPace) * 100;

                    const cardStyle = "background:var(--card-bg); padding:15px; border-radius:8px; border:1px solid var(--border-color); text-align:center; position:relative;";

                    const getWindDir = (deg) => {
                        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                        return dirs[Math.round(deg / 45) % 8];
                    };

                    const wSpeed = current.wind_speed_10m ? current.wind_speed_10m.toFixed(1) : '--';
                    const wGust = current.wind_gusts_10m ? current.wind_gusts_10m.toFixed(1) : '--';
                    const wDir = current.wind_direction_10m ? getWindDir(current.wind_direction_10m) : '';

                    // Tooltip Contents
                    const windTip = `Wind: ${wSpeed} km/h<br>Gusts: ${wGust} km/h<br>Direction: ${wDir} (${current.wind_direction_10m}°)`;
                    const precipTip = `Precipitation: ${current.precipitation ? current.precipitation.toFixed(1) : '0.0'} mm<br>Rain: ${current.rain ? current.rain.toFixed(1) : '0.0'} mm`;

                    container.innerHTML = `
                    <div style="${cardStyle}">
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Temperature</div>
                        <div style="font-size:1.5rem; font-weight:600;">${current.temperature_2m.toFixed(1)}<span style="font-size:0.5em">°C</span></div>
                    </div>
                    <div style="${cardStyle}">
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Dew Point</div>
                        <div style="font-size:1.5rem; font-weight:600; color:${getDewColor(current.dew_point_2m)};">${current.dew_point_2m.toFixed(1)}<span style="font-size:0.5em">°C</span></div>
                    </div>
                    <div style="${cardStyle}">
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Humidity</div>
                        <div style="font-size:1.5rem; font-weight:600;">${rh.toFixed(0)}<span style="font-size:0.5em">%</span></div>
                    </div>
                    <div style="${cardStyle}">
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Heat Impact</div>
                        <div style="font-size:1.5rem; font-weight:600; color:${getImpactColor(pct)};">${pct.toFixed(1)}<span style="font-size:0.5em">%</span></div>
                    </div>
                    
                    <div style="${cardStyle}" onmouseenter="window.showInfoTooltip(event, 'Wind Conditions', '${windTip}')" onmousemove="window.moveForeTooltip(event)" onmouseleave="window.hideForeTooltip()">
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Wind</div>
                        <div style="font-size:1.5rem; font-weight:600;">${wSpeed}<span style="font-size:0.5em">km/h</span></div>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">${wDir}</div>
                    </div>

                    <div style="${cardStyle}" onmouseenter="window.showInfoTooltip(event, 'Precipitation', '${precipTip}')" onmousemove="window.moveForeTooltip(event)" onmouseleave="window.hideForeTooltip()">
                        <div style="font-size:0.8rem; color:var(--text-secondary);">Precipitation</div>
                        <div style="font-size:1.5rem; font-weight:600;">${current.precipitation || 0}<span style="font-size:0.5em">mm</span></div>
                    </div>
                `;
                } */

                // --- Forecast State ---
                let forecastSortCol = 'time';
                let forecastSortDir = 'asc';
                let selectedForeHour = null; // ISO string or null
                let selectedImpactFilter = null; // 'Ideal', 'Good', 'Fair', 'Warning', 'Severe', 'Extreme'

                window.toggleForeSort = function (col) {
                    if (forecastSortCol === col) {
                        forecastSortDir = (forecastSortDir === 'asc') ? 'desc' : 'asc';
                    } else {
                        forecastSortCol = col;
                        forecastSortDir = 'desc'; // Default to high-to-low for most metrics (Temp, Impact, etc) make sense? 
                        // Actually:
                        // Time: asc default
                        // Temp: desc (hotter first)
                        // Impact: desc (worse first)
                        // Wind: desc (stronger first)
                        // But standard table UX usually defaults asc. Let's stick to standard toggle or smart default.
                        // Let's standard toggle: if new col, default asc. 
                        // User can click again.
                        forecastSortDir = 'asc';
                        if (['impact', 'temp', 'dew', 'wind', 'rain', 'prob'].includes(col)) forecastSortDir = 'desc';
                    }
                    renderAllForecasts();
                };

                // --- Auto-Fetch Weather for Florianópolis ---
                // ... (Fetch logic remains the same, just ensures data) ...

                // --- Rendering Functions ---

                // --- Rendering Functions ---




                // Best Run Time Calculation
                window.selectedBestRunRange = '24h'; // Default

                window.setBestRunRange = function (range, event) {
                    if (event) event.stopPropagation();
                    window.selectedBestRunRange = range;

                    // Update UI
                    const btns = document.querySelectorAll('.insight-btn');
                    btns.forEach(btn => {
                        if (btn.innerText.toLowerCase() === range.toLowerCase()) btn.classList.add('active');
                        else btn.classList.remove('active');
                    });

                    // Recalculate
                    calculateBestRunTime(forecastData);
                };

                function calculateBestRunTime(data) {
                    const banner = document.getElementById('best-run-banner');
                    if (!banner || !data || data.length === 0) return;

                    const now = new Date();
                    let end;

                    // Range Logic
                    if (window.selectedBestRunRange === '7d') {
                        end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    } else if (window.selectedBestRunRange === '14d') {
                        end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
                    } else {
                        // Default 24h
                        end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    }

                    const windowData = data.filter(d => {
                        const t = new Date(d.time);
                        return t >= now && t <= end && d.temp != null && d.dew != null;
                    });

                    if (windowData.length === 0) {
                        banner.style.display = 'none';
                        return;
                    }

                    // 2. Reference
                    const baseSec = 300;

                    // 3. Find Min Impact
                    let minImpact = 999;
                    let bestHour = null;

                    windowData.forEach((d) => {
                        const adj = hapCalc.calculatePaceInHeat(baseSec, d.temp, d.dew);
                        const imp = ((adj - baseSec) / baseSec) * 100;
                        if (imp < minImpact) {
                            minImpact = imp;
                            bestHour = d;
                        }
                    });

                    // 4. Update UI
                    const dateBest = new Date(bestHour.time);
                    const timeStr = dateBest.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    // Smart Date String
                    let dayStr;
                    if (dateBest.getDate() === now.getDate()) {
                        dayStr = 'Today';
                    } else if (dateBest.getDate() === new Date(now.getTime() + 86400000).getDate()) {
                        dayStr = 'Tomorrow';
                    } else {
                        dayStr = dateBest.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    }

                    const elVal = document.getElementById('best-run-val');
                    const elImp = document.getElementById('best-run-impact');

                    if (elVal && elImp) {
                        elVal.innerHTML = `${dayStr} ${timeStr}`;

                        // Use unified color logic
                        const color = getImpactColor(minImpact);

                        elImp.textContent = `+${minImpact.toFixed(1)}% Impact`;
                        elImp.className = `insight-impact`;
                        elImp.style.color = color;

                        banner.style.display = 'flex';
                    }
                }

                window.renderAllForecasts = function () {
                    calculateBestRunTime(forecastData);

                    // Render 16-Day Tab (Now 14 Days)
                    renderForecastHeatmap('forecast-grid-container-16', '#legend-container-16', 14);
                    renderForecastTable('forecast-body-16', 14);
                    renderForecastChart('forecast-chart-container-16', 14);
                };

                // --- Shared Helper for Base Pace ---
                const getBasePaceSec = () => {
                    const mode = window.currentPaceMode || 'HMP';
                    const parseEl = (id) => {
                        const el = document.getElementById(id);
                        if (!el || !el.innerText) return 300;
                        const match = el.innerText.match(/(\d{1,2}:\d{2})/);
                        return match ? parseTime(match[1]) : 300;
                    };

                    if (mode === '15KP') return parseEl('pace-3min');
                    if (mode === 'HMP') return parseEl('pace-6min');
                    if (mode === '30KP') return parseEl('pace-10min');
                    if (mode === 'EZ') return parseEl('pace-easy');
                    return 300;
                };

                function renderForecastHeatmap(contId, legSelector, dayLimit) {
                    const cont = document.getElementById(contId);
                    const legCont = document.querySelector(legSelector); // Use querySelector for flexibility
                    if (!cont || !forecastData.length) return;

                    // Group by Day
                    const days = {};
                    forecastData.forEach(d => {
                        const dayKey = d.time.substring(0, 10);
                        if (!days[dayKey]) days[dayKey] = [];
                        days[dayKey].push(d);
                    });



                    // Settings
                    let baseSec = getBasePaceSec();

                    // SVG Dimensions
                    const cellW = 18;
                    const cellH = 18;
                    const gap = 2;
                    const labelW = 48; // Left margin for Day Labels
                    const headerH = 14; // Top margin for Hour Labels

                    const totalW = labelW + (24 * (cellW + gap));
                    const totalH = headerH + ((dayLimit || 7) * (cellH + gap)); // Dynamic height

                    let svgInner = '';

                    // Hour Labels (Top)
                    for (let h = 0; h < 24; h++) {
                        const x = labelW + (h * (cellW + gap)) + (cellW / 2);
                        const y = headerH - 4;
                        svgInner += `<text x="${x}" y="${y}" text-anchor="middle" font-size="8" fill="var(--text-secondary)">${h}</text>`;
                    }

                    // Local ISO for "current hour" check
                    const getLocalIso = () => {
                        const now = new Date();
                        const options = { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false };
                        const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
                        const p = {};
                        parts.forEach(({ type, value }) => p[type] = value);
                        return `${p.year}-${p.month}-${p.day}T${p.hour}`;
                    };
                    const currentIsoPrefix = getLocalIso();



                    // Render Days
                    const dayKeys = Object.keys(days).slice(0, dayLimit || 7);
                    dayKeys.forEach((dayKey, i) => {
                        const dayData = days[dayKey];
                        // ... (keep day name logic) ...
                        const dObj = new Date(dayKey + 'T12:00:00');
                        const dayName = dObj.toLocaleDateString('en-US', { weekday: 'short' });
                        const dateStr = dayKey.substring(8) + '/' + dayKey.substring(5, 7);

                        const yBase = headerH + (i * (cellH + gap));

                        // Day Label (Left)
                        svgInner += `<text x="${labelW - 6}" y="${yBase + (cellH / 2) + 3}" text-anchor="end" font-size="9" font-weight="600" fill="var(--text-primary)">
                            ${dayName} <tspan font-size="7" font-weight="normal" opacity="0.7">${dateStr}</tspan>
                        </text>`;

                        // Cells
                        for (let h = 0; h < 24; h++) {
                            // Robust String Match: Look for 'THH:' pattern
                            const hStr = 'T' + String(h).padStart(2, '0') + ':';
                            const d = dayData.find(item => item.time.includes(hStr));

                            const x = labelW + (h * (cellW + gap));

                            if (d) {
                                // Logic
                                let pct = 0;
                                let color = 'var(--card-bg)';
                                let category = 'Ideal';

                                if (d.temp != null && d.dew != null) {
                                    const adjPace = hapCalc.calculatePaceInHeat(baseSec, d.temp, d.dew);
                                    pct = ((adjPace - baseSec) / baseSec) * 100;
                                    color = getImpactColor(pct);
                                    category = getImpactCategory(pct);
                                } else {
                                    pct = 0;
                                    color = '#333'; // Invalid/Missing data color
                                }

                                // Select/Current styling
                                let opacity = '1';
                                if (selectedImpactFilter && category !== selectedImpactFilter) opacity = '0.05';
                                if (selectedForeHour && selectedForeHour !== d.time) opacity = '0.2';

                                let stroke = '';
                                if (d.time.startsWith(currentIsoPrefix)) {
                                    stroke = 'stroke="#fff" stroke-width="1.5"';
                                }
                                if (selectedForeHour === d.time) {
                                    stroke = 'stroke="#fff" stroke-width="2" paint-order="stroke"';
                                }

                                svgInner += `<rect x="${x}" y="${yBase}" width="${cellW}" height="${cellH}" rx="2" 
                                    fill="${color}" fill-opacity="${opacity}" ${stroke}
                                    style="cursor:pointer; transition: fill-opacity 0.2s;"
                                    onclick="window.toggleForeSelection('${d.time}', event)"
                                    onmouseenter="window.handleCellHover(event, {getAttribute: (a)=> ({'data-day':'${dayName} ${dateStr}', 'data-hour':'${h}', 'data-temp':'${d.temp != null ? d.temp.toFixed(1) : '--'}', 'data-dew':'${d.dew != null ? d.dew.toFixed(1) : '--'}', 'data-pct':'${pct.toFixed(2)}', 'data-color':'${color}'}[a]) })"
                                    onmousemove="window.moveForeTooltip(event)"
                                    onmouseleave="window.hideForeTooltip()"
                                />`;
                            } else {
                                // Empty cell
                                svgInner += `<rect x="${x}" y="${yBase}" width="${cellW}" height="${cellH}" rx="2" fill="var(--card-bg)" opacity="0.1" />`;
                            }
                        }
                    });

                    // Remove any old debug reports
                    const oldDbg = document.getElementById('debug-missing-report');
                    if (oldDbg) oldDbg.remove();

                    cont.innerHTML = `<svg viewBox="0 0 ${totalW} ${totalH}" style="width:100%; height:auto; display:block;">${svgInner}</svg>`;

                    // Render Interactive Legend
                    if (legCont) {
                        const cats = [
                            { l: 'Ideal', c: '#4ade80', lt: '&lt;0.5%' },
                            { l: 'Good', c: '#facc15', lt: '&lt;2%' },
                            { l: 'Fair', c: '#fb923c', lt: '&lt;3.5%' },
                            { l: 'Warning', c: '#f87171', lt: '&lt;6%' },
                            { l: 'Severe', c: '#c084fc', lt: '&ge;6%' }
                        ];

                        let lHtml = '';
                        cats.forEach(cat => {
                            const isActive = selectedImpactFilter === cat.l;
                            const border = isActive ? '2px solid #fff' : '1px solid transparent';
                            const opacity = (selectedImpactFilter && !isActive) ? '0.4' : '1';

                            lHtml += `
                                <div class="legend-item" onclick="window.toggleImpactFilter('${cat.l}')" style="cursor:pointer; opacity:${opacity}; transition:all 0.2s;">
                                    <div class="legend-color" style="background-color:${cat.c}; border:${border}; box-shadow: ${isActive ? '0 0 8px ' + cat.c : 'none'};"></div>
                                    <span>${cat.l} <span style="font-size:0.75em; opacity:0.7">(${cat.lt})</span></span>
                                </div>
                            `;
                        });
                        legCont.innerHTML = lHtml;
                    }
                }

                window.toggleImpactFilter = function (cat) {
                    if (selectedImpactFilter === cat) selectedImpactFilter = null;
                    else selectedImpactFilter = cat;
                    renderAllForecasts();
                };

                // --- Click Outside to Deselect ---
                // (Removed duplicate listener)

                window.renderOverview = function () {
                    // Placeholder if needed
                };
                window.getImpactCategory = function (pct) {
                    if (pct < 0.5) return 'Ideal';
                    if (pct < 2.0) return 'Good';
                    if (pct < 3.5) return 'Fair';
                    if (pct < 6.0) return 'Warning';
                    return 'Severe';
                };

                // (Removed duplicate toggleForeSelection)

                window.sortForecastTable = function (col) {
                    if (forecastSortCol === col) {
                        forecastSortDir = forecastSortDir === 'asc' ? 'desc' : 'asc';
                    } else {
                        forecastSortCol = col;
                        forecastSortDir = 'asc';
                    }
                    renderAllForecasts();
                };

                // Improved Tooltip Handler
                window.handleCellHover = function (e, el) {
                    const day = el.getAttribute('data-day');
                    const hour = el.getAttribute('data-hour');
                    const temp = el.getAttribute('data-temp');
                    const dew = el.getAttribute('data-dew');
                    const pct = el.getAttribute('data-pct');
                    const color = el.getAttribute('data-color');

                    const html = `
                        <div class="tooltip-header">${day} ${hour}:00</div>
                        <div class="tooltip-row"><span class="tooltip-label">Temp:</span> <span class="tooltip-val" style="color:#fff">${temp}°</span></div>
                        <div class="tooltip-row"><span class="tooltip-label">Dew:</span> <span class="tooltip-val" style="color:#60a5fa">${dew}°</span></div>
                        <div class="tooltip-row" style="margin-top:4px; padding-top:4px; border-top:1px solid #374151">
                            <span class="tooltip-label">Impact:</span> <span class="tooltip-val" style="color:${color}">${pct}%</span>
                        </div>
                    `;
                    window.showForeTooltip(e, html);
                };

                window.showForeTooltip = function (e, htmlContent) {
                    let el = document.getElementById('forecast-tooltip');
                    // Create if missing
                    if (!el) {
                        el = document.createElement('div');
                        el.id = 'forecast-tooltip';
                        el.className = 'forecast-tooltip';
                        // Add inline styles just in case CSS missed
                        el.style.position = 'fixed'; // Use fixed for better reliability with scroll
                        el.style.zIndex = '10000';
                        document.body.appendChild(el);
                    }
                    el.innerHTML = htmlContent;
                    el.style.display = 'block'; // Make sure it's visible if it was hidden
                    el.style.opacity = '1';

                    // Initial Position
                    const w = el.offsetWidth;
                    let x = e.clientX + 15;
                    // Flip if overflow right
                    if (x + w > window.innerWidth - 10) {
                        x = e.clientX - w - 15;
                    }
                    const y = e.clientY - el.offsetHeight - 10;
                    el.style.left = x + 'px';
                    el.style.top = y + 'px';
                };
                window.moveForeTooltip = function (e) {
                    const el = document.getElementById('forecast-tooltip');
                    if (el) {
                        const w = el.offsetWidth;
                        let x = e.clientX + 15;
                        if (x + w > window.innerWidth - 10) {
                            x = e.clientX - w - 15;
                        }
                        const y = e.clientY - el.offsetHeight - 10;
                        el.style.left = x + 'px';
                        el.style.top = y + 'px';
                    }
                };
                window.hideForeTooltip = function () {
                    const el = document.getElementById('forecast-tooltip');
                    if (el) el.style.opacity = '0';
                };

                function renderForecastTable(tableBodyId, dayLimit) {
                    const tbody = document.getElementById(tableBodyId || 'forecast-body');
                    if (!tbody || !forecastData.length) return;

                    const table = tbody.closest('table');
                    const thead = table ? table.querySelector('thead tr') : null;

                    if (thead) {
                        const headers = thead.querySelectorAll('th');
                        const colMap = ['time', 'temp', 'dew', 'rain', 'wind', 'impact', 'impact'];

                        headers.forEach((th, i) => {
                            // Reset text (remove existing arrows)
                            let text = th.getAttribute('data-title');
                            if (!text) {
                                text = th.innerText.replace(/[▲▼↑↓]/g, '').trim();
                                th.setAttribute('data-title', text);
                            }
                            th.innerText = text;
                            th.style.color = '';

                            // Check active
                            const colName = colMap[i];
                            // Special handling: rain/prob
                            let active = (forecastSortCol === colName);
                            if (colName === 'rain' && forecastSortCol === 'prob') active = true;

                            if (active) {
                                th.style.color = 'var(--accent-color)';
                                th.innerText += (forecastSortDir === 'asc' ? ' ↑' : ' ↓');
                            }
                        });
                    }

                    // Determine Base Pace
                    let baseSec = getBasePaceSec();

                    let html = '';

                    // 1. Filter Logic
                    let viewData = [];
                    // Combined Filter: specific hour OR general current/future + Impact Category
                    // Sort Handles order, but we also want to limit days for the view
                    let displayLimitDate = null;
                    if (dayLimit) {
                        const start = new Date(forecastData[0].time);
                        displayLimitDate = new Date(start);
                        displayLimitDate.setDate(start.getDate() + dayLimit);
                    }

                    if (selectedForeHour) {
                        viewData = forecastData.filter(d => d.time === selectedForeHour);
                    } else {
                        const now = new Date();
                        viewData = forecastData.filter(item => {
                            const t = new Date(item.time);
                            return t > now && (!displayLimitDate || t < displayLimitDate);
                        });
                    }

                    // Apply Impact Filter
                    if (selectedImpactFilter) {
                        viewData = viewData.filter(d => {
                            const adj = hapCalc.calculatePaceInHeat(baseSec, d.temp, d.dew);
                            const p = ((adj - baseSec) / baseSec) * 100;
                            return getImpactCategory(p) === selectedImpactFilter;
                        });
                    }

                    // 2. Sort Logic
                    // 2. Sort Logic
                    viewData.sort((a, b) => {
                        let valA, valB;
                        // Time Sort
                        if (forecastSortCol === 'time') {
                            return (new Date(a.time) - new Date(b.time)) * (forecastSortDir === 'asc' ? 1 : -1);
                        }

                        // Metric Sort
                        if (forecastSortCol === 'temp') { valA = a.temp; valB = b.temp; }
                        else if (forecastSortCol === 'dew') { valA = a.dew; valB = b.dew; }
                        else if (forecastSortCol === 'rain') { valA = a.rain || 0; valB = b.rain || 0; }
                        else if (forecastSortCol === 'prob') { valA = a.prob || 0; valB = b.prob || 0; }
                        else if (forecastSortCol === 'wind') { valA = a.wind || 0; valB = b.wind || 0; }
                        else {
                            // Impact / Adj Pace (Default)
                            const adjA = hapCalc.calculatePaceInHeat(baseSec, a.temp, a.dew);
                            const pctA = ((adjA - baseSec) / baseSec);
                            const adjB = hapCalc.calculatePaceInHeat(baseSec, b.temp, b.dew);
                            const pctB = ((adjB - baseSec) / baseSec);
                            valA = pctA; valB = pctB;
                        }

                        // Ensure Numbers
                        valA = Number(valA);
                        valB = Number(valB);

                        if (isNaN(valA)) valA = -Infinity;
                        if (isNaN(valB)) valB = -Infinity;

                        // Compare
                        if (valA < valB) return forecastSortDir === 'asc' ? -1 : 1;
                        if (valA > valB) return forecastSortDir === 'asc' ? 1 : -1;

                        // Secondary Sort: Time Ascending (Stability)
                        return new Date(a.time) - new Date(b.time);
                    });


                    viewData.forEach(h => {
                        const date = new Date(h.time);
                        const now = new Date();
                        const isToday = date.getDate() === now.getDate();
                        const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
                        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

                        // Calc Impact
                        let pct = 0;
                        let impactColor = '#333';
                        let adjPace = baseSec;

                        if (h.temp != null && h.dew != null) {
                            adjPace = hapCalc.calculatePaceInHeat(baseSec, h.temp, h.dew);
                            pct = ((adjPace - baseSec) / baseSec) * 100;
                            impactColor = getImpactColor(pct); // Use unified color logic
                        }


                        const rain = h.rain != null ? h.rain : 0;
                        const prob = h.prob != null ? h.prob : 0;
                        const wind = h.wind != null ? h.wind : 0;
                        const dir = h.dir != null ? h.dir : 0;

                        // Wind Dir Arrow
                        const arrowStyle = `display:inline-block; transform:rotate(${dir}deg); font-size:0.8em; margin-left:2px;`;

                        // Condition Colors for new cols
                        // Unified with Current Tab
                        const tempColor = window.getCondColor ? window.getCondColor('air', h.temp) : 'inherit';
                        const probColor = window.getCondColor ? window.getCondColor('prob', prob) : 'inherit';
                        const windColor = window.getCondColor ? window.getCondColor('wind', wind) : 'inherit';

                        // Rain is binary-ish here (blue if rain)
                        const rainColor = rain > 0 ? '#60a5fa' : 'inherit';

                        // Dew uses specific dew logic
                        const dewColor = window.getDewColor ? window.getDewColor(h.dew) : 'inherit';

                        html += `
                        <tr style="${selectedForeHour && h.time === selectedForeHour ? 'background:var(--card-bg); font-weight:bold;' : ''}">
                            <td style="padding:10px; color:var(--text-secondary); white-space:nowrap;">
                                <div style="font-size:0.75em;">${dayName}</div>
                                <div style="font-size:1em; color:var(--text-primary); font-weight:500;">${timeStr}</div>
                            </td>
                            <td style="text-align:center; color:${tempColor}">${h.temp != null ? h.temp.toFixed(0) : '--'}°</td>
                            <td style="text-align:center; color:${dewColor}">${h.dew != null ? h.dew.toFixed(0) : '--'}°</td>
                            <td style="text-align:center;">
                                <div style="color:${rainColor};">${rain > 0 ? rain.toFixed(1) + 'mm' : '-'}</div>
                                <div style="font-size:0.75em; color:${prob > 0 ? probColor : 'var(--text-secondary)'}; opacity:0.8;">${prob > 0 ? '(' + prob + '%)' : ''}</div>
                            </td>
                            <td style="text-align:center; color:${windColor}">${wind.toFixed(0)} <span style="font-size:0.7em;color:var(--text-secondary)">km/h</span> <span style="${arrowStyle}">↓</span></td>
                            <td style="text-align:center;">
                                <span class="impact-badge" style="background:${impactColor}; color:${pct > 2.0 ? '#000' : '#000'}; font-weight:600;">
                                    ${pct.toFixed(1)}%
                                </span>
                            </td>
                            <td style="text-align:right; font-family:monospace; font-size:1.1em; color:var(--accent-color);">
                                ${formatTime(adjPace)}
                            </td>
                        </tr>
                    `;
                    });

                    tbody.innerHTML = html;
                }

                // --- Unified Color Helpers ---

                // Impact Color
                window.getImpactColor = function (pct) {
                    if (pct < 0.5) return "#4ade80"; // Green
                    if (pct < 2.0) return "#facc15"; // Yellow
                    if (pct < 3.5) return "#fb923c"; // Orange
                    if (pct < 6.0) return "#f87171"; // Red
                    return "#c084fc"; // Purple
                };

                // Dew Point Color
                window.getDewColor = function (d) {
                    if (d < 15) return "var(--text-primary)"; // Comfortable
                    if (d < 20) return "#facc15"; // Yellow (Sticky)
                    if (d < 24) return "#fb923c"; // Orange (Uncomfortable)
                    return "#f87171"; // Red (Oppressive)
                };

                // Condition Color (Generic)
                window.getCondColor = function (type, val) {
                    const cGood = '#4ade80';
                    const cFair = '#facc15';
                    const cWarn = '#fb923c';
                    const cBad = '#f87171';
                    const cPurple = '#c084fc';

                    if (type === 'air') {
                        if (val > 35) return cPurple;
                        if (val > 32) return cBad;
                        if (val > 28) return cWarn;
                        if (val < 10) return cFair;
                        return cGood;
                    }
                    if (type === 'hum') {
                        if (val >= 90) return cBad;
                        if (val >= 75) return cWarn;
                        return cGood;
                    }
                    if (type === 'wind') {
                        if (val >= 40) return cBad;
                        if (val >= 25) return cWarn;
                        if (val >= 15) return cFair;
                        return cGood;
                    }
                    if (type === 'uv') {
                        if (val >= 8) return cBad;
                        if (val >= 6) return cWarn;
                        if (val >= 3) return cFair;
                        return cGood;
                    }
                    if (type === 'aqi') {
                        if (val > 150) return cBad;
                        if (val > 100) return cWarn;
                        if (val > 50) return cFair;
                        return cGood;
                    }
                    if (type === 'prob') {
                        if (val >= 60) return cBad;
                        if (val >= 30) return cWarn;
                        return cGood;
                    }
                    if (type === 'pm25') {
                        if (val > 35) return cBad;
                        if (val > 12) return cWarn;
                        return cGood;
                    }
                    return "var(--text-primary)";
                };

                // --- Info Tooltip for Current Conditions ---
                window.showInfoTooltip = function (e, title, text) {
                    e.stopPropagation(); // specific handling
                    let el = document.getElementById('forecast-tooltip');
                    if (!el) {
                        el = document.createElement('div');
                        el.id = 'forecast-tooltip';
                        el.className = 'forecast-tooltip';
                        document.body.appendChild(el);
                    }

                    const html = `
                        <div style="font-weight:600; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:4px;">${title}</div>
                        <div style="font-size:0.85em; opacity:0.9; line-height:1.4;">${text}</div>
                    `;

                    el.innerHTML = html;
                    el.style.display = 'block';
                    el.style.opacity = '1';
                    el.style.maxWidth = '200px'; // Limit width for text reading

                    // Position (adjust for mobile edges)
                    const tooltipWidth = 200;
                    let left = e.clientX + 10;
                    if (left + tooltipWidth > window.innerWidth) {
                        left = e.clientX - tooltipWidth - 10;
                    }
                    const top = e.clientY + 10; // Below cursor

                    el.style.left = left + 'px';
                    el.style.top = top + 'px';
                };



                // --- Auto-Fetch Weather for Florianópolis ---
                // --- Auto-Fetch Weather for Selected Location ---
                // --- Auto-Fetch Weather for Selected Location ---
                window.fetchWeather = async function (force = false) {
                    try {
                        const loc = window.currentLocation || (window.locManager && window.locManager.current) ? window.locManager.current : { lat: -27.5969, lon: -48.5495 };
                        const lat = loc.lat;
                        const lon = loc.lon;

                        console.log(`Fetching weather for: ${lat}, ${lon} (${force ? 'forced' : 'normal'})`);

                        // 1. Weather API (Included shortwave_radiation for WBGT)
                        // Using 'auto' timezone to handle global locations correctly
                        const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,dew_point_2m,uv_index,shortwave_radiation,pressure_msl&hourly=temperature_2m,dew_point_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,shortwave_radiation,weather_code,pressure_msl&daily=sunrise,sunset&timezone=auto&forecast_days=14`;

                        // 2. Air Quality API
                        const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5&timezone=auto`;

                        const [wRes, aRes] = await Promise.all([fetch(wUrl), fetch(aUrl)]);

                        if (!wRes.ok) throw new Error("Weather API Error");
                        const wData = await wRes.json();
                        window.weatherData = wData; // Expose for Map Module

                        let aData = {};
                        if (aRes.ok) aData = await aRes.json();
                        window.airData = aData;

                        console.log("Weather Data Fetched:", wData.current ? "Has Current" : "No Current", "Loc:", lat, lon);

                        // 1. Populate Calculator Inputs (Current)
                        const els = window.els; // Ensure we use the global object
                        if (wData.current && els) {
                            if (els.temp) els.temp.value = (wData.current.temperature_2m != null) ? wData.current.temperature_2m.toFixed(1) : '';
                            if (els.dew) els.dew.value = (wData.current.dew_point_2m != null) ? wData.current.dew_point_2m.toFixed(1) : '';
                            // Trigger calculator update
                            if (typeof update === 'function') update();

                            // Calculate Rain Forecast (Next 2h Sum) and Prob
                            let prob2h = 0;
                            let precip2h = 0;
                            if (wData.hourly && wData.hourly.precipitation_probability) {
                                // Find closest hour index
                                const nowIso = wData.current.time.substring(0, 13);
                                const idx = wData.hourly.time.findIndex(t => t.startsWith(nowIso));
                                if (idx !== -1) {
                                    const p1 = wData.hourly.precipitation_probability[idx] || 0;
                                    const p2 = wData.hourly.precipitation_probability[idx + 1] || 0;
                                    prob2h = Math.max(p1, p2);

                                    const r1 = wData.hourly.precipitation[idx] || 0;
                                    const r2 = wData.hourly.precipitation[idx + 1] || 0;
                                    precip2h = r1 + r2;
                                }
                            }

                            // Render Rich Tab
                            renderCurrentTab(wData.current, aData.current, prob2h, precip2h, wData.daily);

                            // Add source note if missing
                            if (els.weatherImpact && !document.getElementById('weather-source-note')) {
                                const note = document.createElement('div');
                                note.id = 'weather-source-note';
                                note.style.fontSize = "0.65rem";
                                note.style.color = "var(--text-secondary)";
                                note.style.marginTop = "4px";
                                note.style.textAlign = "right";
                                note.textContent = "Live data from Florianópolis (Open-Meteo)";
                                els.weatherImpact.parentNode.appendChild(note);
                            } else if (document.getElementById('weather-source-note')) {
                                // Update note
                                const note = document.getElementById('weather-source-note');
                                note.textContent = `Live data from ${loc.name} (Open-Meteo)`;
                            }
                        }

                        // 2. Forecast Data
                        if (wData.hourly) {
                            forecastData = [];
                            for (let i = 0; i < wData.hourly.time.length; i++) {
                                forecastData.push({
                                    time: wData.hourly.time[i],
                                    temp: wData.hourly.temperature_2m[i],
                                    dew: wData.hourly.dew_point_2m[i],
                                    rain: wData.hourly.precipitation[i],
                                    prob: wData.hourly.precipitation_probability[i],
                                    wind: wData.hourly.wind_speed_10m[i],
                                    dir: wData.hourly.wind_direction_10m[i]
                                });
                            }
                            renderAllForecasts();
                        }


                    } catch (e) {
                        console.error("Weather Fetch Failed", e);
                        const c = document.getElementById('current-content');
                        if (c) c.innerHTML = `<div style="color:var(--text-secondary); text-align:center;">Weather Unavailable<br><span style="font-size:0.8em; color:#f87171;">${e.message}<br>${e.stack ? e.stack.split('\n')[0] : ''}</span></div>`;
                    }
                } // End fetchWeather

                window.renderCurrentTab = function (w, a, prob2h = 0, precip2h = 0, daily) {
                    const container = document.getElementById('current-content');
                    if (!container) return;

                    // Metrics
                    const safeVal = (v, dec = 1) => (v != null && !isNaN(v)) ? v.toFixed(dec) : '--';
                    const rh = w.relative_humidity_2m;
                    const feels = w.apparent_temperature;
                    const wind = w.wind_speed_10m;
                    const windGust = w.wind_gusts_10m || 0;
                    const dir = w.wind_direction_10m; // degrees
                    const rain = w.rain; // mm
                    const precip = w.precipitation || 0;
                    const uv = w.uv_index;
                    const aqi = a ? a.us_aqi : '--';
                    const pm25 = a ? a.pm2_5 : '--';

                    // Convert Dir to Cardinal
                    const getCardinal = (angle) => {
                        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                        return directions[Math.round(angle / 45) % 8];
                    };
                    const windDirStr = getCardinal(dir);

                    // --- WBGT Calculation (ACSM / BOM Estimation) ---
                    const calculateWBGT = (temp, rh, wind, solar) => {
                        // 1. Estimate Wet Bulb (Tw) using Stull (2011)
                        // T = Temp (C), RH = %
                        const T = temp;
                        const RH = rh;
                        const Tw = T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5)) +
                            Math.atan(T + RH) - Math.atan(RH - 1.676331) +
                            0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 4.686035;

                        // 2. Estimate Black Globe Temp (Tg)
                        // Uses a simplified approximation for outdoor runners: Tg ~= T + (0.0144 * SolarRad) + WindCorrection
                        // Improved model: Tg = T + (0.007 * SolarRad) * (1 - 0.05 * WindSpeed) - rough approx to account for wind cooling
                        // A more standard simple approx: Tg = T + (SolarRad / (4 * (Wind + 2.0))) * 0.5 (Just heuristic)

                        // We will use the Dimiceli / ABM approximation logic simplified:
                        // Tg grows with Radiation and shrinks with Wind.
                        // Standard assumption for low wind full sun: Tg is ~10-15C higher than T.
                        // f(wind) = exp(-0.3 * wind) (Wind in m/s)
                        const windMs = wind / 3.6;
                        const windFactor = Math.exp(-0.25 * windMs); // Wind cooling effect on the globe
                        const Tg = T + (0.019 * solar * windFactor); // Solar heating factor adjusted for wind

                        // 3. Calculate Outdoor WBGT
                        // WBGT = 0.7 * Tw + 0.2 * Tg + 0.1 * T
                        const wbgt = (0.7 * Tw) + (0.2 * Tg) + (0.1 * T);
                        return wbgt;
                    };

                    const wbgtVal = (w.shortwave_radiation != null) ? calculateWBGT(w.temperature_2m, w.relative_humidity_2m, w.wind_speed_10m, w.shortwave_radiation) : null;

                    // --- New Metrics Calc ---
                    const pressure = w.pressure_msl || 1013;

                    // Run Score
                    let runScore = 100;
                    if (window.hapCalc) {
                        const res = hapCalc.calculatePaceInHeat(300, w.temperature_2m, w.dew_point_2m);
                        runScore = Math.max(0, Math.round(100 - (res.percentImpact * 12)));
                    }
                    const getScoreColor = (s) => s >= 90 ? '#4ade80' : s >= 75 ? '#a3e635' : s >= 60 ? '#facc15' : s >= 40 ? '#fb923c' : '#f87171';

                    // Sweat Rate (Heuristic)
                    const srBase = wbgtVal !== null ? wbgtVal : feels;
                    let sweatRate = 1.0 + (srBase - 20) * 0.05;
                    if (sweatRate < 0.4) sweatRate = 0.4;

                    // WBGT Color & Risk
                    const getWBGTColor = (val) => {
                        if (val < 18) return '#4ade80'; // Green (Low)
                        if (val < 21) return '#facc15'; // Yellow (Moderate)
                        if (val < 25) return '#fb923c'; // Orange (High)
                        if (val < 28) return '#f87171'; // Red (Very High)
                        return '#c084fc'; // Purple (Extreme)
                    };
                    const getWBGTText = (val) => {
                        if (val < 18) return 'Low Risk';
                        if (val < 21) return 'Mod. Risk'; // Adjusted for runner sensitivity
                        if (val < 25) return 'High Risk';
                        if (val < 28) return 'Very High';
                        if (val < 30) return 'Extreme';
                        return 'CANCEL';
                    };




                    // Styles
                    const sectionStyle = "background:var(--card-bg); padding:16px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px;";
                    const headStyle = "font-size:0.9rem; font-weight:600; color:var(--text-primary); margin-bottom:12px; display:flex; align-items:center; gap:6px;";
                    const gridStyle = "display:grid; grid-template-columns: 1fr 1fr; gap:12px; row-gap:16px; align-items: stretch;";
                    const itemStyle = "display:flex; flex-direction:column; justify-content:space-between; height:100%;";
                    const labelStyle = "font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;";
                    const valStyle = "font-size:1.1rem; font-weight:500; color:var(--text-primary); margin-top:auto;";

                    let html = '';

                    // Helper for info icon
                    const infoIcon = (title, text) => {
                        const tSafe = title.replace(/'/g, "\\'");
                        const txtSafe = text.replace(/'/g, "\\'");
                        return `<span onclick="window.showInfoTooltip(event, '${tSafe}', '${txtSafe}')" style="cursor:pointer; opacity:0.5; margin-left:4px; display:inline-flex; vertical-align:middle;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>`;
                    };

                    // 1. Temperature Section (WBGT Integrated)
                    html += `<div style="${sectionStyle}">
                        <div style="${headStyle}"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"></path><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"></path></svg> Temperature</div>
                        <div style="${gridStyle}">
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">Air ${infoIcon('Air Temperature', 'The dry-bulb temperature. Does not account for humidity or wind.<br><br><span style=&quot;color:#4ade80&quot;><b>< 10°C (Fair):</b></span> Cool.<br><span style=&quot;color:#4ade80&quot;><b>10-20°C (Good):</b></span> Ideal for running.<br><span style=&quot;color:#fb923c&quot;><b>20-25°C (Warm):</b></span> Perf impact starts.<br><span style=&quot;color:#f87171&quot;><b>> 25°C (Hot):</b></span> High impact.')}</div>
                                <div style="${valStyle}; color:${getCondColor('air', w.temperature_2m)}">${safeVal(w.temperature_2m)} <span style="font-size:0.8em">°C</span></div>
                            </div>
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">WBGT ${infoIcon('WBGT (Wet Bulb Globe Temp)', 'The Gold Standard for heat safety. Accounts for Temp, Humidity, Wind AND Solar Radiation.<br><br><span style=&quot;color:#4ade80&quot;><b>< 18°C (Low Risk):</b></span> Safe. Hard efforts OK.<br><span style=&quot;color:#facc15&quot;><b>18-21°C (Moderate):</b></span> Caution. Hydrate more.<br><span style=&quot;color:#fb923c&quot;><b>21-25°C (High):</b></span> Slow down. Heat cramps risk.<br><span style=&quot;color:#f87171&quot;><b>25-28°C (Very High):</b></span> Dangerous. Limit intensity.<br><span style=&quot;color:#c084fc&quot;><b>> 28°C (Extreme):</b></span> Cancel hard runs. Survival mode.')}</div>
                                <div style="${valStyle}; color:${wbgtVal !== null ? getWBGTColor(wbgtVal) : getCondColor('air', feels)}">
                                    ${wbgtVal !== null ? wbgtVal.toFixed(1) : safeVal(feels)} <span style="font-size:0.8em">°C</span>
                                </div>
                            </div>
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">Dew Point ${infoIcon('Dew Point', 'The absolute measure of moisture in the air. The critical metric for runner comfort.<br><br><span style=&quot;color:#4ade80&quot;><b>< 15°C (Comfortable):</b></span> Crisp.<br><span style=&quot;color:#facc15&quot;><b>15-20°C (Humid):</b></span> Noticeable.<br><span style=&quot;color:#fb923c&quot;><b>20-24°C (Uncomfortable):</b></span> Hard.<br><span style=&quot;color:#f87171&quot;><b>> 24°C (Oppressive):</b></span> Very High Risk.')}</div>
                                <div style="${valStyle}; color:${getDewColor(w.dew_point_2m)}">${safeVal(w.dew_point_2m)} <span style="font-size:0.8em">°C</span></div>
                            </div>
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">Humidity ${infoIcon('Relative Humidity', 'Relative saturation of the air. High humidity hinders sweat evaporation.<br><br><span style=&quot;color:#4ade80&quot;><b>< 75% (OK):</b></span> Good evaporation.<br><span style=&quot;color:#fb923c&quot;><b>75-90% (Sticky):</b></span> Sweat drips.<br><span style=&quot;color:#f87171&quot;><b>> 90% (Oppressive):</b></span> No evaporation.')}</div>
                                <div style="${valStyle}; color:${getCondColor('hum', rh)}">${safeVal(rh, 0)} <span style="font-size:0.8em">%</span></div>
                            </div>
                        </div>
                    </div>`;

                    // 2. Wind & Precip
                    // 2. Wind
                    html += `<div style="${sectionStyle}">
                        <div style="${headStyle}"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg> Wind</div>
                        <div style="${gridStyle}">
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">Speed ${infoIcon('Wind Speed', 'Sustained wind speed at 10m height.<br><br><span style=&quot;color:#4ade80&quot;><b>< 15 km/h (Light):</b></span> Negligible.<br><span style=&quot;color:#facc15&quot;><b>15-24 km/h (Moderate):</b></span> Noticeable.<br><span style=&quot;color:#fb923c&quot;><b>25-39 km/h (High):</b></span> Significant drag.<br><span style=&quot;color:#f87171&quot;><b>40+ km/h (Severe):</b></span> Stormy.')}</div>
                                <div style="${valStyle}; color:${getCondColor('wind', wind)}">${safeVal(wind)} <span style="font-size:0.7em">km/h</span></div>
                            </div>
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">Gusts ${infoIcon('Wind Gusts', 'Maximum instantaneous wind speed at 10 meters.')}</div>
                                <div style="${valStyle}; color:${getCondColor('wind', windGust)}">${safeVal(windGust)} <span style="font-size:0.7em">km/h</span></div>
                            </div>
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">Direction</div>
                                <div style="${valStyle}">${windDirStr} <span style="font-size:0.7em; color:var(--text-secondary);">(${dir}°)</span></div>
                            </div>
                        </div>
                    </div>`;

                    html += `<div style="${sectionStyle}">
                        <div style="${headStyle}"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg> Precipitation</div>
                        <div style="${gridStyle}">
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">Rain (2h) ${infoIcon('Rain Forecast', 'Estimated total precipitation currently expected for the next 2 hours.')}</div>
                                <div style="${valStyle}">${safeVal(precip2h)} <span style="font-size:0.7em">mm</span></div>
                            </div>
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">Chance ${infoIcon('Rain Probability', 'Probability of precipitation.<br><br><span style=&quot;color:#4ade80&quot;><b>< 30% (Low):</b></span> Unlikely.<br><span style=&quot;color:#fb923c&quot;><b>30-60% (Medium):</b></span> Possible.<br><span style=&quot;color:#f87171&quot;><b>> 60% (High):</b></span> Look for shelter.')}</div>
                                <div style="${valStyle}; color:${getCondColor('prob', prob2h)}">${prob2h} <span style="font-size:0.7em">%</span></div>
                            </div>
                        </div>
                    </div>`;

                    // 4. Radiation & Air
                    // Remove local aqiColor logic in favor of getCondColor helper

                    html += `<div style="${sectionStyle}">
                        <div style="${headStyle}"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg> Radiation & Air</div>
                        <div style="${gridStyle} grid-template-columns: 1fr 1fr 1fr;">
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">UV Index ${infoIcon('UV Index (WHO)', 'Strength of sunburn-producing UV radiation.<br><br><span style=&quot;color:#4ade80&quot;><b>0-2 (Low):</b></span> Safe.<br><span style=&quot;color:#facc15&quot;><b>3-5 (Mod):</b></span> Sunscreen.<br><span style=&quot;color:#fb923c&quot;><b>6-7 (High):</b></span> Cover up.<br><span style=&quot;color:#f87171&quot;><b>8-10 (Very High):</b></span> Shade.<br><span style=&quot;color:#c084fc&quot;><b>11+ (Extreme):</b></span> Stay inside.')}</div>
                                <div style="${valStyle}; color:${getCondColor('uv', uv)}">${safeVal(uv, 2)}</div>
                            </div>
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">AQI ${infoIcon('US AQI (EPA)', 'Index for reporting daily air quality.<br><br><span style=&quot;color:#4ade80&quot;><b>0-50 (Good):</b></span> Breath easy.<br><span style=&quot;color:#facc15&quot;><b>51-100 (Mod):</b></span> Acceptable.<br><span style=&quot;color:#fb923c&quot;><b>101-150 (Sensitive):</b></span> Asthma risk.<br><span style=&quot;color:#f87171&quot;><b>151+ (Unhealthy):</b></span> Bad for all.')}</div>
                                <div style="${valStyle}; color:${getCondColor('aqi', aqi)}">${aqi}</div>
                            </div>
                            <div style="${itemStyle}">
                                <div style="${labelStyle}">PM2.5 ${infoIcon('PM2.5 (EPA)', 'Fine particles (<2.5µm) that penetrate lungs.<br><br><span style=&quot;color:#4ade80&quot;><b>0-12 (Good):</b></span> Clear.<br><span style=&quot;color:#fb923c&quot;><b>12-35 (Mod):</b></span> Haze.<br><span style=&quot;color:#f87171&quot;><b>35+ (Unhealthy):</b></span> Mask up.')}</div>
                                <div style="${valStyle}; color:${getCondColor('pm25', pm25)}">${pm25} <span style="font-size:0.7em">µg</span></div>
                            </div>
                        </div>
                    </div>`;



                    // 5. Sun Cycle
                    if (daily) {
                        const fmtTime = (iso) => iso ? iso.substring(11, 16) : '--:--';

                        // Helper: Add minutes to HH:MM string directly
                        const shiftTime = (timeStr, deltaMin) => {
                            if (!timeStr || timeStr === '--:--') return '--:--';
                            const parts = timeStr.split(':');
                            let h = parseInt(parts[0], 10);
                            let m = parseInt(parts[1], 10);

                            let total = h * 60 + m + deltaMin;
                            if (total < 0) total += 1440; // wrap around day
                            if (total >= 1440) total -= 1440;

                            const newH = Math.floor(total / 60);
                            const newM = total % 60;
                            return String(newH).padStart(2, '0') + ':' + String(newM).padStart(2, '0');
                        };

                        // 5. Sun Cycle (Solar Horizon Graph)
                        {
                            // Parse times to minutes
                            const toMin = (str) => {
                                if (!str) return 0;
                                const p = str.split(':').map(Number);
                                return p[0] * 60 + p[1];
                            };

                            // Restore definitions
                            const sunrise = fmtTime(daily.sunrise ? daily.sunrise[0] : null);
                            const sunset = fmtTime(daily.sunset ? daily.sunset[0] : null);
                            const dawn = shiftTime(sunrise, -25);
                            const dusk = shiftTime(sunset, 25);

                            const dawnMin = toMin(dawn);
                            const sunriseMin = toMin(sunrise);
                            const sunsetMin = toMin(sunset);
                            const duskMin = toMin(dusk);

                            // Current time in minutes
                            const nowD = new Date();
                            const nowMin = nowD.getHours() * 60 + nowD.getMinutes();

                            // New Stats
                            const totalDayMin = sunsetMin - sunriseMin;

                            // Remaining daylight (sunset - now)
                            const remainingMin = Math.max(0, sunsetMin - nowMin);
                            const remHours = Math.floor(remainingMin / 60);
                            const remM = remainingMin % 60;
                            const daylightStr = remainingMin > 0 ? `${remHours}h ${remM}m left` : 'Night';

                            const solarNoonMin = sunriseMin + (totalDayMin / 2);
                            const noonH = Math.floor(solarNoonMin / 60);
                            const noonM = Math.floor(solarNoonMin % 60);
                            const solarNoonStr = `${String(noonH).padStart(2, '0')}:${String(noonM).padStart(2, '0')}`;

                            // Graph Scales (ViewBox 300 x 60)
                            const scaleX = (m) => (m / 1440) * 300;
                            const yHorizon = 50;

                            const xSunrise = scaleX(sunriseMin);
                            const xSunset = scaleX(sunsetMin);
                            const xNoon = scaleX(solarNoonMin);
                            const xNow = scaleX(nowMin);

                            html += `<div class="solar-card" style="${sectionStyle}">
                            <div style="${headStyle}">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                                Solar Cycle
                                <span style="margin-left:auto; font-size:0.75em; font-weight:normal; color:var(--text-secondary);">${daylightStr}</span>
                            </div>
                            
                            <!-- Minimalist Arc Graph -->
                            <div style="position:relative; width:100%; height:50px; margin:8px 0;">
                                <svg viewBox="0 0 300 50" width="100%" height="100%" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="dayGradMin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stop-color="#facc15" stop-opacity="0.2"/>
                                            <stop offset="100%" stop-color="transparent" stop-opacity="0"/>
                                        </linearGradient>
                                    </defs>
                                    <!-- Horizon Line -->
                                    <line x1="0" y1="40" x2="300" y2="40" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
                                    <!-- Sun Arc -->
                                    <path d="M ${xSunrise},40 Q ${xNoon},5 ${xSunset},40" fill="url(#dayGradMin)" stroke="rgba(250,204,21,0.4)" stroke-width="1" />
                                    <!-- Current Position - Discreet tick -->
                                    <line x1="${xNow}" y1="38" x2="${xNow}" y2="42" stroke="var(--accent-color)" stroke-width="1" opacity="${nowMin >= sunriseMin && nowMin <= sunsetMin ? 0.6 : 0.2}" />
                                </svg>
                            </div>
                            
                            <!-- Sunrise/Sunset Times -->
                            <div style="display:flex; justify-content:space-between; font-size:0.85em; color:var(--text-secondary);">
                                <div>
                                    <div style="color:var(--text-primary); font-weight:500;">${sunrise}</div>
                                    <div style="font-size:0.8em;">Dawn ${dawn}</div>
                                </div>
                                <div style="text-align:center;">
                                    <div style="font-size:0.7em; opacity:0.7;">NOON</div>
                                    <div style="color:var(--text-primary); font-weight:500;">${solarNoonStr}</div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="color:var(--text-primary); font-weight:500;">${sunset}</div>
                                    <div style="font-size:0.8em;">Dusk ${dusk}</div>
                                </div>
                            </div>
                        </div>`;
                        }


                    }

                    // 6. Live Map Module (Windy)

                    container.innerHTML = html;
                }

                // --- Global Interactions ---
                window.toggleForeSelection = function (isoTime, e) {
                    if (e) e.stopPropagation(); // Pivot fix: prevent document click from clearing selection immediately
                    if (selectedForeHour === isoTime) selectedForeHour = null;
                    else selectedForeHour = isoTime;
                    renderAllForecasts();
                };

                window.hideForeTooltip = function () {
                    const el = document.getElementById('forecast-tooltip');
                    if (el) {
                        el.style.opacity = '0';
                        el.style.display = 'none';
                    }
                };

                // --- Click Outside to Deselect & Hide Tooltip ---
                // --- Click Outside to Deselect & Hide Tooltip ---
                document.addEventListener('click', function (e) {
                    // FORECAST CONTAINERS
                    const grid = document.getElementById('forecast-grid-container');
                    const chart = document.getElementById('forecast-chart-container');
                    const tooltip = document.getElementById('forecast-tooltip');

                    // CLIMATE CONTAINERS
                    const heat = document.getElementById('climate-heatmap-container');
                    const legend = document.getElementById('climate-legend-container'); // Corrected
                    const legHandler = e.target.closest('.legend-item') && e.target.closest('#climate-legend-container'); // Keep for safety if needed, or rely on container check?
                    // Forecast uses container check. Let's use container check.

                    const isGridClick = grid && grid.contains(e.target);
                    const isChartClick = chart && chart.contains(e.target);
                    const isTooltipClick = tooltip && tooltip.contains(e.target);
                    const isHeatClick = heat && heat.contains(e.target);

                    const isLegend = e.target.closest('.legend-container');
                    const isPaceTag = e.target.closest('.tag-btn');
                    const isTabBtn = e.target.closest('.tab-btn');

                    // 1. FORECAST DESELECTION
                    if (!isGridClick && !isChartClick && !isTooltipClick && !isLegend && !isPaceTag && !isTabBtn) {
                        if (selectedForeHour) {
                            selectedForeHour = null;
                            renderAllForecasts();
                        }
                        window.hideForeTooltip();
                    }

                    // 2. CLIMATE DESELECTION
                    // Mirroring Forecast Logic exactly: Check if click is OUTSIDE component containers
                    if (window.selectedClimateKey && !isHeatClick && !isTabBtn) {
                        const isLegendClick = legend && legend.contains(e.target);

                        if (!isLegendClick) {
                            window.selectedClimateKey = null;
                            if (window.renderClimateTable) window.renderClimateTable();
                            if (window.renderClimateHeatmap) window.renderClimateHeatmap();
                        }
                    }


                });


                // --- Forecast Chart Implementation ---
                window.renderForecastChart = function (containerId, dayLimit) {
                    const cont = document.getElementById(containerId || 'forecast-chart-container');
                    if (!cont || !forecastData || forecastData.length === 0) return;

                    // Data Slicing
                    let chartData = forecastData;
                    if (dayLimit) {
                        chartData = forecastData.slice(0, 24 * dayLimit);
                    }

                    // Dimensions (Responsive)
                    // Use clientWidth but wait for layout if possible?
                    const w = cont.clientWidth;
                    const h = 180; // Fixed height
                    if (w === 0) return; // Not visible yet

                    const pad = { top: 20, right: 10, bottom: 20, left: 30 };
                    const chartW = w - pad.left - pad.right;
                    const chartH = h - pad.top - pad.bottom;

                    // Scales
                    const temps = chartData.map(d => d.temp);
                    const dews = chartData.map(d => d.dew);
                    const allVals = [...temps, ...dews];
                    let minVal = Math.min(...allVals);
                    let maxVal = Math.max(...allVals);
                    minVal = Math.floor(minVal - 2);
                    maxVal = Math.ceil(maxVal + 2);
                    const valRange = maxVal - minVal;

                    const getX = (i) => pad.left + (i / (chartData.length - 1)) * chartW;
                    const getY = (val) => pad.top + chartH - ((val - minVal) / valRange) * chartH;

                    // Paths
                    // Paths (Handle Gaps for Null Data)
                    let pathTemp = '';
                    let pathDew = '';
                    let hasStartedTemp = false;
                    let hasStartedDew = false;

                    chartData.forEach((d, i) => {
                        const x = getX(i);

                        // Temp Path
                        if (d.temp != null) {
                            const yT = getY(d.temp);
                            const cmd = hasStartedTemp ? 'L' : 'M';
                            pathTemp += `${cmd} ${x.toFixed(1)} ${yT.toFixed(1)} `;
                            hasStartedTemp = true;
                        } else {
                            hasStartedTemp = false; // Break the line
                        }

                        // Dew Path
                        if (d.dew != null) {
                            const yD = getY(d.dew);
                            const cmd = hasStartedDew ? 'L' : 'M';
                            pathDew += `${cmd} ${x.toFixed(1)} ${yD.toFixed(1)} `;
                            hasStartedDew = true;
                        } else {
                            hasStartedDew = false; // Break the line
                        }
                    });

                    // Build SVG
                    let svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" style="cursor:crosshair;">`;

                    // Grid & Labels
                    const steps = 5;
                    for (let i = 0; i <= steps; i++) {
                        const val = minVal + (valRange * (i / steps));
                        const y = getY(val);
                        svg += `<line x1="${pad.left}" y1="${y}" x2="${w - pad.right}" y2="${y}" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="4 4" opacity="0.3" style="pointer-events:none;" />`;
                        svg += `<text x="${pad.left - 5}" y="${y + 3}" fill="var(--text-secondary)" font-size="9" text-anchor="end" style="pointer-events:none;">${Math.round(val)}</text>`;
                    }

                    // Days Delimiter (Midnight) & Labels (Noon)
                    chartData.forEach((d, i) => {
                        const date = new Date(d.time);
                        const hour = parseInt(d.time.substring(11, 13)); // Robust parsing
                        const x = getX(i);

                        // Midnight Line
                        if (hour === 0 && i > 0) {
                            svg += `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${h - pad.bottom}" stroke="var(--border-color)" stroke-width="1" opacity="0.3" />`;
                        }

                        // Noon Label (Centered)
                        if (hour === 12) {
                            svg += `<text x="${x}" y="${h - 5}" fill="var(--text-secondary)" font-size="9" text-anchor="middle">${date.toLocaleDateString('en-US', { weekday: 'short' })}</text>`;
                        }
                    });

                    // Selected Hour Highlight
                    let selectedX = -1;
                    if (selectedForeHour) {
                        const idx = forecastData.findIndex(d => d.time === selectedForeHour);
                        if (idx !== -1) {
                            selectedX = getX(idx);
                            svg += `<line x1="${selectedX}" y1="${pad.top}" x2="${selectedX}" y2="${h - pad.bottom}" stroke="var(--accent-color)" stroke-width="2" opacity="0.8" />`;
                            // Highlight Dots
                            const d = forecastData[idx];
                            svg += `<circle cx="${selectedX}" cy="${getY(d.temp)}" r="4" fill="#f87171" stroke="white" stroke-width="2"/>`;
                            svg += `<circle cx="${selectedX}" cy="${getY(d.dew)}" r="4" fill="#60a5fa" stroke="white" stroke-width="2"/>`;
                        }
                    }

                    // Paths
                    svg += `<path d="${pathDew}" fill="none" stroke="#60a5fa" stroke-width="2" />`;
                    svg += `<path d="${pathTemp}" fill="none" stroke="#f87171" stroke-width="2" />`;

                    // Interaction Layer (Transparent)
                    // We attach mouse events to the parent div or this rect
                    // Easier to use inline events on rect for quick implementation
                    svg += `<rect x="${pad.left}" y="${pad.top}" width="${chartW}" height="${chartH}" fill="white" fill-opacity="0" 
                            onmousemove="window.handleChartHover(event, ${w}, ${chartW}, ${pad.left}, ${chartData.length})" 
                            onclick="window.handleChartClick(event, ${w}, ${chartW}, ${pad.left}, ${chartData.length})"
                            onmouseleave="window.hideForeTooltip()" />`;

                    svg += `</svg>`;
                    cont.innerHTML = svg;
                };

                // Chart Interaction Handlers
                // --- VDOT Details Logic ---
                window.toggleVDOTDetails = function () {
                    const el = document.getElementById('vdot-details');
                    if (!el) return;

                    if (el.style.display === 'none') {
                        el.style.display = 'block';
                        renderVDOTDetails();
                    } else {
                        el.style.display = 'none';
                    }
                };

                function renderVDOTDetails() {
                    const cont = document.getElementById('vdot-details');
                    if (!cont) return;
                    const dInput = parseFloat(els.distance.value);
                    const tInput = parseTime(els.time.value);

                    if (!dInput || !tInput || dInput <= 0) {
                        cont.innerHTML = '<div style="color:var(--text-secondary); font-size:0.8rem;">Enter a valid Time Trial to see details.</div>';
                        return;
                    }

                    // Distances to Project
                    const dists = [
                        { l: '50 km', d: 50000 },
                        { l: 'Marathon', d: 42195 },
                        { l: '30 km', d: 30000 },
                        { l: 'Half Marathon', d: 21097 },
                        { l: '15 km', d: 15000 },
                        { l: '12 km', d: 12000 },
                        { l: '10 km', d: 10000 },
                        { l: '8 km', d: 8000 },
                        { l: '6 km', d: 6000 },
                        { l: '5 km', d: 5000 },
                        { l: '3 Miles', d: 4828 },
                        { l: '2 Miles', d: 3218 },
                        { l: '3200m', d: 3200 },
                        { l: '3000m', d: 3000 },
                        { l: '1 Mile', d: 1609 },
                        { l: '1600m', d: 1600 },
                        { l: '1500m', d: 1500 },
                        { l: '1000m', d: 1000 },
                        { l: '800m', d: 800 }
                    ];

                    let html = `
                        <table class="vdot-details-table">
                            <thead>
                                <tr>
                                    <th>Distance</th>
                                    <th style="text-align:right;">Time</th>
                                    <th style="text-align:right;">Pace</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    // Calc Current VDOT
                    const currentVDOT = VDOT_MATH.calculateVDOT(dInput, tInput);

                    dists.forEach((item, i) => {
                        // VDOT Projection
                        const t2 = VDOT_MATH.solveTime(currentVDOT, item.d);
                        const pace = t2 / (item.d / 1000);

                        // Format Time logic (> 1h)
                        let tStr = formatTime(t2);
                        let tPretty = tStr;
                        if (t2 >= 3600) {
                            const h = Math.floor(t2 / 3600);
                            const m = Math.floor((t2 % 3600) / 60);
                            const s = Math.floor(t2 % 60);
                            tPretty = `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
                        }

                        html += `
                            <tr>
                                <td>${item.l}</td>
                                <td style="text-align:right;"><span class="time-val">${tPretty}</span></td>
                                <td style="text-align:right;"><span class="pace-val">${formatTime(pace)}/km</span></td>
                            </tr>
                        `;
                    });
                    html += '</tbody></table>';
                    cont.innerHTML = html;
                }

                window.handleChartHover = function (e, totalW, chartW, padLeft, dataLen) {
                    const rect = e.target.getBoundingClientRect();
                    // Adjust mouseX to be relative to the chart area (padLeft offset)
                    // The SVG rect element starts at pad.left, so e.clientX on it is relative to viewport.
                    const rectBounds = e.target.getBoundingClientRect();
                    const x = e.clientX - rectBounds.left;
                    const ratio = x / rectBounds.width;
                    const len = dataLen || forecastData.length;
                    let idx = Math.round(ratio * (len - 1));
                    idx = Math.max(0, Math.min(idx, len - 1)); // Clamp to bounds

                    if (idx >= 0 && idx < forecastData.length) {
                        const d = forecastData[idx];

                        // Calculate Impact for consistency
                        const mode = window.currentPaceMode || 'HMP';

                        // Calculate Impact for consistency
                        let baseSec = getBasePaceSec();

                        const adjPace = hapCalc.calculatePaceInHeat(baseSec, d.temp, d.dew);
                        const pct = ((adjPace - baseSec) / baseSec) * 100;
                        const color = getImpactColor(pct);

                        const date = new Date(d.time);
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                        // Add combined day/month
                        const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
                        const hourStr = d.time.substring(11, 13); // Force string usage

                        // Exact same HTML template as handleCellHover
                        const html = `
                            <div class="tooltip-header">${dayName} ${dateStr} ${hourStr}:00</div>
                            <div class="tooltip-row"><span class="tooltip-label">Temp:</span> <span class="tooltip-val" style="color:#fff">${d.temp != null ? d.temp.toFixed(1) : '--'}°</span></div>
                            <div class="tooltip-row"><span class="tooltip-label">Dew:</span> <span class="tooltip-val" style="color:#60a5fa">${d.dew != null ? d.dew.toFixed(1) : '--'}°</span></div>
                            <div class="tooltip-row" style="margin-top:4px; padding-top:4px; border-top:1px solid #374151">
                                <span class="tooltip-label">Impact:</span> <span class="tooltip-val" style="color:${color}">${pct.toFixed(2)}%</span>
                            </div>
                        `;
                        window.showForeTooltip(e, html);
                    }
                };

                window.handleChartClick = function (e, totalW, chartW, padLeft, dataLen) {
                    const rect = e.target.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const ratio = mouseX / chartW;
                    const len = dataLen || forecastData.length;
                    const idx = Math.round(ratio * (len - 1));

                    if (idx >= 0 && idx < forecastData.length) {
                        const d = forecastData[idx];
                        window.toggleForeSelection(d.time, e);
                    }
                };

                // Add Resize Listener with Debounce
                let resizeTimer;
                window.addEventListener('resize', () => {
                    clearTimeout(resizeTimer);
                    resizeTimer = setTimeout(() => {
                        if (window.renderForecastChart) window.renderForecastChart();
                    }, 200);
                });

                // Initialize
                loadState();
                update();
                // window.fetchWeather = fetchWeather; // expose not needed in production if auto-run
                fetchWeather();
                if (window.update) window.update();
            } catch (err) {
                console.error("Main Script Error:", err);
            }
        })();

        /* --- INJECTED CLIMATE LOGIC --- */
        (function () {
            // Dark Mode Helper
            let isDark = document.documentElement.classList.contains('dark');
            window.toggleDarkMode = function () {
                document.documentElement.classList.toggle('dark');
                isDark = document.documentElement.classList.contains('dark');
                renderClimateHeatmap();
                renderClimateTable();
            };

            // Init Dark Mode
            // Check if body background color suggests dark mode
            const computedBg = getComputedStyle(document.body).backgroundColor;
            if (computedBg === 'rgb(13, 17, 23)' || computedBg === '#0d1117') {
                isDark = true;
                document.documentElement.classList.add('dark');
            }

            let climateTooltipEl = document.getElementById('custom-tooltip');

            function getDateFromWeek(w) {
                // Simple approximation: Week 1 = Jan 1. 
                // 2025 starts on a Wednesday, but for visual approximation we just want rough Date.
                // Better: d = 1 + (w-1)*7
                const date = new Date(2025, 0, 1 + (w - 1) * 7);
                return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
            }

            window.showClimateTooltip = function (e, w, h, impact, temp, dew, count) {
                // Reuse the same tooltip element as Forecast for consistency
                let el = document.getElementById('forecast-tooltip');
                if (!el) {
                    el = document.createElement('div');
                    el.id = 'forecast-tooltip';
                    el.className = 'forecast-tooltip';
                    el.style.position = 'fixed';
                    el.style.zIndex = '10000';
                    document.body.appendChild(el);
                }

                // Match impact color logic
                let impactColor = "#4ade80";
                if (impact >= 6.0) impactColor = "#c084fc";
                else if (impact >= 3.5) impactColor = "#f87171";
                else if (impact >= 2.0) impactColor = "#fb923c";
                else if (impact >= 0.5) impactColor = "#facc15";

                const dateStr = `${getDateFromWeek(w)}`;
                const timeStr = `${String(h).padStart(2, '0')}:00`;

                // Exact HTML template as handleCellHover
                const html = `
                    <div class="tooltip-header">Week ${w} (${dateStr}) ${timeStr}</div>
                    <div class="tooltip-row"><span class="tooltip-label">Temp:</span> <span class="tooltip-val" style="color:#fff">${temp.toFixed(1)}°</span></div>
                    <div class="tooltip-row"><span class="tooltip-label">Dew:</span> <span class="tooltip-val" style="color:#60a5fa">${dew.toFixed(1)}°</span></div>
                    <div class="tooltip-row" style="margin-top:4px; padding-top:4px; border-top:1px solid #374151">
                        <span class="tooltip-label">Impact:</span> <span class="tooltip-val" style="color:${impactColor}">${impact.toFixed(2)}%</span>
                    </div>
                `;

                el.innerHTML = html;
                el.style.display = 'block';
                el.style.opacity = '1';

                // Initial Position (Reusing logic from showForeTooltip/moveForeTooltip is best, but inline here works)
                window.moveClimateTooltip(e);
            }

            window.moveClimateTooltip = function (e) {
                const el = document.getElementById('forecast-tooltip');
                if (!el) return;

                const w = el.offsetWidth;
                let x = e.clientX + 15;
                if (x + w > window.innerWidth - 10) {
                    x = e.clientX - w - 15;
                }
                const y = e.clientY - el.offsetHeight - 10;
                el.style.left = x + 'px';
                el.style.top = y + 'px';
            }

            window.hideClimateTooltip = function () {
                const el = document.getElementById('forecast-tooltip');
                if (el) el.style.opacity = '0';
            }

            function getISOWeek(date) {
                const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                const dayNum = d.getUTCDay() || 7;
                d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
            }

            // --- CLIMATE TABLE LOGIC ---
            let climateSortCol = 'impact';
            let climateSortDir = 'desc';

            let climateImpactFilter = null; // 0-4

            function getImpactCategory(val) {
                if (val < 0.5) return 0;
                else if (val < 2.0) return 1;
                else if (val < 3.5) return 2;
                else if (val < 6.0) return 3;
                else return 4;
            }

            window.filterClimateByImpact = function (idx, el) {
                if (climateImpactFilter === idx) {
                    climateImpactFilter = null;
                    // Clear dimming
                    el.parentElement.querySelectorAll('.legend-item').forEach(e => e.classList.remove('opacity-20'));
                } else {
                    climateImpactFilter = idx;
                    // Set dimming
                    el.parentElement.querySelectorAll('.legend-item').forEach(e => e.classList.add('opacity-20'));
                    el.classList.remove('opacity-20');
                }
                renderClimateHeatmap(); // To dim cells
                renderClimateTable();   // To filter rows
            }

            window.renderClimateTable = function () {
                const tb = document.getElementById('climateTableBody');
                if (!tb) return;

                let data = (window.climateData || []).slice();

                // Filter
                if (window.selectedClimateKey) {
                    const [selW, selH] = window.selectedClimateKey.split('-').map(Number);
                    data = data.filter(d => d.week === selW && d.hour === selH);

                    // Show Filter Label
                    document.getElementById('climate-filter-label').classList.remove('hidden');
                    document.getElementById('climate-filter-label').innerText = `Week ${selW}, ${selH}:00`;
                    document.getElementById('climate-clear-filter').classList.remove('hidden');
                } else {
                    document.getElementById('climate-filter-label').classList.add('hidden');
                    document.getElementById('climate-clear-filter').classList.add('hidden');
                }

                // Sort
                const dir = climateSortDir === 'asc' ? 1 : -1;

                // Reset Icons
                document.querySelectorAll('[id^="sort-icon-climate-"]').forEach(el => el.innerText = '');
                const icon = dir === 1 ? '▲' : '▼';
                const iconEl = document.getElementById('sort-icon-climate-' + climateSortCol);
                if (iconEl) iconEl.innerText = ' ' + icon;

                data.sort((a, b) => {
                    let valA, valB;
                    if (climateSortCol === 'date') { valA = a.week; valB = b.week; } // Week proxy
                    else if (climateSortCol === 'hour') { valA = a.hour; valB = b.hour; }
                    else if (climateSortCol === 'temp') { valA = a.mean_temp; valB = b.mean_temp; }
                    else if (climateSortCol === 'dew') { valA = a.mean_dew; valB = b.mean_dew; }
                    else if (climateSortCol === 'wind') { valA = a.mean_wind; valB = b.mean_wind; }
                    else if (climateSortCol === 'precip') { valA = a.mean_precip; valB = b.mean_precip; }
                    else if (climateSortCol === 'impact') { valA = a.mean_impact; valB = b.mean_impact; }

                    if (valA < valB) return -1 * dir;
                    if (valA > valB) return 1 * dir;
                    return 0;
                });

                tb.innerHTML = data.map(d => {
                    const dateStr = getDateFromWeek(d.week);
                    // Match Forecast Table Logic
                    const timeStr = `${String(d.hour).padStart(2, '0')}:00`;

                    let impactColor = "#4ade80";
                    if (d.mean_impact >= 6.0) impactColor = "#c084fc";
                    else if (d.mean_impact >= 3.5) impactColor = "#f87171";
                    else if (d.mean_impact >= 2.0) impactColor = "#fb923c";
                    else if (d.mean_impact >= 0.5) impactColor = "#facc15";

                    if (climateImpactFilter !== null) {
                        const catIdx = getImpactCategory(d.mean_impact);
                        if (catIdx !== climateImpactFilter) return '';
                    }

                    // Rain/Wind logic similar to Forecast
                    const rainColor = d.mean_precip > 0 ? '#60a5fa' : 'inherit';

                    // Exact structure as Forecast Table Row
                    return `
            <tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <td style="padding:10px; color:var(--text-secondary); white-space:nowrap;">
                    <div style="font-size:0.75em;">${dateStr}</div>
                    <div style="font-size:1em; color:var(--text-primary); font-weight:500;">${timeStr}</div>
                </td>
                <td style="text-align:center; font-weight:bold; color:var(--text-primary)">${d.mean_temp.toFixed(1)}°</td>
                <td style="text-align:center; color:${window.getDewColor(d.mean_dew)}">${d.mean_dew.toFixed(1)}°</td>
                <td style="text-align:center; color:${rainColor}">${d.mean_precip > 0 ? d.mean_precip.toFixed(2) + 'mm' : '-'}</td>
                <td style="text-align:center;">${d.mean_wind.toFixed(1)} <span style="font-size:0.7em;color:var(--text-secondary)">km/h</span></td>
                <td style="text-align:center;">
                    <span class="impact-badge" style="background:${impactColor}; color:#000; font-weight:600;">
                        ${d.mean_impact.toFixed(2)}%
                    </span>
                </td>
            </tr>`;
                }).join('');
            }

            window.renderClimateLegend = function () {
                const container = document.getElementById('climate-legend-container');
                if (!container) return;

                const levels = [
                    { label: 'Ideal', sub: '<0.5%', color: '#4ade80' },
                    { label: 'Light', sub: '<2.0%', color: '#facc15' },
                    { label: 'Medium', sub: '<3.5%', color: '#fb923c' },
                    { label: 'High', sub: '<6.0%', color: '#f87171' },
                    { label: 'Severe', sub: '>6.0%', color: '#c084fc' }
                ];

                let html = '';
                // Use flex wrap to list items horizontally/wrapping like Forecast if space allows
                // Forecast uses 'legend-item' class

                levels.forEach((l, i) => {
                    const catIdx = i; // 0..4
                    let opacity = '1';
                    if (climateImpactFilter !== null && climateImpactFilter !== catIdx) {
                        opacity = '0.4';
                    }

                    let border = '1px solid transparent';
                    let isActive = (climateImpactFilter === catIdx);
                    if (isActive) border = '2px solid #fff';

                    html += `
                        <div class="legend-item" onclick="window.filterClimateByImpact(${catIdx}, this)" style="cursor:pointer; opacity:${opacity}; transition:all 0.2s;">
                            <div class="legend-color" style="background-color:${l.color}; border:${border}; box-shadow: ${isActive ? '0 0 8px ' + l.color : 'none'};"></div>
                            <span>${l.label} <span style="font-size:0.75em; opacity:0.7">(${l.sub})</span></span>
                        </div>
                    `;
                });

                container.innerHTML = html;
            };

            window.sortClimate = function (col) {
                if (climateSortCol === col) {
                    climateSortDir = (climateSortDir === 'asc') ? 'desc' : 'asc';
                } else {
                    climateSortCol = col;
                    climateSortDir = 'desc'; // Default high impact/temp first
                    if (col === 'date' || col === 'hour') climateSortDir = 'asc';
                }
                renderClimateTable();
            }

            window.toggleClimateFilter = function (w, h, e) {
                if (e) e.stopPropagation(); // Essential to prevent document click from clearing selection immediately
                if (w === null) {
                    window.selectedClimateKey = null; // Clear
                } else {
                    const key = `${w}-${h}`;
                    if (window.selectedClimateKey === key) window.selectedClimateKey = null; // Toggle off
                    else window.selectedClimateKey = key;
                }
                renderClimateTable();
                renderClimateHeatmap(); // Update opacity
                renderClimateLegend(); // Update legend
            }




            window.renderClimateHeatmap = function () {
                const container = document.getElementById('climate-heatmap-container');
                if (!container) return;

                const rawData = window.climateData;
                if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
                    container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-secondary);">Loading data... (if persists, check console)</div>';
                    console.warn("Climate Data not found or empty:", rawData);
                    return;
                }

                // Optimization: Create a lookup map
                const dataMap = new Map();
                rawData.forEach(d => {
                    dataMap.set(`${d.week}-${d.hour}`, d);
                });

                // Remove grid CSS if it persists and force simple block
                container.style.display = 'block';
                container.style.gridTemplateColumns = 'none';

                // ensure table is updated (initially)
                renderClimateTable();
                renderClimateLegend(); // Update legend

                // Calculate Current Time for Highlight
                const now = new Date();
                const curH = now.getHours();
                const curW = getISOWeek(now);

                // Dimensions
                const cellW = 12; // Base unit
                const cellH = 12;
                const gap = 2;
                const labelW = 40; // Left margin for Hour Labels
                const headerH = 24; // Top margin for Month Labels (Increased for visibility)

                // 53 Weeks x 24 Hours
                const cols = 53;
                const rows = 24;

                const totalW = labelW + (cols * (cellW + gap));
                const totalH = headerH + (rows * (cellH + gap));

                let svgInner = '';

                // 1. Month Labels (Correct Logic)
                // Use local date calculation to get Month name (getDateFromWeek returns string, we need Date)
                let lastMonth = "";
                for (let w = 1; w <= cols; w++) {
                    const d = new Date(2025, 0, 1 + (w - 1) * 7);
                    const m = d.toLocaleString('en-US', { month: 'short' });

                    if (m !== lastMonth) {
                        const x = labelW + ((w - 1) * (cellW + gap));
                        // Adjust y to be nicely aligned within headerH (24px)
                        // headerH is top margin. y=headerH is grid start. Labels should be at y ~ 16-18
                        svgInner += `<text x="${x}" y="${headerH - 6}" font-size="9" fill="var(--text-secondary)">${m}</text>`;
                        lastMonth = m;
                    }
                }

                // 2. Hour Labels (Left) - Show ALL 24h
                for (let h = 0; h < 24; h++) {
                    const y = headerH + (h * (cellH + gap)) + (cellH / 2) + 3;
                    svgInner += `<text x="${labelW - 6}" y="${y}" text-anchor="end" font-size="9" fill="var(--text-secondary)">${h}</text>`;
                }

                // 3. Cells
                // Iterate Columns (Weeks) then Rows (Hours)
                for (let w = 1; w <= cols; w++) {
                    for (let h = 0; h < rows; h++) {
                        // Find data O(1)
                        const pt = dataMap.get(`${w}-${h}`);

                        const x = labelW + ((w - 1) * (cellW + gap));
                        const y = headerH + (h * (cellH + gap));

                        let color = 'transparent';
                        let opacity = '1';
                        let stroke = '';

                        // Dimming Logic (Filter by Selection)
                        if (window.selectedClimateKey) {
                            const [sw, sh] = window.selectedClimateKey.split('-').map(Number);
                            if (sw !== w || sh !== h) opacity = '0.1';
                        }

                        if (pt) {
                            const val = pt.mean_impact;
                            const catIdx = getImpactCategory(val);

                            // Dimming Logic (Filter by Impact Legend)
                            if (climateImpactFilter !== null && catIdx !== climateImpactFilter) {
                                opacity = '0.1';
                            }

                            if (val < 0.5) color = "#4ade80"; // Green
                            else if (val < 2.0) color = "#facc15"; // Yellow
                            else if (val < 3.5) color = "#fb923c"; // Orange
                            else if (val < 6.0) color = "#f87171"; // Red
                            else color = "#c084fc"; // Purple

                            if (isDark && val < 0.5) color = "#22c55e"; // Dark adjustment (green)

                            // Highlight Current Time
                            if (w === curW && h === curH) {
                                stroke = 'stroke="#3b82f6" stroke-width="2" paint-order="stroke"';
                            } else if (window.selectedClimateKey === `${w}-${h}`) {
                                stroke = 'stroke="#fff" stroke-width="2" paint-order="stroke"';
                            }

                            svgInner += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="1"
                        fill="${color}" fill-opacity="${opacity}" ${stroke}
                        style="cursor:pointer; transition: fill-opacity 0.2s;"
                        onclick="window.toggleClimateFilter(${w}, ${h}, event)"
                        onmouseenter="window.showClimateTooltip(event, ${w}, ${h}, ${val}, ${pt.mean_temp}, ${pt.mean_dew}, ${pt.count})"
                        onmousemove="window.moveClimateTooltip(event)"
                        onmouseleave="window.hideClimateTooltip()"
                    />`;
                        } else {
                            // Empty/Missing placeholder (optional, or just skip)
                            svgInner += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="1"
                        fill="var(--card-bg)" fill-opacity="0.3" 
                     />`;
                        }
                    }
                }

                container.innerHTML = `<svg viewBox="0 0 ${totalW} ${totalH}" preserveAspectRatio="xMidYMid meet" style="width:100%; height:auto; display:block;">${svgInner}</svg>`;
            }


            // Auto-Run initial render if tab is active (unlikely on load but good practice)
            // setTimeout(renderClimateHeatmap, 500);
        })();
        // --- Configuration ---
        const DEFAULT_LOC = {
            lat: -27.5969,
            lon: -48.5495,
            name: "Florianópolis",
            country: "Brasil",
            isDefault: true
        };

        // --- IndexedDB ---
        const DB_NAME = 'RunWeatherDB';
        const DB_VERSION = 2;
        const STORE_CLIMATE = 'city_climate';

        function openDB() {
            return new Promise((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onerror = () => reject("DB Error");
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (db.objectStoreNames.contains(STORE_CLIMATE)) {
                        db.deleteObjectStore(STORE_CLIMATE);
                    }
                    db.createObjectStore(STORE_CLIMATE, { keyPath: "key" });
                };
                req.onsuccess = (e) => resolve(e.target.result);
            });
        }

        async function getCachedClimate(lat, lon) {
            try {
                const db = await openDB();
                const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
                return new Promise((resolve) => {
                    const tx = db.transaction(STORE_CLIMATE, 'readonly');
                    const store = tx.objectStore(STORE_CLIMATE);
                    const req = store.get(key);
                    req.onsuccess = () => resolve(req.result ? req.result.data : null);
                    req.onerror = () => resolve(null);
                });
            } catch (e) { console.error(e); return null; }
        }

        async function cacheClimate(lat, lon, data) {
            try {
                const db = await openDB();
                const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
                const tx = db.transaction(STORE_CLIMATE, 'readwrite');
                tx.objectStore(STORE_CLIMATE).put({ key, data, timestamp: Date.now() });
            } catch (e) { console.error("Cache failed", e); }
        }

        // --- Location Manager ---
        class LocationManager {
            constructor() {
                this.current = this.loadState() || DEFAULT_LOC;
                this.recents = this.loadRecents() || [];
                window.currentLocation = this.current;
                this.updateUI();
            }

            loadState() {
                const s = localStorage.getItem('rw_location');
                return s ? JSON.parse(s) : null;
            }

            loadRecents() {
                const s = localStorage.getItem('rw_recents');
                try {
                    return s ? JSON.parse(s) : [];
                } catch (e) { return []; }
            }

            saveState() {
                localStorage.setItem('rw_location', JSON.stringify(this.current));
            }

            saveRecents() {
                localStorage.setItem('rw_recents', JSON.stringify(this.recents));
            }

            async setLocation(lat, lon, name, country) {
                this.current = { lat, lon, name, country, isDefault: false };
                // Check if back to default (approx)
                if (Math.abs(lat - DEFAULT_LOC.lat) < 0.05 && Math.abs(lon - DEFAULT_LOC.lon) < 0.05) {
                    this.current = { ...DEFAULT_LOC };
                }

                // Update Recents
                // Remove if exists (to move to top)
                this.recents = this.recents.filter(r =>
                    !(Math.abs(r.lat - lat) < 0.001 && Math.abs(r.lon - lon) < 0.001)
                );
                // Add to top
                this.recents.unshift(this.current);
                // Limit to 5
                if (this.recents.length > 5) this.recents = this.recents.slice(0, 5);
                this.saveRecents();

                // Redundant global for safety
                window.currentLocation = this.current;
                console.log("Location Set:", this.current);

                this.saveState();
                this.updateUI();
                window.closeLocationModal();

                // Trigger Reloads
                if (window.fetchWeather) window.fetchWeather(true);

                if (window.climateManager) {
                    await window.climateManager.loadDataForCurrentLocation();
                }
            }

            updateUI() {
                const els = document.querySelectorAll('.current-location-name');
                els.forEach(el => {
                    el.textContent = this.current.name;
                });
            }

            async searchCity(query) {
                if (!query || query.length < 3) return [];
                const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=pt&format=json`;
                try {
                    const res = await fetch(url);
                    const data = await res.json();
                    return data.results || [];
                } catch (e) { console.error(e); return []; }
            }
        }

        // --- Climate Manager ---
        class ClimateManager {
            constructor() {
                this.data = [];
            }

            async loadDataForCurrentLocation() {
                const loc = window.locManager.current;

                // 1. Use Default Static Data
                if (loc.isDefault && window.initialClimateData && window.initialClimateData.length > 0) {
                    console.log("Using Static Climate Data (Floripa)");
                    window.climateData = window.initialClimateData;
                    this.refreshUI();
                    return;
                }

                // 2. Check Cache
                const cached = await getCachedClimate(loc.lat, loc.lon);
                if (cached) {
                    console.log("Using Cached Climate Data");
                    window.climateData = cached;
                    this.refreshUI();
                    return;
                }

                // 3. Fetch & Process
                this.showLoading();
                try {
                    const raw = await this.fetchHistory(loc.lat, loc.lon);
                    const processed = this.processHistory(raw);

                    await cacheClimate(loc.lat, loc.lon, processed);
                    window.climateData = processed;
                    this.refreshUI();
                } catch (e) {
                    console.error("Climate Fetch Error", e);
                    // alert("Failed to load historical climate data.");
                    this.showError();
                }
            }

            async fetchHistory(lat, lon) {
                // Fetch last 5 full years (approx)
                // Open-Meteo Archive API allows getting long periods in one go
                const end = new Date();
                const start = new Date();
                start.setFullYear(end.getFullYear() - 6);

                const startStr = start.toISOString().split('T')[0];
                const endStr = new Date().toISOString().split('T')[0];

                const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startStr}&end_date=${endStr}&hourly=temperature_2m,dew_point_2m,precipitation,wind_speed_10m&timezone=auto`;

                console.log("Fetching History (5-6y)...");
                const res = await fetch(url);
                return await res.json();
            }

            processHistory(raw) {
                if (!raw || !raw.hourly) {
                    console.error("processHistory: No hourly data found!", raw);
                    return [];
                }
                const h = raw.hourly;
                const len = h.time.length;
                console.log(`processHistory: Processing ${len} hours of history.`);
                // Debug raw sample
                if (len > 0) {
                    console.log("Raw Sample [0]:", h.temperature_2m[0], h.dew_point_2m[0]);
                }

                const buckets = {}; // key: "w-h"

                for (let i = 0; i < len; i++) {
                    const t = new Date(h.time[i]);
                    const week = this.getWeekNumber(t);
                    const hour = t.getHours();
                    const key = `${week}-${hour}`;

                    if (!buckets[key]) buckets[key] = {
                        temps: [], dews: [], winds: [], precips: 0, count: 0
                    };

                    if (h.temperature_2m[i] !== null) buckets[key].temps.push(h.temperature_2m[i]);
                    if (h.dew_point_2m[i] !== null) buckets[key].dews.push(h.dew_point_2m[i]);
                    if (h.wind_speed_10m[i] !== null) buckets[key].winds.push(h.wind_speed_10m[i]);
                    if (h.precipitation[i] !== null) buckets[key].precips += h.precipitation[i];
                    buckets[key].count++;
                }

                const result = [];
                const paceNeutral = 240; // 4:00/km base
                let hasDebugged = false;

                for (const key in buckets) {
                    const b = buckets[key];
                    if (b.count === 0) continue;

                    const avgTemp = b.temps.reduce((a, c) => a + c, 0) / (b.temps.length || 1);
                    const avgDew = b.dews.reduce((a, c) => a + c, 0) / (b.dews.length || 1);
                    const avgWind = b.winds.reduce((a, c) => a + c, 0) / (b.winds.length || 1);

                    let impact = 0;
                    if (typeof hapCalc !== 'undefined') {
                        const adjPace = hapCalc.calculatePaceInHeat(paceNeutral, avgTemp, avgDew);
                        const pct = ((adjPace - paceNeutral) / paceNeutral) * 100;
                        impact = pct;
                    } else {
                        if (!hasDebugged) console.warn("processHistory: hapCalc is undefined!");
                    }

                    if (!hasDebugged && impact > 0) {
                        console.log(`Debug Impact: Temp=${avgTemp.toFixed(1)}, Dew=${avgDew.toFixed(1)} => Impact=${impact.toFixed(2)}%`);
                        hasDebugged = true;
                    }

                    const [w, hr] = key.split('-').map(Number);

                    // Precip: We want "mean precip per hour"? Or Sum?
                    // The static data likely has "mean_precip". For visualization.
                    // Let's use average per sample.
                    const meanPrecip = b.precips / (b.count || 1);

                    result.push({
                        week: w,
                        hour: hr,
                        mean_temp: Number(avgTemp.toFixed(1)),
                        mean_dew: Number(avgDew.toFixed(1)),
                        mean_wind: Number(avgWind.toFixed(1)),
                        mean_precip: Number(meanPrecip.toFixed(3)),
                        mean_impact: Number(impact.toFixed(2)),
                        count: b.count
                    });
                }
                return result;
            }

            getWeekNumber(d) {
                const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
                const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
                return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
            }

            refreshUI() {
                if (window.renderClimateHeatmap) window.renderClimateHeatmap();
                if (window.renderClimateTable) window.renderClimateTable();

                // Restore headers if needed
                const tbody = document.getElementById('climateTableBody');
                if (tbody && (!window.climateData || window.climateData.length === 0)) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No Data</td></tr>';
                }
            }

            showError() {
                const tbody = document.getElementById('climateTableBody');
                if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#f87171;">Failed to load climate data.</td></tr>';
            }

            showLoading() {
                const tbody = document.getElementById('climateTableBody');
                if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-secondary);">Fetching 5-6 years of history...<br><div class="loading-spinner-sm" style="display:inline-block; margin-top:10px;"></div></td></tr>';
            }
        }

        // --- Init ---
        window.addEventListener('load', () => {
            // Backup initial data
            if (window.climateData) {
                window.initialClimateData = [...window.climateData];
            } else {
                window.initialClimateData = []; // Should not happen if script loaded
            }

            window.locManager = new LocationManager();
            window.climateManager = new ClimateManager();

            // Check if we need to load different climate data
            if (!window.locManager.current.isDefault) {
                window.climateManager.loadDataForCurrentLocation();
            }

            // Events
            // Modal events are now global

            const searchInput = document.getElementById('loc-search');
            let debounce;
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const val = e.target.value;
                    if (val.length < 3) return;
                    clearTimeout(debounce);
                    debounce = setTimeout(async () => {
                        const list = document.getElementById('loc-results');
                        list.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-secondary);">Searching...</div>';

                        const res = await window.locManager.searchCity(val);
                        list.innerHTML = '';

                        if (res.length === 0) {
                            list.innerHTML = '<div style="padding:10px; text-align:center; color:var(--text-secondary);">No results found.</div>';
                            return;
                        }

                        res.forEach(item => {
                            const div = document.createElement('div');
                            div.className = 'loc-item';
                            const country = item.country || item.country_code || '';
                            const admin = item.admin1 ? `, ${item.admin1}` : '';
                            div.innerHTML = `<div>${item.name} <span class="loc-sub">${country}${admin}</span></div>`;
                            div.onclick = () => window.locManager.setLocation(item.latitude, item.longitude, item.name, country);
                            list.appendChild(div);
                        });
                    }, 400);
                });
            }

            window.fetchIPLocation = async function (originalError) {
                const btn = document.getElementById('gps-btn');
                const originalText = 'Use My Location'; // Hardcoded fallback for text
                if (btn) btn.innerHTML = 'Trying IP Location...';

                console.log("Attempting IP Fallback...");

                try {
                    const res = await fetch('https://ipwho.is/');
                    const data = await res.json();

                    if (data.success) {
                        console.log("IP Location Success:", data);
                        window.locManager.setLocation(data.latitude, data.longitude, data.city, data.country);
                        if (btn) btn.innerHTML = originalText;
                    } else {
                        throw new Error(data.message || "IP Location failed");
                    }
                } catch (e) {
                    console.error("IP Fallback failed", e);
                    alert(`GPS Failed (${originalError.message}) and IP Location failed. Please search manually.`);
                    if (btn) btn.innerHTML = originalText;
                }
            };

            window.useGPS = () => {
                if (!navigator.geolocation) {
                    window.fetchIPLocation({ message: "Geolocation not supported" });
                    return;
                }
                const btn = document.getElementById('gps-btn');
                const originalText = btn.innerHTML;
                btn.innerHTML = 'Locating... (Please Wait)';

                const options = {
                    enableHighAccuracy: true,
                    timeout: 8000, // Reduced to 8s to trigger fallback sooner
                    maximumAge: 0
                };

                navigator.geolocation.getCurrentPosition(async (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=pt&format=json`;
                    try {
                        const res = await fetch(url);
                        const data = await res.json();
                        const city = data.results && data.results[0] ? data.results[0] : { name: "My Location", country: "" };
                        window.locManager.setLocation(lat, lon, city.name, city.country);
                    } catch (e) {
                        window.locManager.setLocation(lat, lon, "My Location", "");
                    }
                    btn.innerHTML = originalText;
                }, (err) => {
                    console.warn("Native GPS Error:", err);
                    window.fetchIPLocation(err);
                }, options);
            };
        });



        console.log("Initializing Global Location UI...");

        window.openLocationModal = function () {
            console.log("Opening Location Modal...");
            var m = document.getElementById('loc-modal');
            if (m) {
                m.classList.add('open');

                // Render Recents if available and search is empty
                var list = document.getElementById('loc-results');
                var searchIn = document.getElementById('loc-search');

                if (list && searchIn) {
                    searchIn.value = ''; // Clear search
                    list.innerHTML = ''; // Clear list

                    if (window.locManager && window.locManager.recents && window.locManager.recents.length > 0) {
                        var header = document.createElement('div');
                        header.style.cssText = "font-size:0.75rem; color:var(--text-secondary); margin:10px 0 5px 0; text-transform:uppercase; letter-spacing:0.5px;";
                        header.textContent = "Recent Locations";
                        list.appendChild(header);

                        window.locManager.recents.forEach(function (item) {
                            var div = document.createElement('div');
                            div.className = 'loc-item';
                            var country = item.country || '';
                            div.innerHTML = `<div>${item.name} <span class="loc-sub">${country}</span></div>`;
                            div.onclick = function () { window.locManager.setLocation(item.lat, item.lon, item.name, country); };
                            list.appendChild(div);
                        });
                    }
                }

                setTimeout(function () {
                    var i = document.getElementById('loc-search');
                    if (i) i.focus();
                }, 100);
            } else {
                console.error("Location Modal not found in DOM");
            }
        };

        window.closeLocationModal = function (e) {
            var m = document.getElementById('loc-modal');
            if (!m) return;
            if (e && e.target !== m && e.target.id !== 'close-modal') return;
            m.classList.remove('open');
        };

        // Fallback: Attach listeners manually to ensure they work
        // Wait a slight tick to ensure DOM elements are ready if script runs too fast
        setTimeout(function () {
            var btns = document.querySelectorAll('.location-btn');
            console.log("Found location buttons: ", btns.length);
            btns.forEach(function (btn) {
                // Remove old onclick attribute to be clean
                btn.removeAttribute('onclick');
                btn.addEventListener('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Location Button Clicked (Event Listener)");
                    window.openLocationModal();
                });
            });
        }, 500);
