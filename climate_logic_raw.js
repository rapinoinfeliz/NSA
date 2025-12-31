    let climateTooltipEl = document.getElementById('custom-tooltip');

    function getDateFromWeek(w) {
        // Simple approximation: Week 1 = Jan 1. 
        // 2025 starts on a Wednesday, but for visual approximation we just want rough Date.
        // Better: d = 1 + (w-1)*7
        const date = new Date(2025, 0, 1 + (w-1)*7); 
        return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
    }

    function showClimateTooltip(e, w, h, impact, temp, dew, count) {
        if(!climateTooltipEl) climateTooltipEl = document.getElementById('custom-tooltip');
        climateTooltipEl.style.opacity = '1';
        
        // Match Forecast Chart Color Logic
        let impactColor = "#4ade80"; // Default Green
        if(impact >= 6.0) impactColor = "#c084fc";      // Purple
        else if(impact >= 3.5) impactColor = "#f87171"; // Red
        else if(impact >= 2.0) impactColor = "#fb923c"; // Orange
        else if(impact >= 0.5) impactColor = "#facc15"; // Yellow
        
        const dateStr = `${getDateFromWeek(w)} ${String(h).padStart(2,'0')}:00`;

        // Ultra-Compact Tooltip Structure
        climateTooltipEl.innerHTML = `
            <div class="font-bold text-gray-200 text-xs leading-none mb-1">Week ${w}, ${dateStr}</div>
            <div class="flex justify-between text-[10px] leading-none mb-0.5"><span class="text-gray-400">Temp:</span> <span class="text-white font-bold">${temp}°</span></div>
            <div class="flex justify-between text-[10px] leading-none mb-1"><span class="text-gray-400">Dew:</span> <span class="text-blue-400 font-bold">${dew}°</span></div>
            <div class="flex justify-between items-center leading-none border-t border-gray-700 pt-1"><span class="text-gray-400 text-[10px]">Impact:</span> <span class="font-bold text-sm leading-none" style="color: ${impactColor}">${impact}%</span></div>
        `;
        moveClimateTooltip(e);
    }
    
    function moveClimateTooltip(e) {
        if(!climateTooltipEl) return;
        const x = e.pageX + 10;
        // Position ABOVE cursor: y - height - offset
        // We need to ensure we don't go off-screen top, but simpler first
        const height = climateTooltipEl.offsetHeight || 80; // Estimate if not rendered yet
        const y = e.pageY - height - 10;
        
        climateTooltipEl.style.left = x + 'px';
        climateTooltipEl.style.top = y + 'px';
    }

    function hideClimateTooltip() {
        if(climateTooltipEl) climateTooltipEl.style.opacity = '0';
    }
        
    function getISOWeek(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    }

    // --- CLIMATE TABLE LOGIC ---
    let climateSortCol = 'impact';
    let climateSortDir = 'desc';
    let selectedClimateKey = null; // "w-h"
    let climateImpactFilter = null; // 0-4

    function getImpactCategory(val) {
        if (val < 0.5) return 0;
        else if (val < 2.0) return 1;
        else if (val < 3.5) return 2;
        else if (val < 6.0) return 3;
        else return 4;
    }

    window.filterClimateByImpact = function(idx, el) {
        if(climateImpactFilter === idx) {
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

    function renderClimateTable() {
        const tb = document.getElementById('climateTableBody');
        if(!tb) return;
        
        let data = climateData.slice();
        
        // Filter
        if(selectedClimateKey) {
            const [selW, selH] = selectedClimateKey.split('-').map(Number);
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
        if(iconEl) iconEl.innerText = ' ' + icon;

        data.sort((a,b) => {
            let valA, valB;
            if(climateSortCol === 'date') { valA = a.week; valB = b.week; } // Week proxy for date
            else if(climateSortCol === 'hour') { valA = a.hour; valB = b.hour; }
            else if(climateSortCol === 'temp') { valA = a.mean_temp; valB = b.mean_temp; }
            else if(climateSortCol === 'dew') { valA = a.mean_dew; valB = b.mean_dew; }
            else if(climateSortCol === 'wind') { valA = a.mean_wind; valB = b.mean_wind; }
            else if(climateSortCol === 'precip') { valA = a.mean_precip; valB = b.mean_precip; }
            else if(climateSortCol === 'impact') { valA = a.mean_impact; valB = b.mean_impact; }
            
            if(valA < valB) return -1 * dir;
            if(valA > valB) return 1 * dir;
            return 0;
        });
        
        tb.innerHTML = data.map(d => {
            const dateStr = getDateFromWeek(d.week);
            let impactColor = "#4ade80"; 
            let categoryName = "IDEAL";
            if(d.mean_impact >= 6.0) { impactColor = "#c084fc"; categoryName = "SEVERE"; }
            else if(d.mean_impact >= 3.5) { impactColor = "#f87171"; categoryName = "HIGH"; }
            else if(d.mean_impact >= 2.0) { impactColor = "#fb923c"; categoryName = "MEDIUM"; }
            else if(d.mean_impact >= 0.5) { impactColor = "#facc15"; categoryName = "LIGHT"; }
            
            if(climateImpactFilter !== null) {
                const catIdx = getImpactCategory(d.mean_impact);
                if(catIdx !== climateImpactFilter) return '';
            }

            return `
            <tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition bg-white dark:bg-gray-800">
                <td class="px-6 py-3 font-mono text-gray-600 dark:text-gray-300">${dateStr}</td>
                <td class="px-6 py-3 font-mono text-center text-gray-700 dark:text-gray-200">${String(d.hour).padStart(2,'0')}:00</td>
                <td class="px-6 py-3 text-center font-bold text-gray-900 dark:text-white">${d.mean_temp}°</td>
                <td class="px-6 py-3 text-center font-mono text-blue-500">${d.mean_dew}°</td>
                <td class="px-6 py-3 text-center font-mono text-gray-600 dark:text-gray-400">${d.mean_wind} km/h</td>
                <td class="px-6 py-3 text-center font-mono text-gray-600 dark:text-gray-400">${d.mean_precip} mm</td>
                <td class="px-6 py-3 text-center">
                    <div class="flex items-center justify-center gap-3">
                        <span class="font-bold text-lg" style="color: ${impactColor}">${d.mean_impact}%</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider" 
                              style="background-color: ${impactColor}15; color: ${impactColor}; border-color: ${impactColor}30">
                            ${categoryName}
                        </span>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    window.sortClimate = function(col) {
        if(climateSortCol === col) {
            climateSortDir = (climateSortDir === 'asc') ? 'desc' : 'asc';
        } else {
            climateSortCol = col;
            climateSortDir = 'desc'; // Default high impact/temp first
            if(col === 'date' || col === 'hour') climateSortDir = 'asc';
        }
        renderClimateTable();
    }
    
    window.toggleClimateFilter = function(w, h) {
        if(w === null) {
            selectedClimateKey = null; // Clear
        } else {
            const key = `${w}-${h}`;
            if(selectedClimateKey === key) selectedClimateKey = null; // Toggle off
            else selectedClimateKey = key;
        }
        renderClimateTable();
        renderClimateHeatmap(); // Update opacity
    }

    function renderClimateHeatmap() {
        const container = document.getElementById('climate-heatmap-container');
        if(!container) return;
        
        // Force render every time (remove caching check that might fail)
        container.innerHTML = '';
        renderClimateTable(); // Ensure table is rendered initially too
        
        // Calculate Current Time for Highlight
        const now = new Date();
        const curH = now.getHours();
        const curW = getISOWeek(now);
        
        let html = '';
        
        // Rows = Hours (0-23)
        for(let h=0; h<24; h++) {
            // Label Cell
            html += `<div class="text-[10px] text-gray-400 text-right pr-2 leading-[15px] pt-[2px]">${h}:00</div>`;
            
            // 53 Weeks
            for(let w=1; w<=53; w++) {
                // Find data
                const pt = climateData.find(d => d.week === w && d.hour === h);
                let color = '#ebedf0'; // Default gray
                let events = '';
                let opacity = '1';
                
                // Dimming Logic
                if(selectedClimateKey) {
                    const [sw, sh] = selectedClimateKey.split('-').map(Number);
                    if(sw !== w || sh !== h) opacity = '0.1';
                }
                
                if(pt) {
                    const val = pt.mean_impact;
                    const catIdx = getImpactCategory(val);

                    if(climateImpactFilter !== null && catIdx !== climateImpactFilter) {
                         opacity = '0.1';
                    }

                    if (val < 0.5) color = "#4ade80"; // Green
                    else if (val < 2.0) color = "#facc15"; // Yellow
                    else if (val < 3.5) color = "#fb923c"; // Orange
                    else if (val < 6.0) color = "#f87171"; // Red
                    else color = "#c084fc"; // Purple
                    
                    if(isDark && val < 0.5) color = "#22c55e"; // Dark mode adjustment if needed
                    
                    // Attach Custom Tooltip Events AND Click Logic
                    events = `onmouseenter="showClimateTooltip(event, ${w}, ${h}, ${val}, ${pt.mean_temp}, ${pt.mean_dew}, ${pt.count})" 
                              onmousemove="moveClimateTooltip(event)" 
                              onmouseleave="hideClimateTooltip()"
                              onclick="toggleClimateFilter(${w}, ${h})"`;
                } else {
                    if(isDark) color = '#1f2937';
                }
                
                // Highlight Current Time
                let extraClass = '';
                if(w === curW && h === curH) {
                    extraClass = 'ring-2 ring-blue-500 z-20 shadow-lg';
                }
                
                html += `<div class="w-full h-[20px] rounded-[1px] hover:scale-125 hover:z-10 transition-transform cursor-pointer ${extraClass}"                           style="background-color: ${color}; opacity: ${opacity}" ${events}></div>`;
            }
        }
        container.innerHTML = html;
    }
    
