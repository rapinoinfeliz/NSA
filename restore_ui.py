
import re
import os

app_path = 'app.js'
ui_path = 'src/modules/ui.js'

if not os.path.exists(app_path):
    print("app.js not found in current dir, trying absolute path logic or relative to project root")
    # Current dir is project root usually
    if os.path.exists('/Users/filiperonzani/.gemini/antigravity/scratch/pacing-calculator/app.js'):
        app_path = '/Users/filiperonzani/.gemini/antigravity/scratch/pacing-calculator/app.js'
    else:
        print("Fatal: app.js not found.")
        exit(1)

with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Helper to find balanced brace closing
def find_closing_brace(text, start_index):
    balance = 0
    # verify start matches {
    # start_index should encompass the opening brace
    # identifying where { is
    idx = text.find('{', start_index)
    if idx == -1: return -1
    
    balance = 1
    i = idx + 1
    while i < len(text):
        char = text[i]
        if char == '{':
            balance += 1
        elif char == '}':
            balance -= 1
            if balance == 0:
                return i
        i += 1
    return -1

# Identify functions assigned to window
# Regex: window\.(\w+)\s*=\s*(async\s+)?function\s*\(([^)]*)\)
# We also have arrow functions? app.js seems to use `function` or `async function`.
pattern = re.compile(r'window\.(\w+)\s*=\s*(async\s+)?function\s*\(([^)]*)\)')

matches = []
for m in pattern.finditer(content):
    func_name = m.group(1)
    is_async = m.group(2) or ''
    args = m.group(3)
    start = m.start()
    
    # We found the declaration. Now find the body.
    # The regex ended at `)`. We need to find `{`.
    end_of_match = m.end()
    
    # Find {
    brace_start = content.find('{', end_of_match)
    if brace_start == -1: continue # Should not happen
    
    brace_end = find_closing_brace(content, brace_start)
    if brace_end == -1:
        print(f"Could not find closing brace for {func_name}")
        continue
    
    # Extract
    # We want to verify if this is a UI function we want.
    skip_list = ['toggleDarkModex', 'fetchWeather'] # Skipping fetchWeather as it is in api.js
    if func_name in skip_list: continue

    # Construct New Function
    # export function Name(Args) { ... }
    body = content[brace_start:brace_end+1]
    
    # Fix indent of body? 
    # The body includes the braces.
    
    func_def = f"export {is_async.strip()} function {func_name}({args}) {body}"
    matches.append(func_def)
    print(f"Extracted {func_name}")

# Also extract `infoIcon`? 
# In app.js it was inside renderCurrentTab.
# We should extract it to top level helper.
# But regex won't find it if it's local.
# Let's manually add helper functions needed.

helpers = """
// --- Helpers ---
// infoIcon was local in renderCurrentTab, duplicating here for shared use if needed
function infoIcon(title, text) {
    const tSafe = title.replace(/'/g, "\\\\'");
    const txtSafe = text.replace(/'/g, "\\\\'");
    return `<span onclick="window.showInfoTooltip(event, '${tSafe}', '${txtSafe}')" style="cursor:pointer; opacity:0.5; margin-left:4px; display:inline-flex; vertical-align:middle;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>`;
}

function getBasePaceSec() {
    const mode = window.currentPaceMode || 'HMP';
    // Helper to parse times from elements
    const parseEl = (id) => {
        const el = document.getElementById(id);
        if (!el || !el.innerText) return 300;
        const match = el.innerText.match(/(\\d{1,2}:\\d{2})/);
        // Simple parseTime
        if(match) {
            const p = match[1].split(':').map(Number);
            return p[0]*60 + p[1];
        }
        return 300;
    };

    if (mode === '15KP') return parseEl('pace-3min');
    if (mode === 'HMP') return parseEl('pace-6min');
    if (mode === '30KP') return parseEl('pace-10min');
    if (mode === 'EZ') return parseEl('pace-easy');
    return 300;
}

// date/time format helpers
function formatTime(sec) {
    if (!sec || isNaN(sec) || sec === Infinity) return "--:--";
    let m = Math.floor(sec / 60);
    let s = Math.round(sec % 60);
    if (s === 60) { m++; s = 0; }
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function getDateFromWeek(w) {
    // 2025 starts on a Wednesday
    const date = new Date(2025, 0, 1 + (w - 1) * 7);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}
"""

# Header
header = """
// UI Module - Reconstructed
import { HAPCalculator } from './core.js'; 
// Assuming core.js has HAPCalculator
// But app.js code used `window.hapCalc`.
// We will rely on window.hapCalc for now to minimize breakage inside the extracted blocks.

"""

# Combine
full_content = header + helpers + "\n\n" + "\n\n".join(matches)

# Write
with open(ui_path, 'w', encoding='utf-8') as f:
    f.write(full_content)

print(f"Reconstructed {ui_path} with {len(matches)} functions.")
