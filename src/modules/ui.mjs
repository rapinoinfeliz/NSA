// UI Module: DOM Manipulation and Rendering
import { formatTime, VDOT_MATH, getEasyPace } from './core.js';
import { saveToStorage, loadFromStorage } from './storage.js';

// --- State Variables (UI Scope) ---
export let forecastData = [];
export let selectedForeHour = null;
export let selectedClimateKey = null;
export let climateImpactFilter = null;
export let climateSortCol = 'impact';
export let climateSortDir = 'desc';

// State Setters
export function setForecastData(data) { forecastData = data; }
export function setSelectedForeHour(h) { selectedForeHour = h; }

// --- Color Helpers ---
export function getImpactColor(pct) {
    if (pct < 0.5) return "#4ade80"; // Green
    if (pct < 2.0) return "#facc15"; // Yellow
    if (pct < 3.5) return "#fb923c"; // Orange
    if (pct < 6.0) return "#f87171"; // Red
    return "#c084fc"; // Purple
}

export function getDewColor(d) {
    if (d < 15) return "var(--text-primary)"; // Comfortable
    if (d < 20) return "#facc15"; // Yellow (Sticky)
    if (d < 24) return "#fb923c"; // Orange (Uncomfortable)
    return "#f87171"; // Red (Oppressive)
}

export function getCondColor(type, val) {
    const cGood = '#4ade80';
    const cFair = '#facc15';
    const cWarn = '#fb923c';
    const cBad = '#f87171';
    const cPurple = '#c084fc';
    const cRef = {
        'air': [35, 32, 28, 10], // Purple> 35, Bad > 32, Warn > 28, Fair <10
        'hum': [101, 90, 75, -1],
        'wind': [100, 40, 25, 15],
        'uv': [12, 8, 6, 3],
        'aqi': [500, 150, 100, 50],
        'pm25': [500, 35, 12, -1],
        'prob': [101, 60, 30, -1]
    };
    // Re-impl simple checks from before to match exact logic
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
    // ... others mapped similarly.
    if (type === 'uv') { if (val >= 8) return cBad; if (val >= 6) return cWarn; if (val >= 3) return cFair; return cGood; }
    if (type === 'aqi') { if (val > 150) return cBad; if (val > 100) return cWarn; if (val > 50) return cFair; return cGood; }
    if (type === 'prob') { if (val >= 60) return cBad; if (val >= 30) return cWarn; return cGood; }
    if (type === 'pm25') { if (val > 35) return cBad; if (val > 12) return cWarn; return cGood; }
    return "var(--text-primary)";
}

