import os
import re
import json

def extract_keys(directory):
    keys = set()
    regex = re.compile(r't\(["\']([^"\']+)["\']\)')
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = regex.findall(content)
                        for match in matches:
                            # Skip keys that contain interpolation or are variables
                            if '{' not in match and not match.startswith('`'):
                                keys.add(match)
                except:
                    pass
    return keys

code_keys = extract_keys('src')

with open('src/shared/locales/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)

def get_json_keys(dt, prefix=''):
    keys = set()
    for k, v in dt.items():
        if isinstance(v, dict):
            keys.update(get_json_keys(v, prefix + k + '.'))
        else:
            keys.add(prefix + k)
    return keys

en_keys = get_json_keys(en)

missing_keys = []
for k in code_keys:
    if k not in en_keys:
        missing_keys.append(k)

print(f"Total keys in code: {len(code_keys)}")
print(f"Total keys in en.json: {len(en_keys)}")
print(f"Missing keys in en.json: {len(missing_keys)}")
for k in sorted(missing_keys):
    # Try to find if it's a dynamic key (ends with primaryAction etc)
    if not any(x in k for x in ['primaryAction', 'status', 'type', 'id']):
        print(k)
