import urllib.request
import json
import csv
import re
import io
import os
import sys

def fetch(url, encoding='utf-8', timeout=30):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode(encoding, errors='replace')

def clean(w):
    # Strip leading/trailing whitespace, lowercase
    # Allow letters, spaces, hyphens (for multi-word names/places)
    w = w.strip().lower()
    # Remove entries that are clearly non-word junk
    if not w or len(w) < 2:
        return None
    # Remove entries with digits or special chars (except hyphen/space/apostrophe)
    if re.search(r'[^a-z\- \']', w):
        return None
    return w

def clean_multiword(w):
    """Allow multi-word names (cities, places, names with spaces)"""
    w = w.strip().lower()
    if not w or len(w) < 2:
        return None
    if re.search(r'[^a-z\- \'\.]', w):
        return None
    return w

print("=" * 60)
print("Building comprehensive Think & Type dictionary")
print("=" * 60)

names = set()
places = set()
animals = set()
things = set()

# ─────────────────────────────────────────────────────────────
# NAMES
# ─────────────────────────────────────────────────────────────
print("\n[NAMES] Fetching from multiple sources...")

# Source 1: dominictarr random-name
try:
    data = fetch("https://raw.githubusercontent.com/dominictarr/random-name/master/first-names.txt")
    for line in data.splitlines():
        w = clean(line)
        if w: names.add(w)
    print(f"  Source 1 (dominictarr): {len(names)} names")
except Exception as e:
    print(f"  Source 1 failed: {e}")

# Source 2: huntergregal wordlists names
try:
    data = fetch("https://raw.githubusercontent.com/huntergregal/wordlists/master/names.txt")
    before = len(names)
    for line in data.splitlines():
        w = clean(line)
        if w: names.add(w)
    print(f"  Source 2 (huntergregal): +{len(names)-before} = {len(names)} names")
except Exception as e:
    print(f"  Source 2 failed: {e}")

# Source 3: hadley baby names CSV
try:
    data = fetch("https://raw.githubusercontent.com/hadley/data-baby-names/master/baby-names.csv")
    before = len(names)
    reader = csv.reader(data.splitlines())
    next(reader)
    for row in reader:
        if len(row) > 1:
            w = clean(row[1])
            if w: names.add(w)
    print(f"  Source 3 (baby-names): +{len(names)-before} = {len(names)} names")
except Exception as e:
    print(f"  Source 3 failed: {e}")

# Source 4: first names from Open Data — philipperemy name-dataset (first 5k lines)
try:
    data = fetch("https://raw.githubusercontent.com/smashew/NameDatabases/master/NamesDatabases/first%20names/all.txt")
    before = len(names)
    for line in data.splitlines():
        w = clean(line)
        if w and len(w) >= 2: names.add(w)
    print(f"  Source 4 (NameDatabases all): +{len(names)-before} = {len(names)} names")
except Exception as e:
    print(f"  Source 4 failed: {e}")

# Source 5: US Census first names
try:
    # Male names
    data = fetch("https://raw.githubusercontent.com/smashew/NameDatabases/master/NamesDatabases/first%20names/us.txt")
    before = len(names)
    for line in data.splitlines():
        w = clean(line)
        if w: names.add(w)
    print(f"  Source 5 (US names): +{len(names)-before} = {len(names)} names")
except Exception as e:
    print(f"  Source 5 failed: {e}")

# Source 6: Global surnames as person names
try:
    data = fetch("https://raw.githubusercontent.com/smashew/NameDatabases/master/NamesDatabases/surnames/all.txt")
    before = len(names)
    for line in data.splitlines():
        w = clean(line)
        if w and len(w) >= 2: names.add(w)
    print(f"  Source 6 (global surnames): +{len(names)-before} = {len(names)} names")
except Exception as e:
    print(f"  Source 6 failed: {e}")

# Source 7: Indian names
try:
    data = fetch("https://raw.githubusercontent.com/smashew/NameDatabases/master/NamesDatabases/first%20names/in.txt")
    before = len(names)
    for line in data.splitlines():
        w = clean(line)
        if w: names.add(w)
    print(f"  Source 7 (Indian names): +{len(names)-before} = {len(names)} names")
except Exception as e:
    print(f"  Source 7 failed: {e}")

