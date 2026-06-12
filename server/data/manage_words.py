import sqlite3
import sys
import os

def usage():
    print("Usage:")
    print("  python manage_words.py add <category> <word>")
    print("  python manage_words.py remove <category> <word>")
    print("\nValid categories: name, place, animal, thing")
    sys.exit(1)

if len(sys.argv) < 4:
    usage()

action = sys.argv[1].lower()
category = sys.argv[2].lower()
word = sys.argv[3].lower()

if action not in ["add", "remove"] or category not in ["name", "place", "animal", "thing"]:
    usage()

data_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(data_dir, 'dictionary.db')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

if action == "add":
    try:
        cursor.execute("INSERT INTO words (word, category) VALUES (?, ?)", (word, category))
        conn.commit()
        print(f"Successfully added '{word}' to category '{category}'.")
    except sqlite3.IntegrityError:
        print(f"The word '{word}' already exists in category '{category}'.")
elif action == "remove":
    cursor.execute("DELETE FROM words WHERE word = ? AND category = ?", (word, category))
    if cursor.rowcount > 0:
        conn.commit()
        print(f"Successfully removed '{word}' from category '{category}'.")
    else:
        print(f"The word '{word}' was not found in category '{category}'.")

conn.close()
