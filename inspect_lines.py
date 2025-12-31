
import os

file_path = 'src/modules/ui.mjs'

if not os.path.exists(file_path):
    print(f"File {file_path} does NOT exist.")
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

def print_lines(start, end):
    print(f"--- Lines {start}-{end} ---")
    for i in range(start, min(end, len(lines))):
        print(f"{i+1}: {repr(lines[i])}")

print_lines(250, 280)
print_lines(300, 330)
