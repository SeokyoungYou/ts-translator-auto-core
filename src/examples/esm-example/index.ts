import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  TranslationManager,
  TranslationConfig,
  LanguageCode,
} from "ts-translator-auto-core";

// Load .env file
dotenv.config();

// Set path for ESM
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

// ===== Configuration =====
// Set input and output directories (modify as needed)
const CONFIG: TranslationConfig = {
  // Set input file
  input: {
    directory: path.join(currentDirPath, "data"),
    file: "ko.ts", // Input file name
    fileExportName: "default", // File export name
  },
  // Set output
  output: {
    directory: path.join(currentDirPath, "data"),
    prettyPrint: true, // Apply indentation to JSON output
  },
  // Set translation
  translation: {
    // Set target languages
    targetLanguages: [
      "en", // English (US)
      "ja", // Japanese
      "zh-Hans", // Chinese (Simplified)
      "fr", // French
      "de", // German
    ] as LanguageCode[],
    sourceLanguage: "ko" as LanguageCode, // Source language
    autoDetect: false, // Auto language detection
    useCache: true, // Use translation cache
    skipExistingKeys: true, // Skip existing keys
  },
};

async function main() {
  // Get API key from environment variable
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    console.error("❌ DeepL API key is not set.");
    console.error("💡 Please set DEEPL_API_KEY in the .env file.");
    process.exit(1);
  }

  try {
    // Create TranslationManager instance with ESM module path
    const translationManager = new TranslationManager(CONFIG, apiKey);

    // Run translation for all languages
    await translationManager.translateAll();

    console.log("\n✨ All translations completed.");
  } catch (error) {
    console.error(`❌ Error occurred during translation: ${error}`);
    process.exit(1);
  }
}

// ESM environment
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => console.error("❌ Error occurred:", error));
}

export { main };
