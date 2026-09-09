import json
import os

locales_dir = "/Users/oriera/cimsweb/src/shared/locales"
translations = {
    "ca.json": "Veure el progrés dels reptes del club",
    "de.json": "Club-Herausforderungsfortschritt anzeigen",
    "en.json": "View the club challenges progress",
    "es.json": "Ver el progreso de los retos del club",
    "eu.json": "Klubeko erronken aurrerapena ikusi",
    "fr.json": "Voir la progression des défis du club",
    "it.json": "Visualizza il progresso delle sfide del club",
    "ja.json": "クラブチャレンジの進捗を表示",
    "no.json": "Se fremdriften for klubbutfordringene",
    "pl.json": "Zobacz postęp wyzwań klubu",
    "pt.json": "Ver o progresso dos desafíos do clube",
    "ru.json": "Просмотреть прогресс клубных испытаний",
    "zh.json": "查看俱乐部挑战进度"
}

for filename, text in translations.items():
    filepath = os.path.join(locales_dir, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename} (not found)")
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if "clubs" in data and "challenges" in data["clubs"]:
        data["clubs"]["challenges"]["viewProgress"] = text
    else:
        print(f"Warning: Structure clubs.challenges not found in {filename}")
        # Try to find clubs top level and add challenges if missing? 
        # But based on my check it should be there.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

print("All translations updated.")
