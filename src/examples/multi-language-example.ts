import { LanguageCode } from "../types";
import dotenv from "dotenv";
import path from "path";
import { TranslationManager, TranslationConfig } from "../manager";

// Load .env file
dotenv.config();

// ===== Configuration =====
// Configure input/output directories (modify as needed)
const CONFIG: TranslationConfig = {
  // Input file settings
  input: {
    directory: path.join(__dirname, "data"),
    file: "ko.ts", // Input file name
    fileExportName: "default", // Export name in the file
  },
  // Output settings
  output: {
    directory: path.join(__dirname, "data"),
    prettyPrint: true, // Apply indentation for JSON output
  },
  // Translation settings
  translation: {
    // List of target languages
    targetLanguages: [
      "en", // English (US)
      "ja", // Japanese
      "zh-Hans", // Chinese (Simplified)
      "fr", // French
      "de", // German
    ] as LanguageCode[],
    sourceLanguage: "ko" as LanguageCode, // Source language
    autoDetect: false, // Automatic language detection
    useCache: true, // Use translation cache
    skipExistingKeys: true, // Skip already translated keys
  },
};

async function main() {
  // Get API key from environment variable
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    console.error("❌ DeepL API key is not configured.");
    console.error("💡 Please set DEEPL_API_KEY in your .env file.");
    process.exit(1);
  }

  try {
    // Create TranslationManager instance
    const translationManager = new TranslationManager(CONFIG, apiKey);

    // Execute translation for all languages
    await translationManager.translateAll();

    console.log("\n✨ All language translations completed.");
  } catch (error) {
    console.error(`❌ An error occurred during translation: ${error}`);
    process.exit(1);
  }
}

// Run script
if (require.main === module) {
  main().catch((error) => console.error("❌ Error occurred:", error));
}

export { main };
