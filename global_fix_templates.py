
import re
import os

file_path = 'src/modules/ui.mjs'

if not os.path.exists(file_path):
    print(f"File {file_path} NOT found.")
    exit(1)

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    # content inside backticks
    inner = match.group(1)
    # Escape single quotes because we will wrap in single quotes
    inner = inner.replace("'", "\\'")
    # Replace ${expr} with ' + (expr) + '
    # Logic: look for ${ ... }
    # This regex is simple and might fail on nested braces but ui.js seems simple.
    # We use a non-greedy match for content inside ${}
    
    def var_replacer(m):
        expr = m.group(1)
        # Un-escape single quotes inside the expression if we escaped them above?
        # NO, if the expression code had quotes: `${ func('arg') }`
        # We escaped it to `${ func(\'arg\') }`.
        # When we output ' + (func(\'arg\')) + ', JS parse: ' string ' + ...
        # func('arg'). Correct.
        return f"' + ({expr}) + '"

    # Replace ${...}
    # We need to handle newlines in expression? JS template literals allow newlines.
    # Our regex for template literal `([^`]*)` handles newlines.
    
    # Regex for variable: \$\{([^}]+)\}
    converted = re.sub(r'\$\{([^}]+)\}', var_replacer, inner)
    
    # Remove empty string concatenations: ' + () + ' -> '' ?
    # 'foo ' + (bar) + ' baz' -> OK.
    # what if starts with var? ' + (bar) + ' baz' -> (+bar) + ' baz' (syntax error?)
    # We wrap result in '...'
    # result: '... ' + (expr) + ' ...'
    
    return f"'{converted}'"

# Replace `...` with replacer
# Handle escaped backticks? JS allows \`.
# Regex: ` ( [^`\\]* (?: \\.[^`\\]* )* ) ` ? Too complex.
# Simple approximation: `([^`]*)` assuming no escaped backticks which is rare in this file.
new_content = re.sub(r'`([^`]*)`', replacer, content)

# Post-processing cleanup
# If we have empty strings at start/end of concat: '' + (expr) + ''
new_content = new_content.replace("' + (", "(").replace(") + '", ")")
# Wait, ' + (expr) ... ' at start means `(expr) ...`? 
# If replacement returns "' + (expr) + '", and we treat it as string.
# Original: `${a}` -> replacer returns "' + (a) + '"
# Result in code: ' ' + (a) + ' ' -> syntax error if standalone?
# const x = ' ' + (a) + ' '; Valid.
# const x = '' + (a) + ''; Valid.

# But replacer returns f"'{converted}'"
# If converted is "' + (a) + '", result is "'' + (a) + ''". 
# This evaluates to string " + (a) + ". WRONG.
# Ah. var_replacer logic must be matched with outer wrapper.

# Let's verify replacer logic:
# inner: ${a}
# var_replacer: ' + (a) + '
# converted: ' + (a) + '
# return: '' + (a) + ''
# JS: "" + (a) + "" -> string concatenation. Correct.
# The result is expression that evaluates to string.

# One catch: Newlines in the string part.
# 'line 1
# line 2'
# Literal newlines in single-quoted strings are NOT allowed in JS.
# Template literals allow them.
# So we must escape newlines in string parts.
# inner.replace('\n', '\\n') ?
# Yes.

def robust_replacer(match):
    inner = match.group(1)
    inner = inner.replace("'", "\\'")
    inner = inner.replace("\n", "\\n") # Convert actual newline to \n
    
    def var_replacer(m):
        expr = m.group(1)
        return f"' + ({expr}) + '"

    converted = re.sub(r'\$\{([^}]+)\}', var_replacer, inner)
    return f"'{converted}'"

new_content = re.sub(r'`([^`]*)`', robust_replacer, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Global replacement complete.")
