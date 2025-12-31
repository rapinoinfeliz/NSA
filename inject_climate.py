
import os
import re

DATA_FILE = "climate_data.js"
LOGIC_FILE = "climate_logic_raw.js"
INDEX_FILE = "index.html"

# 1. Read Data
with open(DATA_FILE, 'r') as f:
    climate_data_full = f.read().strip()
    # It starts with "const climateData = ..."
    # I want to ensure it is clean.

# 2. Read Logic
with open(LOGIC_FILE, 'r') as f:
    climate_logic_raw = f.read()

# 3. Construct Script Content
full_script_content = f"""
<script>
/* --- INJECTED CLIMATE DATA --- */
{climate_data_full}

/* --- INJECTED CLIMATE LOGIC --- */
(function() {{
    // Dark Mode Helper
    let isDark = document.documentElement.classList.contains('dark');
    window.toggleDarkMode = function() {{
        document.documentElement.classList.toggle('dark');
        isDark = document.documentElement.classList.contains('dark');
        renderClimateHeatmap();
        renderClimateTable();
    }};
    
    // Init Dark Mode
    // Check if body background color suggests dark mode
    const computedBg = getComputedStyle(document.body).backgroundColor;
    if(computedBg === 'rgb(13, 17, 23)' || computedBg === '#0d1117') {{
        isDark = true;
        document.documentElement.classList.add('dark');
    }}

    {climate_logic_raw}

    // Auto-Run initial render if tab is active (unlikely on load but good practice)
    // setTimeout(renderClimateHeatmap, 500);
}})();
</script>
"""

# 4. Read Index
with open(INDEX_FILE, 'r') as f:
    index_content = f.read()

# 5. Replace Placeholder
if '<script id="climate-logic-injection"></script>' in index_content:
    print("Found script placeholder. Injecting...")
    index_content = index_content.replace('<script id="climate-logic-injection"></script>', full_script_content)
else:
    print("ERROR: Script placeholder not found!")

# 6. Inject Button (if not present)
button_html = '<button class="tab-btn" onclick="openTab(\'climate\', this)">Climate</button>'
if 'onclick="openTab(\'climate\', this)"' not in index_content:
    print("Injecting Button...")
    # Find the Forecast button
    pattern = r'(<button class="tab-btn" onclick="openTab\(\'forecast16\', this\)">Forecast</button>)'
    replacement = r'\1\n        ' + button_html
    index_content = re.sub(pattern, replacement, index_content)
else:
    print("Button already present.")

# 7. Write Back
with open(INDEX_FILE, 'w') as f:
    f.write(index_content)

print("Injection Complete.")