// --- Helper: Info Tooltip (Exporting a setup function to attach to window) ---
export function setupWindowHelpers() {
    window.getCondColor = getCondColor;
    window.getDewColor = getDewColor;
    window.getImpactColor = getImpactColor;

    window.showInfoTooltip = function (e, title, text) {
        e.stopPropagation();
        let el = document.getElementById('forecast-tooltip');
        if (!el) {
            el = document.createElement('div');
            el.id = 'forecast-tooltip';
            el.className = 'forecast-tooltip';
            document.body.appendChild(el);
        }
        el.innerHTML = '<div style="font-weight:600; margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:4px;">' + (title) + '</div><div style="font-size:0.85em; opacity:0.9; line-height:1.4;">' + (text) + '</div>';
        el.style.display = 'block';
        el.style.opacity = '1';
        el.style.maxWidth = '200px';

        const tooltipWidth = 200;
        let left = e.clientX + 10;
        if (left + tooltipWidth > window.innerWidth) {
            left = e.clientX - tooltipWidth - 10;
        }
        const top = e.clientY + 10;
        el.style.left = left + 'px';
        el.style.top = top + 'px';
    };

    // Attaching UI handlers that are called from HTML onclick attributes
    window.toggleForeSelection = (t, e) => {
        if (e) e.stopPropagation();
        selectedForeHour = (selectedForeHour === t) ? null : t;
        renderAllForecasts();
    };

    window.hideForeTooltip = () => {
        const el = document.getElementById('forecast-tooltip');
        if (el) { el.style.opacity = '0'; el.style.display = 'none'; }
    };

    window.handleChartHover = (e, totalW, chartW, padLeft, dataLen) => {
        handleChartHover(e, totalW, chartW, padLeft, dataLen);
    };
    window.handleChartClick = (e, totalW, chartW, padLeft, dataLen) => {
        handleChartClick(e, totalW, chartW, padLeft, dataLen);
    };
    window.toggleVDOTDetails = toggleVDOTDetails;
    window.filterClimateByImpact = filterClimateByImpact;
    window.sortClimate = sortClimate;
    window.toggleClimateFilter = toggleClimateFilter;
    window.showClimateTooltip = showClimateTooltip;
    window.moveClimateTooltip = moveClimateTooltip;
    window.hideClimateTooltip = hideClimateTooltip;
}
'''\n\n\n// --- Extracted Functions ---\nexport function renderCurrentTab(w, a, prob2h = 0, precip2h = 0, daily){\n                    const container = document.getElementById(\'current-content\');\n                    if (!container) return;\n\n                    // Metrics\n                    const safeVal = (v, dec = 1) => (v != null && !isNaN(v)) ? v.toFixed(dec) : \'--\';\n                    const rh = w.relative_humidity_2m;\n                    const feels = w.apparent_temperature;\n                    const wind = w.wind_speed_10m;\n                    const windGust = w.wind_gusts_10m || 0;\n                    const dir = w.wind_direction_10m; // degrees\n                    const rain = w.rain; // mm\n                    const precip = w.precipitation || 0;\n                    const uv = w.uv_index;\n                    const aqi = a ? a.us_aqi : \'--\';\n                    const pm25 = a ? a.pm2_5 : \'--\';\n\n                    // Convert Dir to Cardinal\n                    const getCardinal = (angle) => {\n                        const directions = [\'N\', \'NE\', \'E\', \'SE\', \'S\', \'SW\', \'W\', \'NW\'];\n                        return directions[Math.round(angle / 45) % 8];\n                    };\n                    const windDirStr = getCardinal(dir);\n\n                    // --- WBGT Calculation (ACSM / BOM Estimation) ---\n                    const calculateWBGT = (temp, rh, wind, solar) => {\n                        // 1. Estimate Wet Bulb (Tw) using Stull (2011)\n                        // T = Temp (C), RH = %\n                        const T = temp;\n                        const RH = rh;\n                        const Tw = T * Math.atan(0.151977 * Math.pow(RH + 8.313659, 0.5)) +\n                            Math.atan(T + RH) - Math.atan(RH - 1.676331) +\n                            0.00391838 * Math.pow(RH, 1.5) * Math.atan(0.023101 * RH) - 4.686035;\n\n                        // 2. Estimate Black Globe Temp (Tg)\n                        // Uses a simplified approximation for outdoor runners: Tg ~= T + (0.0144 * SolarRad) + WindCorrection\n                        // Improved model: Tg = T + (0.007 * SolarRad) * (1 - 0.05 * WindSpeed) - rough approx to account for wind cooling\n                        // A more standard simple approx: Tg = T + (SolarRad / (4 * (Wind + 2.0))) * 0.5 (Just heuristic)\n\n                        // We will use the Dimiceli / ABM approximation logic simplified:\n                        // Tg grows with Radiation and shrinks with Wind.\n                        // Standard assumption for low wind full sun: Tg is ~10-15C higher than T.\n                        // f(wind) = exp(-0.3 * wind) (Wind in m/s)\n                        const windMs = wind / 3.6;\n                        const windFactor = Math.exp(-0.25 * windMs); // Wind cooling effect on the globe\n                        const Tg = T + (0.019 * solar * windFactor); // Solar heating factor adjusted for wind\n\n                        // 3. Calculate Outdoor WBGT\n                        // WBGT = 0.7 * Tw + 0.2 * Tg + 0.1 * T\n                        const wbgt = (0.7 * Tw) + (0.2 * Tg) + (0.1 * T);\n                        return wbgt;\n                    };\n\n                    const wbgtVal = (w.shortwave_radiation != null) ? calculateWBGT(w.temperature_2m, w.relative_humidity_2m, w.wind_speed_10m, w.shortwave_radiation) : null;\n\n                    // --- New Metrics Calc ---\n                    const pressure = w.pressure_msl || 1013;\n\n                    // Run Score\n                    let runScore = 100;\n                    if (window.hapCalc) {\n                        const res = hapCalc.calculatePaceInHeat(300, w.temperature_2m, w.dew_point_2m);\n                        runScore = Math.max(0, Math.round(100 - (res.percentImpact * 12)));\n                    }\n                    const getScoreColor = (s) => s >= 90 ? \'#4ade80\' : s >= 75 ? \'#a3e635\' : s >= 60 ? \'#facc15\' : s >= 40 ? \'#fb923c\' : \'#f87171\';\n\n                    // Sweat Rate (Heuristic)\n                    const srBase = wbgtVal !== null ? wbgtVal : feels;\n                    let sweatRate = 1.0 + (srBase - 20) * 0.05;\n                    if (sweatRate <0.4) sweatRate = 0.4;\n\n                    // WBGT Color & Risk\n                    const getWBGTColor = (val) => {\n                        if (val <18) return \'#4ade80\'; // Green (Low)\n                        if (val <21) return \'#facc15\'; // Yellow (Moderate)\n                        if (val <25) return \'#fb923c\'; // Orange (High)\n                        if (val <28) return \'#f87171\'; // Red (Very High)\n                        return \'#c084fc\'; // Purple (Extreme)\n                    };\n                    const getWBGTText = (val) => {\n                        if (val <18) return \'Low Risk\';\n                        if (val <21) return \'Mod. Risk\'; // Adjusted for runner sensitivity\n                        if (val <25) return \'High Risk\';\n                        if (val <28) return \'Very High\';\n                        if (val <30) return \'Extreme\';\n                        return \'CANCEL\';\n                    };\n\n\n\n\n                    // Styles\n                    const sectionStyle="background:var(--card-bg); padding:16px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px;";\n                    const headStyle="font-size:0.9rem; font-weight:600; color:var(--text-primary); margin-bottom:12px; display:flex; align-items:center; gap:6px;";\n                    const gridStyle="display:grid; grid-template-columns: 1fr 1fr; gap:12px; row-gap:16px; align-items: stretch;";\n                    const itemStyle="display:flex; flex-direction:column; justify-content:space-between; height:100%;";\n                    const labelStyle="font-size:0.75rem; color:var(--text-secondary); margin-bottom:4px;";\n                    const valStyle="font-size:1.1rem; font-weight:500; color:var(--text-primary); margin-top:auto;";\n\n                    let html = \'\';\n\n                    // Helper for info icon\n                    const infoIcon = (title, text) => {\n                        const tSafe = title.replace(/\'/g, "\\\'"); \n                        const txtSafe = text.replace(/\'/g, "\\\'");\n                        return \'<span onclick="window.showInfoTooltip(event, \\'\' + tSafe + \'\\', \\'\' + txtSafe + \'\\')" style="cursor:pointer; opacity:0.5; margin-left:4px; display:inline-flex; vertical-align:middle;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>\';\n                    };\n\n                    // --- Global Tab Handler (Restored) ---\n                    window.openTab = function(tabName, btn) {\n                        // Hide all\n                        document.querySelectorAll(\'.tab-content\').forEach(el => el.style.display = \'none\');\n                        // Show target\n                        const target = document.getElementById(\'tab-\' + tabName);\n                        if(target) target.style.display = \'block\';\n                        \n                        // Active State\n                        document.querySelectorAll(\'.tab-btn\').forEach(el => el.classList.remove(\'active\'));\n                        if(btn) btn.classList.add(\'active\');\n\n                        // Specific redraws\n                        if(tabName === \'forecast16\') window.renderAllForecasts();\n                    };\n\n                    // 1. Temperature Section (WBGT Integrated)\nhtml += "<div>Placeholder</div>";\n// 5. Sun Cycle\nif (daily) {\n    const fmtTime = (iso) => iso ? iso.substring(11, 16) : \'--:--\';\n\n    // Helper: Add minutes to HH:MM string directly\n    const shiftTime = (timeStr, deltaMin) => {\n        if (!timeStr || timeStr === \'--:--\') return \'--:--\';\n        const parts = timeStr.split(\':\');\n        let h = parseInt(parts[0], 10);\n        let m = parseInt(parts[1], 10);\n\n        let total = h * 60 + m + deltaMin;\n        if (total < 0) total += 1440; // wrap around day\n        if (total >= 1440) total -= 1440;\n\n        const newH = Math.floor(total / 60);\n        const newM = total % 60;\n        return String(newH).padStart(2, \'0\') + \':\' + String(newM).padStart(2, \'0\');\n    };\n\n    // 5. Sun Cycle (Solar Horizon Graph)\n    {\n        // Parse times to minutes\n        const toMin = (str) => {\n            if (!str) return 0;\n            const p = str.split(\':\').map(Number);\n            return p[0] * 60 + p[1];\n        };\n\n        // Restore definitions\n        const sunrise = fmtTime(daily.sunrise ? daily.sunrise[0] : null);\n        const sunset = fmtTime(daily.sunset ? daily.sunset[0] : null);\n        const dawn = shiftTime(sunrise, -25);\n        const dusk = shiftTime(sunset, 25);\n\n        const dawnMin = toMin(dawn);\n        const sunriseMin = toMin(sunrise);\n        const sunsetMin = toMin(sunset);\n        const duskMin = toMin(dusk);\n\n        // Current time in minutes\n        const nowD = new Date();\n        const nowMin = nowD.getHours() * 60 + nowD.getMinutes();\n\n        // New Stats\n        const totalDayMin = sunsetMin - sunriseMin;\n\n        // Remaining daylight (sunset - now)\n        const remainingMin = Math.max(0, sunsetMin - nowMin);\n        const remHours = Math.floor(remainingMin / 60);\n        const remM = remainingMin % 60;\n        const daylightStr = remainingMin > 0 ? remHours + \'h \' + remM + \'m left\' : \'Night\';\n\n        const solarNoonMin = sunriseMin + (totalDayMin / 2);\n        const noonH = Math.floor(solarNoonMin / 60);\n        const noonM = Math.floor(solarNoonMin % 60);\n        const solarNoonStr = '${ String(noonH).padStart(2, '0') }:${ String(noonM).padStart(2, '0') } ';\n\n        // Graph Scales (ViewBox 300 x 60)\n        const scaleX = (m) => (m / 1440) * 300;\n        const yHorizon = 50;\n\n        const xSunrise = scaleX(sunriseMin);\n        const xSunset = scaleX(sunsetMin);\n        const xNoon = scaleX(solarNoonMin);\n        const xNow = scaleX(nowMin);\n\n        html += '< div class="solar-card" style = "${sectionStyle}" >
                            <div style="${headStyle}">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                                Solar Cycle
                                <span style="margin-left:auto; font-size:0.75em; font-weight:normal; color:var(--text-secondary);">${daylightStr}</span>
                            </div>
                            
                            <!--Minimalist Arc Graph-- >
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
                            
                            <!--Sunrise / Sunset Times-- >
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
                        </div > ';\n    }\n\n\n}\n\n// 6. Live Map Module (Windy)\n\ncontainer.innerHTML = html;\n                }\n\nexport function renderForecastChart(containerId, dayLimit) {\n    const cont = document.getElementById(containerId || \'forecast-chart-container\');\n    if (!cont || !forecastData || forecastData.length === 0) return;\n\n    // Data Slicing\n    let chartData = forecastData;\n    if (dayLimit) {\n        chartData = forecastData.slice(0, 24 * dayLimit);\n    }\n\n    // Dimensions (Responsive)\n    // Use clientWidth but wait for layout if possible?\n    const w = cont.clientWidth;\n    const h = 180; // Fixed height\n    if (w === 0) return; // Not visible yet\n\n    const pad = { top: 20, right: 10, bottom: 20, left: 30 };\n    const chartW = w - pad.left - pad.right;\n    const chartH = h - pad.top - pad.bottom;\n\n    // Scales\n    const temps = chartData.map(d => d.temp);\n    const dews = chartData.map(d => d.dew);\n    const allVals = [...temps, ...dews];\n    let minVal = Math.min(...allVals);\n    let maxVal = Math.max(...allVals);\n    minVal = Math.floor(minVal - 2);\n    maxVal = Math.ceil(maxVal + 2);\n    const valRange = maxVal - minVal;\n\n    const getX = (i) => pad.left + (i / (chartData.length - 1)) * chartW;\n    const getY = (val) => pad.top + chartH - ((val - minVal) / valRange) * chartH;\n\n    // Paths\n    // Paths (Handle Gaps for Null Data)\n    let pathTemp = \'\';\n    let pathDew = \'\';\n    let hasStartedTemp = false;\n    let hasStartedDew = false;\n\n    chartData.forEach((d, i) => {\n        const x = getX(i);\n\n        // Temp Path\n        if (d.temp != null) {\n            const yT = getY(d.temp);\n            const cmd = hasStartedTemp ? \'L\' : \'M\';\n            pathTemp += '${ cmd } ${ x.toFixed(1) } ${ yT.toFixed(1) } ';\n            hasStartedTemp = true;\n        } else {\n            hasStartedTemp = false; // Break the line\n        }\n\n        // Dew Path\n        if (d.dew != null) {\n            const yD = getY(d.dew);\n            const cmd = hasStartedDew ? \'L\' : \'M\';\n            pathDew += '${ cmd } ${ x.toFixed(1) } ${ yD.toFixed(1) } ';\n            hasStartedDew = true;\n        } else {\n            hasStartedDew = false; // Break the line\n        }\n    });\n\n    // Build SVG\n    let svg = '< svg width = "${w}" height = "${h}" xmlns = "http://www.w3.org/2000/svg" style = "cursor:crosshair;" > ';\n\n    // Grid & Labels\n    const steps = 5;\n    for (let i = 0; i <= steps; i++) {\n        const val = minVal + (valRange * (i / steps));\n        const y = getY(val);\n        svg += '< line x1 = "${pad.left}" y1 = "${y}" x2 = "${w - pad.right}" y2 = "${y}" stroke = "var(--border-color)" stroke - width="1" stroke - dasharray="4 4" opacity = "0.3" style = "pointer-events:none;" /> ';\n        svg += '< text x = "${pad.left - 5}" y = "${y + 3}" fill = "var(--text-secondary)" font - size="9" text - anchor="end" style = "pointer-events:none;" > ${ Math.round(val) }</text > ';\n    }\n\n    // Days Delimiter (Midnight) & Labels (Noon)\n    chartData.forEach((d, i) => {\n        const date = new Date(d.time);\n        const hour = parseInt(d.time.substring(11, 13)); // Robust parsing\n        const x = getX(i);\n\n        // Midnight Line\n        if (hour === 0 && i > 0) {\n            svg += '< line x1 = "${x}" y1 = "${pad.top}" x2 = "${x}" y2 = "${h - pad.bottom}" stroke = "var(--border-color)" stroke - width="1" opacity = "0.3" /> ';\n        }\n\n        // Noon Label (Centered)\n        if (hour === 12) {\n            svg += '< text x = "${x}" y = "${h - 5}" fill = "var(--text-secondary)" font - size="9" text - anchor="middle" > ${ date.toLocaleDateString('en-US', { weekday: 'short' }) }</text > ';\n        }\n    });\n\n    // Selected Hour Highlight\n    let selectedX = -1;\n    if (selectedForeHour) {\n        const idx = forecastData.findIndex(d => d.time === selectedForeHour);\n        if (idx !== -1) {\n            selectedX = getX(idx);\n            svg += '< line x1 = "${selectedX}" y1 = "${pad.top}" x2 = "${selectedX}" y2 = "${h - pad.bottom}" stroke = "var(--accent-color)" stroke - width="2" opacity = "0.8" /> ';\n            // Highlight Dots\n            const d = forecastData[idx];\n            svg += '< circle cx = "${selectedX}" cy = "${getY(d.temp)}" r = "4" fill = "#f87171" stroke = "white" stroke - width="2" /> ';\n            svg += '< circle cx = "${selectedX}" cy = "${getY(d.dew)}" r = "4" fill = "#60a5fa" stroke = "white" stroke - width="2" /> ';\n        }\n    }\n\n    // Paths\n    svg += '< path d = "${pathDew}" fill = "none" stroke = "#60a5fa" stroke - width="2" /> ';\n    svg += '< path d = "${pathTemp}" fill = "none" stroke = "#f87171" stroke - width="2" /> ';\n\n    // Interaction Layer (Transparent)\n    // We attach mouse events to the parent div or this rect\n    // Easier to use inline events on rect for quick implementation\n    svg += '< rect x = "${pad.left}" y = "${pad.top}" width = "${chartW}" height = "${chartH}" fill = "white" fill - opacity="0"
onmousemove = "window.handleChartHover(event, ${w}, ${chartW}, ${pad.left}, ${chartData.length})"
onclick = "window.handleChartClick(event, ${w}, ${chartW}, ${pad.left}, ${chartData.length})"
onmouseleave = "window.hideForeTooltip()" /> ';\n\n    svg += '</svg > ';\n    cont.innerHTML = svg;\n}\n\nexport function renderAllForecasts() {\n    calculateBestRunTime(forecastData);\n\n    // Render 16-Day Tab (Now 14 Days)\n    renderForecastHeatmap(\'forecast-grid-container-16\', \'#legend-container-16\', 14);\n    renderForecastTable(\'forecast-body-16\', 14);\n    renderForecastChart(\'forecast-chart-container-16\', 14);\n}\n\nexport function renderClimateHeatmap() {\n    const container = document.getElementById(\'climate-heatmap-container\');\n    if (!container) return;\n\n    const rawData = window.climateData;\n    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {\n        container.innerHTML = \'<div style="padding:20px; text-align:center; color:var(--text-secondary);">Loading data... (if persists, check console)</div>\';\n        console.warn("Climate Data not found or empty:", rawData);\n        return;\n    }\n\n    // Optimization: Create a lookup map\n    const dataMap = new Map();\n    rawData.forEach(d => {\n        dataMap.set('${ d.week } -${ d.hour } ', d);\n    });\n\n    // Remove grid CSS if it persists and force simple block\n    container.style.display = \'block\';\n    container.style.gridTemplateColumns = \'none\';\n\n    // ensure table is updated (initially)\n    renderClimateTable();\n    renderClimateLegend(); // Update legend\n\n    // Calculate Current Time for Highlight\n    const now = new Date();\n    const curH = now.getHours();\n    const curW = getISOWeek(now);\n\n    // Dimensions\n    const cellW = 12; // Base unit\n    const cellH = 12;\n    const gap = 2;\n    const labelW = 40; // Left margin for Hour Labels\n    const headerH = 24; // Top margin for Month Labels (Increased for visibility)\n\n    // 53 Weeks x 24 Hours\n    const cols = 53;\n    const rows = 24;\n\n    const totalW = labelW + (cols * (cellW + gap));\n    const totalH = headerH + (rows * (cellH + gap));\n\n    let svgInner = \'\';\n\n    // 1. Month Labels (Correct Logic)\n    // Use local date calculation to get Month name (getDateFromWeek returns string, we need Date)\n    let lastMonth = "";\n    for (let w = 1; w <= cols; w++) {\n        const d = new Date(2025, 0, 1 + (w - 1) * 7);\n        const m = d.toLocaleString(\'en-US\', { month: \'short\' });\n\n        if (m !== lastMonth) {\n            const x = labelW + ((w - 1) * (cellW + gap));\n            // Adjust y to be nicely aligned within headerH (24px)\n            // headerH is top margin. y=headerH is grid start. Labels should be at y ~ 16-18\n            svgInner += '< text x = "${x}" y = "${headerH - 6}" font - size="9" fill = "var(--text-secondary)" > ${ m }</text > ';\n            lastMonth = m;\n        }\n    }\n\n    // 2. Hour Labels (Left) - Show ALL 24h\n    for (let h = 0; h < 24; h++) {\n        const y = headerH + (h * (cellH + gap)) + (cellH / 2) + 3;\n        svgInner += '< text x = "${labelW - 6}" y = "${y}" text - anchor="end" font - size="9" fill = "var(--text-secondary)" > ${ h }</text > ';\n    }\n\n    // 3. Cells\n    // Iterate Columns (Weeks) then Rows (Hours)\n    for (let w = 1; w <= cols; w++) {\n        for (let h = 0; h < rows; h++) {\n            // Find data O(1)\n            const pt = dataMap.get('${ w } -${ h } ');\n\n            const x = labelW + ((w - 1) * (cellW + gap));\n            const y = headerH + (h * (cellH + gap));\n\n            let color = \'transparent\';\n            let opacity = \'1\';\n            let stroke = \'\';\n\n            // Dimming Logic (Filter by Selection)\n            if (window.selectedClimateKey) {\n                const [sw, sh] = window.selectedClimateKey.split(\'-\').map(Number);\n                if (sw !== w || sh !== h) opacity = \'0.1\';\n            }\n\n            if (pt) {\n                const val = pt.mean_impact;\n                const catIdx = getImpactCategory(val);\n\n                // Dimming Logic (Filter by Impact Legend)\n                if (climateImpactFilter !== null && catIdx !== climateImpactFilter) {\n                    opacity = \'0.1\';\n                }\n\n                if (val < 0.5) color = "#4ade80"; // Green\n                else if (val < 2.0) color = "#facc15"; // Yellow\n                else if (val < 3.5) color = "#fb923c"; // Orange\n                else if (val < 6.0) color = "#f87171"; // Red\n                else color = "#c084fc"; // Purple\n\n                if (isDark && val < 0.5) color = "#22c55e"; // Dark adjustment (green)\n\n                // Highlight Current Time\n                if (w === curW && h === curH) {\n                    stroke = \'stroke="#3b82f6" stroke-width="2" paint-order="stroke"\';\n                } else if (window.selectedClimateKey === '${ w } -${ h } ') {\n                    stroke = \'stroke="#fff" stroke-width="2" paint-order="stroke"\';\n                }\n\n                svgInner += '< rect x = "${x}" y = "${y}" width = "${cellW}" height = "${cellH}" rx = "1"
fill = "${color}" fill - opacity="${opacity}" ${ stroke }
style = "cursor:pointer; transition: fill-opacity 0.2s;"
onclick = "window.toggleClimateFilter(${w}, ${h}, event)"
onmouseenter = "window.showClimateTooltip(event, ${w}, ${h}, ${val}, ${pt.mean_temp}, ${pt.mean_dew}, ${pt.count})"
onmousemove = "window.moveClimateTooltip(event)"
onmouseleave = "window.hideClimateTooltip()"
    /> ';\n            } else {\n                // Empty/Missing placeholder (optional, or just skip)\n                svgInner += '< rect x = "${x}" y = "${y}" width = "${cellW}" height = "${cellH}" rx = "1"
fill = "var(--card-bg)" fill - opacity="0.3"
    /> ';\n            }\n        }\n    }\n\n    container.innerHTML = '< svg viewBox = "0 0 ${totalW} ${totalH}" preserveAspectRatio = "xMidYMid meet" style = "width:100%; height:auto; display:block;" > ${ svgInner }</svg > ';\n}\n\nexport function renderClimateTable() {\n    const tb = document.getElementById(\'climateTableBody\');\n    if (!tb) return;\n\n    let data = (window.climateData || []).slice();\n\n    // Filter\n    if (window.selectedClimateKey) {\n        const [selW, selH] = window.selectedClimateKey.split(\'-\').map(Number);\n        data = data.filter(d => d.week === selW && d.hour === selH);\n\n        // Show Filter Label\n        document.getElementById(\'climate-filter-label\').classList.remove(\'hidden\');\n        document.getElementById(\'climate-filter-label\').innerText = 'Week ${ selW }, ${ selH }:00';\n        document.getElementById(\'climate-clear-filter\').classList.remove(\'hidden\');\n    } else {\n        document.getElementById(\'climate-filter-label\').classList.add(\'hidden\');\n        document.getElementById(\'climate-clear-filter\').classList.add(\'hidden\');\n    }\n\n    // Sort\n    const dir = climateSortDir === \'asc\' ? 1 : -1;\n\n    // Reset Icons\n    document.querySelectorAll(\'[id^="sort-icon-climate-"]\').forEach(el => el.innerText = \'\');\n    const icon = dir === 1 ? \'▲\' : \'▼\';\n    const iconEl = document.getElementById(\'sort-icon-climate-\' + climateSortCol);\n    if (iconEl) iconEl.innerText = \' \' + icon;\n\n    data.sort((a, b) => {\n        let valA, valB;\n        if (climateSortCol === \'date\') { valA = a.week; valB = b.week; } // Week proxy\n        else if (climateSortCol === \'hour\') { valA = a.hour; valB = b.hour; }\n        else if (climateSortCol === \'temp\') { valA = a.mean_temp; valB = b.mean_temp; }\n        else if (climateSortCol === \'dew\') { valA = a.mean_dew; valB = b.mean_dew; }\n        else if (climateSortCol === \'wind\') { valA = a.mean_wind; valB = b.mean_wind; }\n        else if (climateSortCol === \'precip\') { valA = a.mean_precip; valB = b.mean_precip; }\n        else if (climateSortCol === \'impact\') { valA = a.mean_impact; valB = b.mean_impact; }\n\n        if (valA < valB) return -1 * dir;\n        if (valA > valB) return 1 * dir;\n        return 0;\n    });\n\n    tb.innerHTML = data.map(d => {\n        const dateStr = getDateFromWeek(d.week);\n        // Match Forecast Table Logic\n        const timeStr = '${ String(d.hour).padStart(2, '0') }:00';\n\n        let impactColor = "#4ade80";\n        if (d.mean_impact >= 6.0) impactColor = "#c084fc";\n        else if (d.mean_impact >= 3.5) impactColor = "#f87171";\n        else if (d.mean_impact >= 2.0) impactColor = "#fb923c";\n        else if (d.mean_impact >= 0.5) impactColor = "#facc15";\n\n        if (climateImpactFilter !== null) {\n            const catIdx = getImpactCategory(d.mean_impact);\n            if (catIdx !== climateImpactFilter) return \'\';\n        }\n\n        // Rain/Wind logic similar to Forecast\n        const rainColor = d.mean_precip > 0 ? \'#60a5fa\' : \'inherit\';\n\n        // Exact structure as Forecast Table Row\n        return '
    < tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition" >
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
            </tr > ';\n    }).join(\'\');\n}\n\nexport function renderClimateLegend() {\n    const container = document.getElementById(\'climate-legend-container\');\n    if (!container) return;\n\n    const levels = [\n        { label: \'Ideal\', sub: \'<0.5%\', color: \'#4ade80\' },\n        { label: \'Light\', sub: \'<2.0%\', color: \'#facc15\' },\n        { label: \'Medium\', sub: \'<3.5%\', color: \'#fb923c\' },\n        { label: \'High\', sub: \'<6.0%\', color: \'#f87171\' },\n        { label: \'Severe\', sub: \'>6.0%\', color: \'#c084fc\' }\n    ];\n\n    let html = \'\';\n    // Use flex wrap to list items horizontally/wrapping like Forecast if space allows\n    // Forecast uses \'legend-item\' class\n\n    levels.forEach((l, i) => {\n        const catIdx = i; // 0..4\n        let opacity = \'1\';\n        if (climateImpactFilter !== null && climateImpactFilter !== catIdx) {\n            opacity = \'0.4\';\n        }\n\n        let border = \'1px solid transparent\';\n        let isActive = (climateImpactFilter === catIdx);\n        if (isActive) border = \'2px solid #fff\';\n\n        html += '
    < div class="legend-item" onclick = "window.filterClimateByImpact(${catIdx}, this)" style = "cursor:pointer; opacity:${opacity}; transition:all 0.2s;" >
                            <div class="legend-color" style="background-color:${l.color}; border:${border}; box-shadow: ${isActive ? '0 0 8px ' + l.color : 'none'};"></div>
                            <span>${l.label} <span style="font-size:0.75em; opacity:0.7">(${l.sub})</span></span>
                        </div >
    ';\n    });\n\n    container.innerHTML = html;\n}\n\nexport function handleChartHover(e, totalW, chartW, padLeft, dataLen) {\n    const rect = e.target.getBoundingClientRect();\n    // Adjust mouseX to be relative to the chart area (padLeft offset)\n    // The SVG rect element starts at pad.left, so e.clientX on it is relative to viewport.\n    const rectBounds = e.target.getBoundingClientRect();\n    const x = e.clientX - rectBounds.left;\n    const ratio = x / rectBounds.width;\n    const len = dataLen || forecastData.length;\n    let idx = Math.round(ratio * (len - 1));\n    idx = Math.max(0, Math.min(idx, len - 1)); // Clamp to bounds\n\n    if (idx >= 0 && idx < forecastData.length) {\n        const d = forecastData[idx];\n\n        // Calculate Impact for consistency\n        const mode = window.currentPaceMode || \'HMP\';\n\n        // Calculate Impact for consistency\n        let baseSec = getBasePaceSec();\n\n        const adjPace = hapCalc.calculatePaceInHeat(baseSec, d.temp, d.dew);\n        const pct = ((adjPace - baseSec) / baseSec) * 100;\n        const color = getImpactColor(pct);\n\n        const date = new Date(d.time);\n        const dayName = date.toLocaleDateString(\'en-US\', { weekday: \'short\' });\n        // Add combined day/month\n        const dateStr = date.toLocaleDateString(\'en-GB\', { day: \'2-digit\', month: \'2-digit\' });\n        const hourStr = d.time.substring(11, 13); // Force string usage\n\n        // Exact same HTML template as handleCellHover\n        const html = '
    < div class="tooltip-header" > ${ dayName } ${ dateStr } ${ hourStr }:00</div >
                            <div class="tooltip-row"><span class="tooltip-label">Temp:</span> <span class="tooltip-val" style="color:#fff">${d.temp != null ? d.temp.toFixed(1) : '--'}°</span></div>
                            <div class="tooltip-row"><span class="tooltip-label">Dew:</span> <span class="tooltip-val" style="color:#60a5fa">${d.dew != null ? d.dew.toFixed(1) : '--'}°</span></div>
                            <div class="tooltip-row" style="margin-top:4px; padding-top:4px; border-top:1px solid #374151">
                                <span class="tooltip-label">Impact:</span> <span class="tooltip-val" style="color:${color}">${pct.toFixed(2)}%</span>
                            </div>
';\n        window.showForeTooltip(e, html);\n    }\n}\n\nexport function handleChartClick(e, totalW, chartW, padLeft, dataLen) {\n    const rect = e.target.getBoundingClientRect();\n    const mouseX = e.clientX - rect.left;\n    const ratio = mouseX / chartW;\n    const len = dataLen || forecastData.length;\n    const idx = Math.round(ratio * (len - 1));\n\n    if (idx >= 0 && idx < forecastData.length) {\n        const d = forecastData[idx];\n        window.toggleForeSelection(d.time, e);\n    }\n}\n\nexport function toggleVDOTDetails() {\n    const el = document.getElementById(\'vdot-details\');\n    if (!el) return;\n\n    if (el.style.display === \'none\') {\n        el.style.display = \'block\';\n        renderVDOTDetails();\n    } else {\n        el.style.display = \'none\';\n    }\n}\n\nexport function filterClimateByImpact(idx, el) {\n    if (climateImpactFilter === idx) {\n        climateImpactFilter = null;\n        // Clear dimming\n        el.parentElement.querySelectorAll(\'.legend-item\').forEach(e => e.classList.remove(\'opacity-20\'));\n    } else {\n        climateImpactFilter = idx;\n        // Set dimming\n        el.parentElement.querySelectorAll(\'.legend-item\').forEach(e => e.classList.add(\'opacity-20\'));\n        el.classList.remove(\'opacity-20\');\n    }\n    renderClimateHeatmap(); // To dim cells\n    renderClimateTable();   // To filter rows\n}\n\nexport function sortClimate(col) {\n    if (climateSortCol === col) {\n        climateSortDir = (climateSortDir === \'asc\') ? \'desc\' : \'asc\';\n    } else {\n        climateSortCol = col;\n        climateSortDir = \'desc\'; // Default high impact/temp first\n        if (col === \'date\' || col === \'hour\') climateSortDir = \'asc\';\n    }\n    renderClimateTable();\n}\n\nexport function toggleClimateFilter(w, h, e) {\n    if (e) e.stopPropagation(); // Essential to prevent document click from clearing selection immediately\n    if (w === null) {\n        window.selectedClimateKey = null; // Clear\n    } else {\n        const key = '${ w } -${ h } ';\n        if (window.selectedClimateKey === key) window.selectedClimateKey = null; // Toggle off\n        else window.selectedClimateKey = key;\n    }\n    renderClimateTable();\n    renderClimateHeatmap(); // Update opacity\n    renderClimateLegend(); // Update legend\n}\n\nexport function showClimateTooltip(e, w, h, impact, temp, dew, count) {\n    // Reuse the same tooltip element as Forecast for consistency\n    let el = document.getElementById(\'forecast-tooltip\');\n    if (!el) {\n        el = document.createElement(\'div\');\n        el.id = \'forecast-tooltip\';\n        el.className = \'forecast-tooltip\';\n        el.style.position = \'fixed\';\n        el.style.zIndex = \'10000\';\n        document.body.appendChild(el);\n    }\n\n    // Match impact color logic\n    let impactColor = "#4ade80";\n    if (impact >= 6.0) impactColor = "#c084fc";\n    else if (impact >= 3.5) impactColor = "#f87171";\n    else if (impact >= 2.0) impactColor = "#fb923c";\n    else if (impact >= 0.5) impactColor = "#facc15";\n\n    const dateStr = '${ getDateFromWeek(w) } ';\n    const timeStr = '${ String(h).padStart(2, '0') }:00';\n\n    // Exact HTML template as handleCellHover\n    const html = '
    < div class="tooltip-header" > Week ${ w } (${ dateStr }) ${ timeStr }</div >
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

export function moveClimateTooltip(e) {
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

export function hideClimateTooltip() {
    const el = document.getElementById('forecast-tooltip');
    if (el) el.style.opacity = '0';
}

