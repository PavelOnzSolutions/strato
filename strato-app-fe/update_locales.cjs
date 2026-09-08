const fs = require('fs');

const missingKeys = JSON.parse(fs.readFileSync('missing_keys.json', 'utf8'));
const enPath = 'src\\Fidoo\\arborist-service\\src\\main\\resources\\dataseed\\locales_en.json';
const csPath = 'src\\Fidoo\\arborist-service\\src\\main\\resources\\dataseed\\locales_cs.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const cs = JSON.parse(fs.readFileSync(csPath, 'utf8'));

// Updates for EN
Object.assign(en.translations, missingKeys.missingEn);

// Dictionary for CS
const csDict = {
    "Invalid JSON format": "Neplatný formát JSON",
    "Deployments": "Nasazení",
    "Version matrix": "Matice verzí",
    "Revoke": "Zneplatnit",
    "Hide User Sessions": "Skrýt relace uživatele",
    "Export Selected": "Exportovat vybrané",
    "Purge": "Vyčistit",
    "Label": "Popisek",
    "New Label": "Nový popisek",
    "New Key": "Nový klíč",
    "Blueprints": "Šablony",
    "Environment Name": "Název prostředí",
    "Subscription ID": "ID předplatného",
    "Select Region": "Vyberte region",
    "Resource Group": "Resource Group",
    "Document ID": "ID dokumentu",
    "Version History": "Historie verzí",
    "Delete Document": "Smazat dokument",
    "Select version to compare": "Vyberte verzi k porovnání",
    "Select a version...": "Vyberte verzi...",
    "Left": "Vlevo",
    "Right (Latest)": "Vpravo (Poslední)",
    "Configure Connection": "Konfigurace připojení",
    "Source Output": "Zdrojový výstup",
    "Target Input": "Cílový vstup",
    "Select output": "Vyberte výstup",
    "Select input": "Vyberte vstup",
    "Confirm": "Potvrdit",
    "Loading...": "Načítání...",
    "Resource Categories": "Kategorie zdrojů",
    "Export All": "Exportovat vše",
    "Color": "Barva",
    "Export As JSON": "Exportovat jako JSON",
    "No categories found": "Nebyly nalezeny žádné kategorie",
    "New Category": "Nová kategorie",
    "Enter the details for the new resource category.": "Zadejte podrobnosti pro novou kategorii zdrojů.",
    "Name": "Název",
    "Key": "Klíč",
    "Category Properties": "Vlastnosti kategorie",
    "Edit Category": "Upravit kategorii",
    "Update the details for this resource category.": "Aktualizujte podrobnosti pro tuto kategorii zdrojů.",
    "Define default property types by JSON path (dot-separated).": "Definujte výchozí typy vlastností pomocí cesty JSON (oddělené tečkou).",
    "Remove": "Odstranit",
    "Add Property": "Přidat vlastnost",
    "Done": "Hotovo",
    "Delete Categories": "Smazat kategorie",
    "Resources": "Zdroje",
    "Help": "Nápověda",
    "Type": "Typ",
    "Category": "Kategorie",
    "No resources found": "Nebyly nalezeny žádné zdroje",
    "Delete Resources": "Smazat zdroje",
    "New Resource": "Nový zdroj",
    "Edit Resource": "Upravit zdroj",
    "Invalid naming rule": "Neplatné pravidlo pojmenování",
    "Invalid length constraints": "Neplatná omezení délky",
    "Minimum length cannot exceed maximum length": "Minimální délka nemůže přesáhnout maximální délku",
    "System Class": "Systémová třída",
    "Abbreviation": "Zkratka",
    "Select Type": "Vyberte typ",
    "Icon": "Ikona",
    "Select Icon": "Vyberte ikonu",
    "Select Category": "Vyberte kategorii",
    "Template (JSON)": "Šablona (JSON)",
    "Outputs": "Výstupy",
    "Naming Rule": "Pravidlo pojmenování",
    "Set Defaults": "Nastavit výchozí",
    "Choose an icon for this resource.": "Vyberte ikonu pro tento zdroj.",
    "Naming Strategy": "Strategie pojmenování",
    "Define how resource instances will be named. Use variables in curly braces and text.": "Definujte, jak budou instance zdrojů pojmenovány. Použijte proměnné ve složených závorkách a text.",
    "Rule": "Pravidlo",
    "Minimum length": "Minimální délka",
    "Maximum length": "Maximální délka",
    "Forbidden characters": "Zakázané znaky",
    "Available variables": "Dostupné proměnné",
    "Resource Abbreviation": "Zkratka zdroje",
    "Environment name": "Název prostředí",
    "Resource instance name": "Název instance zdroje",
    "Region name": "Název regionu",
    "Short region name": "Zkratka regionu",
    "Random 5-character string": "Náhodný 5místný řetězec",
    "Apply": "Použít",
    "Set Default Values": "Nastavit výchozí hodnoty",
    "Define default values for each key in the template.": "Definujte výchozí hodnoty pro každý klíč v šabloně.",
    "Value": "Hodnota",
    "Resource Outputs": "Výstupy zdroje",
    "Resource Output Key": "Klíč výstupu zdroje",
    "ARM Output Name": "Název výstupu ARM",
    "Add Output": "Přidat výstup",
    "Edit JSON": "Upravit JSON"
};

// Updates for CS
Object.keys(missingKeys.missingCs).forEach(key => {
    const defaultVal = missingKeys.missingCs[key];
    const translated = csDict[defaultVal] || defaultVal;
    cs.translations[key] = translated;
});

// Sort keys for better diffs
const sortedEn = { ...en, translations: Object.keys(en.translations).sort().reduce((obj, key) => { obj[key] = en.translations[key]; return obj; }, {}) };
const sortedCs = { ...cs, translations: Object.keys(cs.translations).sort().reduce((obj, key) => { obj[key] = cs.translations[key]; return obj; }, {}) };

fs.writeFileSync(enPath, JSON.stringify(sortedEn, null, 2));
fs.writeFileSync(csPath, JSON.stringify(sortedCs, null, 2));

console.log('Updated locale files.');
