import { DeepLTranslator } from "../translator";
import { TranslationOptions } from "../types";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

async function main() {
  // Get API key from environment variable
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    console.error("❌ DeepL API key is not set.");
    console.error("💡 Please set DEEPL_API_KEY in your .env file.");
    process.exit(1);
  }

  // Set translation options
  const options: TranslationOptions = {
    sourceLanguage: "ko",
    targetLanguage: "en",
    autoDetect: true,
    useCache: true,
  };

  // Create DeepL translator
  const translator = new DeepLTranslator(options, apiKey);

  // Example translations with context
  const translationsWithContext = [
    { key: "item_count", text: "{count}개", expectedResult: "{count} items" },
    { key: "dog_count", text: "{count}마리", expectedResult: "{count} dogs" },
    {
      key: "person_count",
      text: "{count}명",
      expectedResult: "{count} people",
    },
    {
      key: "delete_confirmation",
      text: "정말 삭제하시겠습니까?",
      expectedResult: "Are you sure you want to delete?",
    },
  ];

  console.log("🧪 Testing translation with context (key as context):\n");

  // Translate each text with and without context for comparison
  for (const { key, text, expectedResult } of translationsWithContext) {
    try {
      console.log(`🔑 Key: "${key}"`);
      console.log(`📝 Original text: "${text}"`);

      // Translate without context
      console.log(`🔄 Translating without context...`);
      const resultWithoutContext = await translator.translate(text);
      console.log(
        `✅ Without context: "${resultWithoutContext.translatedText}"`
      );

      // Translate with context (using key)
      console.log(`🔄 Translating with context (key: ${key})...`);
      const resultWithContext = await translator.translate(text, key);
      console.log(`✅ With context: "${resultWithContext.translatedText}"`);

      // Show expected result for comparison
      console.log(`🎯 Expected result: "${expectedResult}"`);
      console.log("-------------------------------------------\n");
    } catch (error) {
      console.error(`❌ Translation failed: ${error}`);
    }
  }

  console.log("✨ Translation tests completed.");
}

// Run script
main().catch((error) => console.error("❌ Error occurred:", error));
