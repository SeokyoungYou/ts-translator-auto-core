/**
 * CommonJS Module Compatibility Test Example
 *
 * How to run:
 * node src/examples/cjs-example.cjs
 */

// Use CommonJS module imports
const { DeepLTranslator } = require("../index.cjs");
const { config } = require("dotenv");
const path = require("path");

// Load .env file
config();

// Get DeepL API key
const apiKey = process.env.DEEPL_API_KEY;

if (!apiKey) {
  console.error("❌ DeepL API key is not configured.");
  console.error("💡 Please set DEEPL_API_KEY in your .env file.");
  process.exit(1);
}

async function runCjsExample() {
  console.log("🔄 Starting CommonJS module test...");

  try {
    // Create DeepL translator instance
    const translator = new DeepLTranslator(
      {
        sourceLanguage: "ko",
        targetLanguage: "ja",
        autoDetect: false,
        useCache: true,
      },
      apiKey
    );

    // Execute translation
    const result = await translator.translate(
      "안녕하세요, CommonJS 모듈에서 호출합니다."
    );

    console.log("\n✅ Translation result:");
    console.log(`  Original: ${result.originalText}`);
    console.log(`  Translated: ${result.translatedText}`);
    console.log(`  Source language: ${result.sourceLanguage}`);
    console.log(`  Target language: ${result.targetLanguage}`);

    // Print supported language names
    const languageMap = translator.getSupportedLanguageNameMap();
    console.log("\n📋 Supported languages and names:");
    Object.entries(languageMap)
      .slice(0, 10)
      .forEach(([code, name]) => {
        console.log(`  ${code}: ${name}`);
      });
    console.log(
      "  ...and more (total languages:",
      Object.keys(languageMap).length,
      ")"
    );

    console.log("\n✨ CommonJS module test completed!");
  } catch (error) {
    console.error(`❌ Error occurred: ${error.message}`);
  }
}

// Execute script
runCjsExample().catch((error) => {
  console.error("❌ Error during execution:", error);
});
