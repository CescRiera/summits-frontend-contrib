import json
import os

def flatten_json(y):
    out = {}
    def flatten(x, name=''):
        if type(x) is dict:
            if not x: # Handle empty dict
                out[name[:-1]] = {}
            for a in x:
                flatten(x[a], name + a + '.')
        else:
            out[name[:-1]] = x
    flatten(y)
    return out

def unflatten_json(d):
    out = {}
    for key, value in d.items():
        parts = key.split('.')
        curr = out
        for i in range(len(parts) - 1):
            if parts[i] not in curr:
                curr[parts[i]] = {}
            curr = curr[parts[i]]
        curr[parts[-1]] = value
    return out

def find_missing():
    locales_dir = r"c:\Users\crier\OneDrive\Documents\Cims\cimsweb\src\shared\locales"
    files = ["en.json", "es.json", "ca.json", "fr.json", "it.json"]
    
    data = {}
    flat_data = {}
    all_keys = set()
    
    for f in files:
        path = os.path.join(locales_dir, f)
        with open(path, 'r', encoding='utf-8') as jf:
            data[f] = json.load(jf)
            flat_data[f] = flatten_json(data[f])
            all_keys.update(flat_data[f].keys())
    
    sorted_keys = sorted(list(all_keys))
    
    for f in files:
        missing = []
        for key in sorted_keys:
            if key not in flat_data[f]:
                # Find a source value
                val = flat_data.get("en.json", {}).get(key)
                if val is None:
                    for other_f in files:
                        if key in flat_data[other_f]:
                            val = flat_data[other_f][key]
                            break
                missing.append((key, val))
        
        if missing:
            print(f"--- MISSING IN {f} ---")
            for key, val in missing:
                print(f"{key} ||| {val}")
            print("\n")

if __name__ == "__main__":
    find_missing()
