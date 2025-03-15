/**
 * ESM Module Compatibility Test Example
 *
 * How to run:
 * node --experimental-modules src/examples/esm-example.js
 */

// Use ESM module imports
import { DeepLTranslator } from "../index.js";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// __dirname replacement for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
config();

// Get DeepL API key
const apiKey = process.env.DEEPL_API_KEY;

if (!apiKey) {
  console.error("❌ DeepL API key is not configured.");
  console.error("💡 Please set DEEPL_API_KEY in your .env file.");
  process.exit(1);
}

async function runEsmExample() {
  console.log("🔄 Starting ESM module test...");

  try {
    // Create DeepL translator instance
    const translator = new DeepLTranslator(
      {
        sourceLanguage: "ko",
        targetLanguage: "en",
        autoDetect: false,
        useCache: true,
      },
      apiKey
    );

    // Execute translation
    const result = await translator.translate(
      "안녕하세요, ESM 모듈에서 호출합니다."
    );

    console.log("\n✅ Translation result:");
    console.log(`  Original: ${result.originalText}`);
    console.log(`  Translated: ${result.translatedText}`);
    console.log(`  Source language: ${result.sourceLanguage}`);
    console.log(`  Target language: ${result.targetLanguage}`);

    // Print supported languages list
    const languages = translator.getSupportedLanguages();
    console.log("\n📋 Supported languages:");
    console.log(languages.join(", "));

    console.log("\n✨ ESM module test completed!");
  } catch (error) {
    console.error(`❌ Error occurred: ${error.message}`);
  }
}

// Execute script
runEsmExample().catch((error) => {
  console.error("❌ Error during execution:", error);
});