# Source 8: UK names
try:
    data = fetch("https://raw.githubusercontent.com/smashew/NameDatabases/master/NamesDatabases/first%20names/gb.txt")
    before = len(names)
    for line in data.splitlines():
        w = clean(line)
        if w: names.add(w)
    print(f"  Source 8 (UK names): +{len(names)-before} = {len(names)} names")
except Exception as e:
    print(f"  Source 8 failed: {e}")

# Source 9: More international names
for country_code in ['fr', 'de', 'es', 'it', 'br', 'ru', 'cn', 'jp', 'ar', 'mx', 'au', 'ca', 'ng', 'pk', 'id', 'tr']:
    try:
        data = fetch(f"https://raw.githubusercontent.com/smashew/NameDatabases/master/NamesDatabases/first%20names/{country_code}.txt")
        before = len(names)
        for line in data.splitlines():
            w = clean(line)
            if w: names.add(w)
        if len(names) - before > 0:
            print(f"  Source 9 ({country_code}): +{len(names)-before} = {len(names)} names")
    except:
        pass

# Exclude non-name words
names_exclude = {
    "violet", "pink", "good", "graps", "yellow", "green", "blue", "purple",
    "orange", "white", "black", "brown", "grey", "gray", "red", "silver", "gold",
    "access", "accounting", "action", "true", "false", "null", "none",
    "the", "and", "or", "for", "not", "with", "from", "this", "that"
}
names = {n for n in names if n not in names_exclude and len(n) >= 2}
print(f"\n  ✓ TOTAL NAMES: {len(names)}")

# ─────────────────────────────────────────────────────────────
# PLACES
# ─────────────────────────────────────────────────────────────
print("\n[PLACES] Fetching from multiple sources...")

# Source 1: countries JSON (common name, official name, capitals)
try:
    data = fetch("https://raw.githubusercontent.com/mledoze/countries/master/countries.json")
    before = len(places)
    country_data = json.loads(data)
    for c in country_data:
        if 'name' in c:
            if 'common' in c['name']:
                w = clean_multiword(c['name']['common'])
                if w: places.add(w)
            if 'official' in c['name']:
                w = clean_multiword(c['name']['official'])
                if w: places.add(w)
        if 'capital' in c:
            for cap in c['capital']:
                w = clean_multiword(cap)
                if w: places.add(w)
        # Also add native names
        if 'translations' in c:
            for lang, trans in c['translations'].items():
                if 'common' in trans:
                    w = clean_multiword(trans['common'])
                    if w and len(w) >= 3: places.add(w)
    print(f"  Source 1 (countries+translations): +{len(places)-before} = {len(places)} places")
except Exception as e:
    print(f"  Source 1 failed: {e}")

# Source 2: world cities (large dataset)
try:
    data = fetch("https://raw.githubusercontent.com/datasets/world-cities/master/data/world-cities.csv")
    before = len(places)
    reader = csv.reader(data.splitlines())
    next(reader)
    for row in reader:
        if row:
            for field in row[:3]:  # city, country, subcountry
                w = clean_multiword(field)
                if w and len(w) >= 2: places.add(w)
    print(f"  Source 2 (world-cities CSV): +{len(places)-before} = {len(places)} places")
except Exception as e:
    print(f"  Source 2 failed: {e}")

# Source 3: US cities
try:
    data = fetch("https://raw.githubusercontent.com/grammakov/USA-cities-and-states/master/us_cities_states_counties.csv")
    before = len(places)
    reader = csv.reader(data.splitlines(), delimiter='|')
    next(reader)
    for row in reader:
        if row:
            w = clean_multiword(row[0])
            if w: places.add(w)
            if len(row) > 1:
                w = clean_multiword(row[1])
                if w: places.add(w)
    print(f"  Source 3 (US cities/states): +{len(places)-before} = {len(places)} places")
except Exception as e:
    print(f"  Source 3 failed: {e}")

# Source 4: Simplemaps world cities (basic free version)
try:
    data = fetch("https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json")
    before = len(places)
    cities = json.loads(data)
    for city in cities:
        if 'name' in city:
            w = clean_multiword(city['name'])
            if w: places.add(w)
        if 'country' in city:
            w = clean_multiword(city['country'])
            if w: places.add(w)
    print(f"  Source 4 (lutangar cities.json): +{len(places)-before} = {len(places)} places")
except Exception as e:
    print(f"  Source 4 failed: {e}")

