import { DeepLTranslator } from "../translator";
import { LanguageCode, TranslationOptions, LANGUAGE_NAMES } from "../types";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

/**
 * Print all available languages
 * @param translator DeepL translator instance
 */
function printAvailableLanguages(translator: DeepLTranslator): void {
  console.log("\n✅ Available languages:");

  const languages = translator.getSupportedLanguageNameMap();
  const languageCodes = translator.getSupportedLanguages();

  languageCodes.forEach((code) => {
    console.log(`- ${code}: ${languages[code]}`);
  });
}

/**
 * Translate given text to specified languages
 * @param translator DeepL translator instance
 * @param text Text to translate
 * @param sourceLanguage Source language code
 * @param targetLanguages Array of target language codes
 */
async function translateToMultipleLanguages(
  translator: DeepLTranslator,
  text: string,
  sourceLanguage: LanguageCode,
  targetLanguages: LanguageCode[]
): Promise<void> {
  console.log(`\n📝 Original text (${sourceLanguage}): "${text}"`);

  for (const targetLang of targetLanguages) {
    try {
      // Change translation options for current target language
      const options: TranslationOptions = {
        sourceLanguage,
        targetLanguage: targetLang,
        autoDetect: false,
        useCache: true,
      };

      // Create new translator instance (alternatively could update existing instance settings)
      const langTranslator = new DeepLTranslator(
        options,
        translator["apiKey"],
        translator["apiUrl"]
      );

      // Perform translation
      console.log(`🔄 Translating to '${LANGUAGE_NAMES[targetLang]}'...`);
      const result = await langTranslator.translate(text);

      // Print result
      console.log(
        `✅ ${LANGUAGE_NAMES[targetLang]}: "${result.translatedText}"`
      );
    } catch (error) {
      console.error(`❌ Translation to ${targetLang} failed:`, error);
    }
  }
}

async function main() {
  // Get API key from environment variable
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    console.error("❌ DeepL API key is not set.");
    console.error("💡 Please set DEEPL_API_KEY in your .env file.");
    process.exit(1);
  }

  // Set default translation options
  const options: TranslationOptions = {
    sourceLanguage: "ko",
    targetLanguage: "en", // Default value, will translate to various languages below
    autoDetect: true,
    useCache: true,
  };

  // Create DeepL translator
  const translator = new DeepLTranslator(options, apiKey);

  // Print available languages
  printAvailableLanguages(translator);

  // Example texts to translate
  const textsToTranslate = [
    "안녕하세요, 오늘은 날씨가 좋네요.",
    "변수 {name}는 중요한 값입니다.",
    "이 {product}의 가격은 {price}원입니다.",
  ];

  // Select target languages (example)
  const targetLanguages: LanguageCode[] = [
    "en",
    "ja",
    "zh-Hans",
    "fr",
    "de",
    "es",
  ];

  // Translate each text to multiple languages
  for (const text of textsToTranslate) {
    await translateToMultipleLanguages(translator, text, "ko", targetLanguages);
  }

  console.log("\n✨ All translations completed.");
}

// Run script
main().catch((error) => console.error("❌ Error occurred:", error));
