import re

file_path = r"c:\Users\Karina\ChambeeProyecto\Proyecto-Chambee\frontend\src\app\pages\perfil-postulante\perfil-postulante.component.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove comments
content_clean = re.sub(r"<!--.*?-->", "", content, flags=re.DOTALL)

# Void elements in HTML
VOID_ELEMENTS = {"img", "input", "hr", "br", "link", "meta", "col", "base", "area", "embed", "param", "source", "track", "wbr"}

# Precompute line numbers for character offsets
line_starts = [0]
for match in re.finditer(r"\n", content):
    line_starts.append(match.end())

def get_line_num(char_offset):
    # Binary search or simple scan
    for idx, start in enumerate(line_starts):
        if char_offset < start:
            return idx
    return len(line_starts)

stack = []
errors = []

# Match all tags: <tag ...> or </tag>
tag_regex = re.compile(r"<(/?[a-zA-Z0-9\-]+)(?:\s+[^>]*?)?(/?)>", re.DOTALL)

for match in tag_regex.finditer(content_clean):
    tag_name = match.group(1)
    is_self_closing = match.group(2) == "/"
    line_num = get_line_num(match.start())
    
    # If it's a closing tag
    if tag_name.startswith("/"):
        clean_name = tag_name[1:].lower()
        if clean_name in VOID_ELEMENTS:
            continue
        if not stack:
            errors.append(f"Unexpected closing tag </{clean_name}> on line {line_num}")
        else:
            last_tag, last_line = stack.pop()
            if last_tag != clean_name:
                errors.append(f"Mismatched tag: opened <{last_tag}> on line {last_line}, closed with </{clean_name}> on line {line_num}")
    else:
        clean_name = tag_name.lower()
        if clean_name in VOID_ELEMENTS or is_self_closing or clean_name in {"polyline", "line"}:
            continue
        stack.append((clean_name, line_num))

for open_tag, line_num in stack:
    errors.append(f"Unclosed tag <{open_tag}> on line {line_num}")

if not errors:
    print("No HTML validation errors found!")
else:
    for err in errors:
        print(err)


