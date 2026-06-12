const fs = require('fs');
const path = 'd:/New One/think-and-type/server/data/dictionary.json';

try {
    let data = fs.readFileSync(path, 'utf8');
    let dict = JSON.parse(data);

    let index = dict.names.indexOf('early');
    if (index !== -1) {
        dict.names.splice(index, 1);
        fs.writeFileSync(path, JSON.stringify(dict));
        console.log('Successfully removed "early" from the dictionary names.');
    } else {
        console.log('"early" not found in names.');
    }
} catch (e) {
    console.error(e);
}
