const fs = require("fs");
const fetch = require("node-fetch");

// LibreTranslate endpoint
const API_URL = "https://libretranslate.com/translate";

// Recursive çeviri fonksiyonu
async function translateValue(value, sourceLang, targetLang) {
  if (typeof value === "string") {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          q: value,
          source: sourceLang,
          target: targetLang,
          format: "text"
        }),
        headers: { "Content-Type": "application/json" }
      });

      const data = await response.json();
      return data.translatedText || value; // boş dönerse orijinali koru
    } catch (e) {
      console.error("Çeviri hatası:", e);
      return value;
    }
  } else if (typeof value === "object" && value !== null) {
    const translatedObj = {};
    for (const key in value) {
      translatedObj[key] = await translateValue(value[key], sourceLang, targetLang);
    }
    return translatedObj;
  }
  return value;
}

async function translateJSON(inputFile, sourceLang, targetLang, outputFile) {
  const json = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  const result = await translateValue(json, sourceLang, targetLang);

  fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf8");
  console.log(`Çeviri bitti → ${outputFile}`);
}

// Kullanım
translateJSON(
  "plugins/i18n/locales/en.json", // kaynak
  "en",                          // kaynak dil
  "tr",                          // hedef dil
  "plugins/i18n/locales/tr.json"  // çıktı
);
