import sqlite3
import json
import os
import urllib.request
import zipfile
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

data_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(data_dir, 'dictionary.db')

print("Migrating JSONs to SQLite...")
if os.path.exists(db_path):
    os.remove(db_path)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute('''
CREATE TABLE words (
    word TEXT NOT NULL,
    category TEXT NOT NULL,
    PRIMARY KEY (word, category)
)
''')

categories = ['names', 'places', 'animals', 'things']
for cat in categories:
    json_path = os.path.join(data_dir, f"{cat}.json")
    if not os.path.exists(json_path):
        print(f"Skipping {cat}.json (not found)")
        continue
    
    with open(json_path, 'r', encoding='utf-8') as f:
        words = json.load(f)
    
    category_name = cat[:-1] # names -> name
    records = [(str(w), category_name) for w in set(words)]
    
    cursor.executemany('INSERT OR IGNORE INTO words (word, category) VALUES (?, ?)', records)
    print(f"Inserted {len(records)} into {category_name}")

cursor.execute('CREATE INDEX idx_category ON words(category)')

conn.commit()
conn.close()
print(f"Migration successful! Created {db_path}")

print("Downloading SQLite amalgamation...")
url = "https://www.sqlite.org/2024/sqlite-amalgamation-3460000.zip"
zip_path = os.path.join(data_dir, "sqlite.zip")

try:
    urllib.request.urlretrieve(url, zip_path)
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(data_dir)

    src_dir = os.path.join(os.path.dirname(data_dir), "src")

    extracted_folder = os.path.join(data_dir, "sqlite-amalgamation-3460000")
    os.replace(os.path.join(extracted_folder, "sqlite3.c"), os.path.join(src_dir, "sqlite3.c"))
    os.replace(os.path.join(extracted_folder, "sqlite3.h"), os.path.join(src_dir, "sqlite3.h"))

    print("SQLite downloaded and placed in src/")
except Exception as e:
    print(f"Error downloading sqlite: {e}")