# Source 5: Indian cities and states
try:
    data = fetch("https://raw.githubusercontent.com/sab99r/Indian-Cities/master/cities.csv")
    before = len(places)
    reader = csv.reader(data.splitlines())
    next(reader)
    for row in reader:
        if row:
            w = clean_multiword(row[0])
            if w: places.add(w)
    print(f"  Source 5 (Indian cities): +{len(places)-before} = {len(places)} places")
except Exception as e:
    print(f"  Source 5 failed: {e}")

# Source 6: Countries ISO list
try:
    data = fetch("https://raw.githubusercontent.com/umpirsky/country-list/master/data/en_US/country.json")
    before = len(places)
    countries = json.loads(data)
    for code, name in countries.items():
        w = clean_multiword(name)
        if w: places.add(w)
    print(f"  Source 6 (ISO countries en): +{len(places)-before} = {len(places)} places")
except Exception as e:
    print(f"  Source 6 failed: {e}")

# Source 7: Additional city list
try:
    data = fetch("https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/cities.json")
    before = len(places)
    cities = json.loads(data)
    for c in cities:
        w = clean_multiword(c.get('name', ''))
        if w: places.add(w)
    print(f"  Source 7 (dr5hn cities): +{len(places)-before} = {len(places)} places")
except Exception as e:
    print(f"  Source 7 failed: {e}")

# Source 8: States of the world
try:
    data = fetch("https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/states.json")
    before = len(places)
    states = json.loads(data)
    for s in states:
        w = clean_multiword(s.get('name', ''))
        if w: places.add(w)
    print(f"  Source 8 (world states/provinces): +{len(places)-before} = {len(places)} places")
except Exception as e:
    print(f"  Source 8 failed: {e}")

print(f"\n  ✓ TOTAL PLACES: {len(places)}")

# ─────────────────────────────────────────────────────────────
# ANIMALS
# ─────────────────────────────────────────────────────────────
print("\n[ANIMALS] Fetching from multiple sources...")

# Source 1: skjorrface animals.txt
try:
    data = fetch("https://raw.githubusercontent.com/skjorrface/animals.txt/master/animals.txt")
    before = len(animals)
    for line in data.splitlines():
        w = clean_multiword(line)
        if w: animals.add(w)
    print(f"  Source 1 (skjorrface): {len(animals)} animals")
except Exception as e:
    print(f"  Source 1 failed: {e}")

# Source 2: awesomedata animals
try:
    data = fetch("https://raw.githubusercontent.com/jbrooksuk/JSON-Ipsum/master/data/animals.json")
    before = len(animals)
    animal_list = json.loads(data)
    for a in animal_list:
        w = clean_multiword(a)
        if w: animals.add(w)
    print(f"  Source 2 (JSON-Ipsum): +{len(animals)-before} = {len(animals)} animals")
except Exception as e:
    print(f"  Source 2 failed: {e}")

# Source 3: Large animal list from kjbekkelund
try:
    data = fetch("https://raw.githubusercontent.com/kjbekkelund/js-animal-list/master/animals.js")
    before = len(animals)
    # Extract strings from JS array
    found = re.findall(r'"([^"]+)"', data)
    for a in found:
        w = clean_multiword(a)
        if w: animals.add(w)
    print(f"  Source 3 (kjbekkelund): +{len(animals)-before} = {len(animals)} animals")
except Exception as e:
    print(f"  Source 3 failed: {e}")

# Source 4: Comprehensive animals list
try:
    data = fetch("https://raw.githubusercontent.com/nicholasgasior/gsfmt/master/animals.go")
    before = len(animals)
    found = re.findall(r'"([A-Za-z][a-z ]+)"', data)
    for a in found:
        w = clean_multiword(a)
        if w and len(w) >= 3: animals.add(w)
    print(f"  Source 4 (gsfmt): +{len(animals)-before} = {len(animals)} animals")
except Exception as e:
    print(f"  Source 4 failed: {e}")

# Source 5: animalia-data comprehensive list
try:
    data = fetch("https://raw.githubusercontent.com/cheeaun/taxedo/master/data/animals.txt")
    before = len(animals)
    for line in data.splitlines():
        w = clean_multiword(line.strip())
        if w and len(w) >= 3: animals.add(w)
    print(f"  Source 5 (taxedo): +{len(animals)-before} = {len(animals)} animals")
except Exception as e:
    print(f"  Source 5 failed: {e}")

