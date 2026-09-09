import json

with open('src/shared/locales/en.json', 'r', encoding='utf-8') as f:
    en = json.load(f)

with open('src/shared/locales/es.json', 'r', encoding='utf-8') as f:
    es = json.load(f)

def get_keys(dt, prefix=''):
    keys = set()
    for k, v in dt.items():
        if isinstance(v, dict):
            keys.update(get_keys(v, prefix + k + '.'))
        else:
            keys.add(prefix + k)
    return keys

en_keys = get_keys(en)
es_keys = get_keys(es)

missing_in_en = es_keys - en_keys

print("Missing in en.json:")
for k in sorted(missing_in_en):
    print(k)
