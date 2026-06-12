const fs = require('fs');
const path = 'd:/New One/think-and-type/server/data/dictionary.json';

try {
    let data = fs.readFileSync(path, 'utf8');
    let dict = JSON.parse(data);

    if (!dict.names.includes('lemon')) {
        dict.names.push('lemon');
    }
    if (!dict.names.includes('lay')) {
        dict.names.push('lay');
    }

    // Sort names to keep it tidy
    dict.names.sort();

    fs.writeFileSync(path, JSON.stringify(dict));
    console.log('Successfully added lemon and lay to the dictionary.');
} catch (e) {
    console.error(e);
}