# Source 6: Another large animal list
try:
    data = fetch("https://raw.githubusercontent.com/perborgen/random-animals/master/animals.js")
    before = len(animals)
    found = re.findall(r"'([A-Za-z][a-z ]+)'", data)
    for a in found:
        w = clean_multiword(a)
        if w: animals.add(w)
    print(f"  Source 6 (random-animals): +{len(animals)-before} = {len(animals)} animals")
except Exception as e:
    print(f"  Source 6 failed: {e}")

# Source 7: Verney animals
try:
    data = fetch("https://raw.githubusercontent.com/babelfish/animals/master/data/animals.txt")
    before = len(animals)
    for line in data.splitlines():
        w = clean_multiword(line)
        if w: animals.add(w)
    print(f"  Source 7 (babelfish): +{len(animals)-before} = {len(animals)} animals")
except Exception as e:
    print(f"  Source 7 failed: {e}")

# Manual comprehensive additions — common animals known worldwide
manual_animals = [
    # Mammals
    "aardvark", "aardwolf", "addax", "african buffalo", "african elephant",
    "african wild dog", "albatross", "alligator", "alpaca", "american bison",
    "anaconda", "anteater", "antelope", "ape", "arctic fox", "arctic hare",
    "arctic wolf", "armadillo", "asiatic lion", "ass", "aye-aye",
    "baboon", "badger", "bandicoot", "bat", "bear", "beaver", "binturong",
    "bison", "black bear", "black mamba", "black panther", "black rhinoceros",
    "blue whale", "boar", "bobcat", "bonobo", "brown bear", "buffalo",
    "bull", "bunny", "burro", "bushbaby",
    "caiman", "camel", "capybara", "caracal", "caribou", "cassowary",
    "cat", "catfish", "cheetah", "chicken", "chimpanzee", "chinchilla",
    "chipmunk", "clam", "cobra", "cockroach", "cod", "condor", "coral",
    "cougar", "cow", "coyote", "crab", "crane", "crocodile", "crow",
    "cuttlefish",
    "dhole", "dingo", "dog", "dolphin", "donkey", "dormouse", "dragonfly",
    "dromedary", "duck", "dugong", "dung beetle",
    "eagle", "echidna", "eel", "elephant", "elephant seal", "elk", "emu",
    "falcon", "fallow deer", "fennec fox", "ferret", "flamingo", "flying fox",
    "flying squirrel", "fox", "frog", "fruit bat",
    "gazelle", "gecko", "gerbil", "giant anteater", "giant panda",
    "giraffe", "goat", "golden eagle", "golden retriever", "goldfish",
    "gorilla", "grasshopper", "great dane", "grizzly bear", "groundhog",
    "guanaco", "guinea pig", "hammerhead shark", "hamster", "hare",
    "harpy eagle", "hedgehog", "hippopotamus", "honey badger", "horse",
    "howler monkey", "hyena",
    "ibis", "iguana", "impala",
    "jackal", "jaguar", "jellyfish",
    "kangaroo", "kangaroo rat", "king cobra", "koala", "komodo dragon",
    "kookaburra", "kudu",
    "lemur", "leopard", "lion", "lizard", "llama", "lobster", "lynx",
    "macaw", "mako shark", "manatee", "mandrill", "manta ray", "marmoset",
    "meerkat", "mole", "mongoose", "monkey", "moose", "mouse", "mule",
    "musk ox", "muskrat", "narwhal", "nilgai", "numbat",
    "ocelot", "octopus", "okapi", "opossum", "orangutan", "orca",
    "ostrich", "otter", "owl", "ox",
    "panda", "pangolin", "panther", "parrot", "peafowl", "pelican",
    "penguin", "pig", "pigeon", "piranha", "platypus", "polar bear",
    "porcupine", "porpoise", "prairie dog", "praying mantis", "puma",
    "python",
    "quail", "quokka",
    "rabbit", "raccoon", "rat", "raven", "red deer", "red fox", "red panda",
    "reindeer", "rhinoceros", "roadrunner",
    "salamander", "salmon", "sand cat", "scorpion", "sea horse", "sea lion",
    "sea turtle", "seahorse", "seal", "serval", "shark", "sheep",
    "skunk", "sloth", "sloth bear", "slow loris", "snow leopard",
    "snowshoe hare", "spider", "spider monkey", "springbok", "squid",
    "squirrel", "starfish", "stingray", "sun bear", "swan",
    "tapir", "tarantula", "thylacine", "tiger", "toad", "tortoise",
    "toucan", "turkey", "turtle",
    "vicuna", "viper", "vole", "vulture",
    "walrus", "warthog", "water buffalo", "weasel", "whale", "wild boar",
    "wildebeest", "wolf", "wombat", "woodpecker", "wolverine",
    "yak", "zebra",
    # Birds
    "finch", "sparrow", "robin", "bluejay", "cardinal", "mockingbird",
    "hummingbird", "woodpecker", "nuthatch", "chickadee", "wren",
    "starling", "blackbird", "swallow", "swift", "martin", "kingfisher",
    "heron", "egret", "stork", "ibis", "spoonbill", "frigate", "gannet",
    "booby", "tropicbird", "petrel", "shearwater", "skua", "tern",
    "gull", "puffin", "murre", "cormorant", "anhinga", "darter",
    "kite", "buzzard", "harrier", "osprey", "kestrel", "merlin",
    "hobby", "peregrine",
    # Fish
    "bass", "carp", "catfish", "clownfish", "cuttlefish", "flounder",
    "grouper", "halibut", "herring", "mackerel", "minnow", "mullet",
    "perch", "pike", "ray", "sardine", "sole", "swordfish", "tilapia",
    "trout", "tuna", "wahoo",
    # Reptiles
    "chameleon", "gecko", "monitor lizard", "skink", "tuatara",
    # Insects
    "ant", "bee", "beetle", "butterfly", "cicada", "cricket", "firefly",
    "fly", "gnat", "grasshopper", "hornet", "ladybug", "locust",
    "millipede", "mosquito", "moth", "slug", "snail", "termite",
    "tick", "wasp", "worm",
    # Sea creatures
    "anemone", "barnacle", "clam", "coral", "crayfish", "krill",
    "mussel", "nautilus", "oyster", "prawn", "shrimp", "starfish",
    "swordfish", "urchin", "whale shark",
]
before = len(animals)
for a in manual_animals:
    w = clean_multiword(a)
    if w: animals.add(w)
