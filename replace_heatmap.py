
import os

INDEX_FILE = "index.html"

NEW_FUNCTION = """
    window.renderClimateHeatmap = function() {
        const container = document.getElementById('climate-heatmap-container');
        if(!container) return;
        
        // Remove grid CSS if it persists and force simple block
        container.style.display = 'block';
        container.style.gridTemplateColumns = 'none';

        // ensure table is updated (initially)
        renderClimateTable();
        
        // Calculate Current Time for Highlight
        const now = new Date();
        const curH = now.getHours();
        const curW = getISOWeek(now);

        // Dimensions
        const cellW = 12; // Base unit
        const cellH = 12;
        const gap = 2;
        const labelW = 40; // Left margin for Hour Labels
        const headerH = 20; // Top margin for Month Labels
        
        // 53 Weeks x 24 Hours
        const cols = 53;
        const rows = 24;
        
        const totalW = labelW + (cols * (cellW + gap));
        const totalH = headerH + (rows * (cellH + gap));
        
        let svgInner = '';

        // 1. Month Labels (Approximate Week Mapping)
        // Week 1=Jan, Week 6=Feb, Week 10=Mar, etc.
        const monthWeeks = [1, 6, 10, 14, 19, 23, 27, 32, 36, 40, 45, 49];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        monthWeeks.forEach((w, i) => {
            const x = labelW + ((w - 1) * (cellW + gap));
            svgInner += `<text x="${x}" y="${headerH - 6}" font-size="9" fill="var(--text-secondary)">${monthNames[i]}</text>`;
        });

        // 2. Hour Labels (Left)
        for(let h=0; h<24; h+=3) { // Show every 3rd hour to save space
            const y = headerH + (h * (cellH + gap)) + (cellH/2) + 3;
            svgInner += `<text x="${labelW - 6}" y="${y}" text-anchor="end" font-size="9" fill="var(--text-secondary)">${h}:00</text>`;
        }

        // 3. Cells
        // Iterate Columns (Weeks) then Rows (Hours)
        for(let w=1; w<=cols; w++) {
            for(let h=0; h<rows; h++) {
                 // Find data
                 const pt = climateData.find(d => d.week === w && d.hour === h);
                 
                 const x = labelW + ((w - 1) * (cellW + gap));
                 const y = headerH + (h * (cellH + gap));
                 
                 let color = 'transparent'; 
                 let opacity = '1';
                 let stroke = '';
                 
                 // Dimming Logic (Filter by Selection)
                 if(selectedClimateKey) {
                    const [sw, sh] = selectedClimateKey.split('-').map(Number);
                    if(sw !== w || sh !== h) opacity = '0.1';
                 }

                 if(pt) {
                    const val = pt.mean_impact;
                    const catIdx = getImpactCategory(val);

                    // Dimming Logic (Filter by Impact Legend)
                    if(climateImpactFilter !== null && catIdx !== climateImpactFilter) {
                         opacity = '0.1';
                    }

                    if (val < 0.5) color = "#4ade80"; // Green
                    else if (val < 2.0) color = "#facc15"; // Yellow
                    else if (val < 3.5) color = "#fb923c"; // Orange
                    else if (val < 6.0) color = "#f87171"; // Red
                    else color = "#c084fc"; // Purple
                    
                    if(isDark && val < 0.5) color = "#22c55e"; // Dark adjustment (green)
                    
                    // Highlight Current Time
                    if(w === curW && h === curH) {
                        stroke = 'stroke="#3b82f6" stroke-width="2" paint-order="stroke"';
                    } else if (selectedClimateKey === `${w}-${h}`) {
                        stroke = 'stroke="#fff" stroke-width="2" paint-order="stroke"';
                    }
                    
                    svgInner += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="1"
                        fill="${color}" fill-opacity="${opacity}" ${stroke}
                        style="cursor:pointer; transition: fill-opacity 0.2s;"
                        onclick="window.toggleClimateFilter(${w}, ${h})"
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
"""

with open(INDEX_FILE, 'r') as f:
    content = f.read()

# Define the start of the function to replace
start_marker = "    function renderClimateHeatmap() {"
# The end of the function is tricky to find with exact string matching because of nested braces.
# But I know the next function definition or the end of the script.
# In the file, "renderClimateHeatmap" is followed by:
#     // Auto-Run initial render..."
# Let's find the start index
start_idx = content.find(start_marker)
if start_idx == -1:
    print("Error: Could not find renderClimateHeatmap function.")
    exit(1)

# Find the next marker (end of function)
# I will search for the Auto-Run comment which is near the end of the script block
end_marker = "    // Auto-Run initial render"
end_idx = content.find(end_marker, start_idx)

if end_idx == -1:
    print("Error: Could not find end marker.")
    exit(1)

# Replace the content
new_content = content[:start_idx] + NEW_FUNCTION + "\n\n" + content[end_idx:]

with open(INDEX_FILE, 'w') as f:
    f.write(new_content)

print("Successfully replaced renderClimateHeatmap.")
