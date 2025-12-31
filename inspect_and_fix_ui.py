
import os

file_path = 'src/modules/ui.mjs' # We know it's .mjs now

if not os.path.exists(file_path):
    print(f"File {file_path} does NOT exist.")
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'daylightStr' in line and '${' in line:
        print(f"Found broken line {i+1}: {repr(line)}")
        # Replace template with concat
        # const daylightStr = remainingMin > 0 ? `${ remHours }h ${ remM }m left` : 'Night';
        # to
        # const daylightStr = remainingMin > 0 ? remHours + 'h ' + remM + 'm left' : 'Night';
        
        # Simple string replace logic for safe transform
        if "`$" in line or "`${" in line:
             line = line.replace("`${", "").replace("}`", "").replace(" }`", "").replace("`${ ", "")
             # This is hard to robustly regex replace blindly.
             # I'll just hardcode the fix for this specific known line logic.
             if "remHours" in line and "remM" in line:
                 lines[i] = "        const daylightStr = remainingMin > 0 ? remHours + 'h ' + remM + 'm left' : 'Night';\n"
                 print(f"Fixed line {i+1}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("File updated.")