print(f"  Manual additions: +{len(animals)-before} = {len(animals)} animals")

print(f"\n  ✓ TOTAL ANIMALS: {len(animals)}")

# ─────────────────────────────────────────────────────────────
# THINGS / OBJECTS
# ─────────────────────────────────────────────────────────────
print("\n[THINGS] Fetching from multiple sources...")

# Source 1: ENABLE1 word list (standard Scrabble dictionary)
try:
    data = fetch("https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt")
    before = len(things)
    for line in data.splitlines():
        w = clean(line)
        if w: things.add(w)
    print(f"  Source 1 (ENABLE1): {len(things)} words")
except Exception as e:
    print(f"  Source 1 failed: {e}")

# Source 2: TWL06 (Tournament Word List)
try:
    data = fetch("https://raw.githubusercontent.com/lorenbrichter/Words/master/Words/en.txt")
    before = len(things)
    for line in data.splitlines():
        w = clean(line)
        if w: things.add(w)
    print(f"  Source 2 (lorenbrichter/Words): +{len(things)-before} = {len(things)} words")
except Exception as e:
    print(f"  Source 2 failed: {e}")

# Source 3: Collins Scrabble Words list
try:
    data = fetch("https://raw.githubusercontent.com/jesstess/Scrabble/master/scrabble/sowpods.txt")
    before = len(things)
    for line in data.splitlines():
        w = clean(line)
        if w: things.add(w)
    print(f"  Source 3 (sowpods): +{len(things)-before} = {len(things)} words")
except Exception as e:
    print(f"  Source 3 failed: {e}")

# Source 4: Common English nouns
try:
    data = fetch("https://raw.githubusercontent.com/hugsy/stuff/main/random-word/english-nouns.txt")
    before = len(things)
    for line in data.splitlines():
        w = clean(line)
        if w: things.add(w)
    print(f"  Source 4 (english-nouns): +{len(things)-before} = {len(things)} words")
except Exception as e:
    print(f"  Source 4 failed: {e}")

# Source 5: Another English word list
try:
    data = fetch("https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt")
    before = len(things)
    for line in data.splitlines():
        w = clean(line)
        if w: things.add(w)
    print(f"  Source 5 (google-10000): +{len(things)-before} = {len(things)} words")
except Exception as e:
    print(f"  Source 5 failed: {e}")

# Source 6: More words
try:
    data = fetch("https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt")
    before = len(things)
    count = 0
    for line in data.splitlines():
        w = clean(line)
        if w and len(w) >= 2:
            things.add(w)
            count += 1
    print(f"  Source 6 (dwyl/english-words): +{len(things)-before} = {len(things)} words")
