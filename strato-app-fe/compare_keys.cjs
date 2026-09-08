const fs = require('fs');

const foundKeys = JSON.parse(fs.readFileSync('found_keys.json', 'utf8'));
const enPath = 'src\\Fidoo\\arborist-service\\src\\main\\resources\\dataseed\\locales_en.json';
const csPath = 'src\\Fidoo\\arborist-service\\src\\main\\resources\\dataseed\\locales_cs.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const cs = JSON.parse(fs.readFileSync(csPath, 'utf8'));

const missingEn = {};
const missingCs = {};

foundKeys.forEach(item => {
    if (!en.translations[item.key]) {
        missingEn[item.key] = item.defaultValue;
    }
    if (!cs.translations[item.key]) {
        missingCs[item.key] = item.defaultValue;
    }
});

fs.writeFileSync('missing_keys.json', JSON.stringify({ missingEn, missingCs }, null, 2));
console.log('Written to missing_keys.json');