except Exception as e:
    print(f"  Source 6 failed: {e}")

# Source 7: Household items, objects, etc — manual comprehensive list
manual_things = [
    # Household items
    "abacus", "accordion", "adhesive", "air conditioner", "alarm clock",
    "album", "amplifier", "anchor", "anvil", "apron", "aquarium", "armchair",
    "atlas", "awl", "axe",
    "backpack", "bag", "bagpipe", "balloon", "bandage", "banjo", "banner",
    "barrel", "basket", "battery", "bed", "bench", "bicycle", "binoculars",
    "blanket", "blender", "blinds", "book", "boot", "bottle", "bowl",
    "box", "broom", "brush", "bucket", "bulb", "button",
    "cabinet", "cage", "calculator", "camera", "candle", "canvas", "carpet",
    "cart", "carton", "chair", "charger", "chest", "chisel", "clock",
    "coat", "comb", "compass", "computer", "cooker", "cord", "couch",
    "crate", "crayon", "cup", "curtain", "cushion",
    "dagger", "dartboard", "desk", "dictionary", "dishwasher", "doll",
    "door", "drill", "drum", "dryer",
    "earphones", "easel", "envelope", "eraser",
    "fan", "fence", "file", "flashlight", "flask", "fork", "frame",
    "freezer", "fridge",
    "garbage", "gate", "generator", "glasses", "gloves", "glue", "guitar",
    "hammer", "hammock", "handbag", "hanger", "hat", "headphones", "helmet",
    "hose", "hutch",
    "iron", "ironing board",
    "jacket", "jar", "jug",
    "kettle", "keyboard", "knife",
    "ladder", "lamp", "laptop", "ladle", "latch", "lens", "locker",
    "mat", "mattress", "microwave", "mirror", "mixer", "mop", "mug",
    "nails", "needle", "notepad",
    "oven",
    "padlock", "paint", "palette", "pan", "pencil", "pen", "phone",
    "piano", "picture", "pillow", "pipe", "plate", "pliers", "pot",
    "printer", "purse",
    "rack", "radio", "rake", "razor", "remote", "rope", "ruler",
    "safe", "saw", "scale", "scissors", "screw", "shelf", "shoes",
    "shovel", "sink", "sofa", "speaker", "spoon", "stapler", "stool",
    "stove", "suitcase",
    "table", "tape", "television", "tongs", "toolkit", "torch", "towel",
    "tray", "trunk",
    "umbrella", "vacuum",
    "wallet", "wardrobe", "washing machine", "watch", "whisk", "window",
    # Food & drink
    "apple", "apricot", "artichoke", "asparagus", "avocado",
    "banana", "barley", "basil", "bean", "beef", "beet", "berry",
    "biscuit", "blueberry", "bread", "broccoli", "butter",
    "cabbage", "cake", "carrot", "cauliflower", "celery", "cheese",
    "cherry", "chocolate", "cider", "cinnamon", "clove", "coffee",
    "cookie", "corn", "crab", "cream", "cucumber", "cupcake",
    "curry",
    "doughnut", "dumpling",
    "egg", "eggplant",
    "fig", "fish", "flour",
    "garlic", "ginger", "grape", "grapefruit", "guava",
    "ham", "hazelnut", "honey",
    "ice cream",
    "jam", "juice",
    "kale", "kiwi",
    "lamb", "lemon", "lettuce", "lime", "lobster",
    "mango", "melon", "milk", "mushroom", "mustard",
    "noodle", "nut",
    "oat", "olive", "onion", "orange",
    "papaya", "pasta", "peach", "pear", "pepper", "pie", "pineapple",
    "pizza", "plum", "pomegranate", "pork", "potato", "prune",
    "radish", "raspberry", "rice",
    "salad", "salmon", "salt", "sausage", "soup", "spinach",
    "strawberry", "sugar",
    "tangerine", "tea", "tomato", "tuna",
    "vanilla", "vegetable", "vinegar",
    "walnut", "watermelon", "wheat", "wine",
    "yogurt",
    "zucchini",
    # Vehicles
    "airplane", "ambulance", "bicycle", "boat", "bulldozer", "bus",
    "cable car", "canoe", "car", "carriage", "cart", "catamaran",
    "cruise ship", "excavator", "ferry", "forklift", "helicopter",
    "jet", "kayak", "locomotive", "motorcycle", "plane", "rocket",
    "sailboat", "scooter", "ship", "skateboard", "sled", "submarine",
    "tanker", "taxi", "tractor", "train", "tram", "truck", "van",
    "yacht",
    # Sports & games
    "archery", "badminton", "baseball", "basketball", "boxing",
    "chess", "cricket", "cycling", "darts", "diving", "fencing",
    "football", "golf", "gymnastics", "hockey", "hurdles", "javelin",
    "judo", "karate", "lacrosse", "marathon", "netball", "polo",
    "rowing", "rugby", "shooting", "skating", "skiing", "soccer",
    "softball", "squash", "surfing", "swimming", "tennis", "triathlon",
    "volleyball", "weightlifting", "wrestling",
    # Tools & technology
    "antenna", "app", "battery", "cable", "chip", "circuit", "code",
    "compiler", "database", "device", "display", "drone", "engine",
    "filter", "fuse", "gadget", "gear", "grid", "hub", "internet",
    "laser", "lens", "lever", "magnet", "modem", "motor", "network",
    "oscillator", "plugin", "processor", "pulley", "pump", "radar",
    "relay", "resistor", "robot", "scanner", "server", "signal",
    "socket", "software", "switch", "terminal", "transformer",
    "transmitter", "turbine", "valve", "voltage", "wire",
    # Science / medical
    "acid", "alcohol", "alloy", "antigen", "atom", "bacteria", "cell",
    "chlorine", "chromosome", "compound", "crystal", "element", "enzyme",
    "fiber", "fossil", "fungus", "galaxy", "gas", "gel", "genome",
    "gravity", "hormone", "hydrogen", "isotope", "laser", "lens",
    "magnet", "membrane", "mineral", "molecule", "neutron", "nitrogen",
    "nucleus", "orbit", "oxygen", "ozone", "plasma", "polymer",
    "proton", "radiation", "resin", "salt", "serum", "sodium",
    "solvent", "spectrum", "starch", "steroid", "sulfur", "toxin",
    "vaccine", "virus", "vitamin",
    # Buildings & structures
    "airport", "arch", "arena", "attic", "auditorium", "avenue",
    "balcony", "barn", "basement", "bay", "bridge", "bungalow",
    "castle", "cathedral", "cellar", "chapel", "chimney", "church",
    "cinema", "citadel", "classroom", "clinic", "corridor",
    "dam", "dome", "dormitory", "driveway",
    "elevator", "embassy",
    "factory", "fortress", "fountain", "garage", "garden", "gate",
    "gymnasium",
    "hall", "hangar", "harbor", "highway", "hospital", "hostel", "hotel",
    "hut",
    "inn",
    "laboratory", "library", "lighthouse", "lobby",
    "market", "mansion", "memorial", "mill", "mosque", "motel",
    "museum",
    "observatory", "office", "orphanage",
    "palace", "pier", "plaza", "port", "prison", "pyramid",
    "road", "runway",
    "sanctuary", "school", "shed", "shelter", "skyscraper", "stadium",
    "staircase", "station", "street", "studio", "synagogue",
    "temple", "theater", "tower", "townhouse", "tunnel",
    "university",
    "vault", "village",
    "warehouse", "well",
]
before = len(things)
for t in manual_things:
    w = clean_multiword(t)
    if w: things.add(w)
print(f"  Manual additions: +{len(things)-before} = {len(things)} things")

print(f"\n  ✓ TOTAL THINGS: {len(things)}")

# ─────────────────────────────────────────────────────────────
# WRITE OUTPUT
# ─────────────────────────────────────────────────────────────
print("\n[OUTPUT] Writing dictionary.json...")

output = {
    "names": sorted(list(names)),
    "places": sorted(list(places)),
    "animals": sorted(list(animals)),
    "things": sorted(list(things))
}

output_path = "/home/claude/dictionary.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

size = os.path.getsize(output_path)
print(f"\n{'='*60}")
print(f"✓ Dictionary saved to {output_path}")
print(f"  Names:   {len(names):,}")
print(f"  Places:  {len(places):,}")
print(f"  Animals: {len(animals):,}")
print(f"  Things:  {len(things):,}")
print(f"  Total:   {sum(len(v) for v in output.values()):,} entries")
print(f"  File:    {size/1024/1024:.1f} MB")
print(f"{'='*60}")
