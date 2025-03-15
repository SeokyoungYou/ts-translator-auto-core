import axios from "axios";
import dotenv from "dotenv";
import "dotenv/config";
import * as fs from "fs/promises";
import * as path from "path";
import { dirname } from "path";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { LanguageCode, LANGUAGE_CODE_MAPPING, LANGUAGE_NAMES } from "../types";

// Setup to use __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local file
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

// DeepL API configuration
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL =
  process.env.DEEPL_API_URL || "https://api-free.deepl.com/v2/translate";

// Check API key
if (!DEEPL_API_KEY) {
  console.error("❌ DeepL API key is not set.");
  console.error("💡 Please check your .env.local file.");
  console.error("Current environment variable values:", {
    DEEPL_API_KEY,
    DEEPL_API_URL,
  });
  process.exit(1);
}

// Supported languages - all languages supported by DeepL
const TARGET_LANGUAGES = Object.values(LANGUAGE_CODE_MAPPING);
type TargetLanguage = LanguageCode;

// Default target languages to translate from Korean (ko)
const DEFAULT_TARGET_LANGUAGES: TargetLanguage[] = ["en", "ja", "zh-Hans"];

// Translation type definition
type TranslationType = Record<string, string>;

// Regular expression to find variable patterns
const VARIABLE_PATTERN = /\{([^}]+)\}/g;

/**
 * Print all available languages
 */
function printAvailableLanguages(): void {
  console.log("\n✅ Available languages:");

  Object.keys(LANGUAGE_NAMES)
    .sort()
    .forEach((code) => {
      const name = LANGUAGE_NAMES[code as LanguageCode];
      console.log(`- ${code}: ${name}`);
    });
}

/**
 * Translation function
 * @param text Text to translate
 * @param targetLang Target language code
 * @param sourceLang Source language code
 * @returns Translated text
 */
async function translateText(
  text: string,
  targetLang: TargetLanguage,
  sourceLang: LanguageCode = "ko"
): Promise<string> {
  try {
    // Convert variables to <keep>variable</keep> format
    const textToTranslate = text.replace(
      VARIABLE_PATTERN,
      (match) => `<keep>${match}</keep>`
    );

    const response = await axios.post(
      DEEPL_API_URL,
      {
        text: [textToTranslate],
        target_lang: targetLang.toUpperCase(),
        source_lang: sourceLang.toUpperCase(),
        // Add XML handling options
        tag_handling: "xml",
        // Set keep tags to not be translated
        ignore_tags: ["keep"],
      },
      {
        headers: {
          Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Remove <keep> tags and restore original variable format
    let translatedText = response.data.translations[0].text;
    translatedText = translatedText.replace(/<keep>|<\/keep>/g, "");

    console.log(`✅ "${text}" => "${translatedText}"`);
    return translatedText;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `❌ Translation failed: ${text}`,
        error.response?.data || error.message
      );
    } else {
      console.error(`❌ Translation failed: ${text}`, error);
    }
    return text;
  }
}

/**
 * Generate translation file
 * @param lang Target language code
 * @param sourcePath Source file path
 * @param outputPath Output file path
 */
async function generateTranslationFile(
  lang: TargetLanguage,
  sourcePath: string,
  outputPath: string
) {
  try {
    // Separate filename and directory from path
    const sourceDir = path.dirname(sourcePath);
    const sourceFile = path.basename(sourcePath);
    const sourceBaseName = path.basename(sourceFile, ".ts");

    // Load ko.ts and target language file
    const koModule = await import(`../${sourcePath}`);
    const koContent = koModule[sourceBaseName];

    let existingTranslations: TranslationType = {};
    try {
      // Load existing translation file if it exists
      const targetFilePath = `${outputPath}/${lang}`;
      const existingModule = await import(`../${targetFilePath}`);
      existingTranslations = existingModule[lang];
      console.log(`📖 Loaded existing ${targetFilePath}.ts file.`);
    } catch (e) {
      console.log(
        `⚠️ No existing ${outputPath}/${lang}.ts file found. Creating a new one.`
      );
    }

    // Create new translation object (copy existing translations)
    const translations: TranslationType = { ...existingTranslations };
    let newKeysCount = 0;

    // Translate each key
    for (const [key, value] of Object.entries(koContent)) {
      // Skip already translated keys
      if (key in translations) {
        continue;
      }

      console.log(`🔄 Translating new key: ${key}`);
      const translatedText = await translateText(value as string, lang, "ko");
      translations[key] = translatedText;
      newKeysCount++;
    }

    // Create translation file
    const outputContent = `export const ${lang} = ${JSON.stringify(
      translations,
      null,
      2
    )} as const;\n`;
    const fullOutputPath = path.join(
      process.cwd(),
      `${outputPath}`,
      `${lang}.ts`
    );

    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(fullOutputPath), { recursive: true });

    await fs.writeFile(fullOutputPath, outputContent, "utf-8");
    console.log(`✨ ${outputPath}/${lang}.ts file has been updated.`);
    console.log(`📊 Newly translated keys: ${newKeysCount}`);
  } catch (error) {
    console.error(`❌ Failed to create ${outputPath}/${lang} file:`, error);
  }
}

/**
 * Parse command line arguments
 * @returns Parsed options
 */
function parseCommandLineArguments() {
  const args = process.argv.slice(2);
  const options: {
    targetLanguages: TargetLanguage[];
    translationSets: { source: string; output: string }[];
    showHelp: boolean;
    listLanguages: boolean;
  } = {
    targetLanguages: [...DEFAULT_TARGET_LANGUAGES],
    translationSets: [
      { source: "lang/clientData/ko", output: "lang/clientData" },
      { source: "lang/metaData/ko", output: "lang/metaData" },
    ],
    showHelp: false,
    listLanguages: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.showHelp = true;
    } else if (arg === "--list-languages" || arg === "-l") {
      options.listLanguages = true;
    } else if (arg === "--lang" || arg === "-t") {
      // Next argument is language code
      if (i + 1 < args.length) {
        const langs = args[++i].split(",");
        // Validate language codes
        const validLangs = langs.filter((lang) =>
          TARGET_LANGUAGES.includes(lang as LanguageCode)
        ) as TargetLanguage[];

        if (validLangs.length > 0) {
          options.targetLanguages = validLangs;
        } else {
          console.warn("⚠️ No valid language codes provided. Using defaults.");
        }
      }
    } else if (arg === "--source" || arg === "-s") {
      // Next argument is source path
      if (i + 1 < args.length) {
        const sourcePath = args[++i];
        if (
          sourcePath &&
          i + 1 < args.length &&
          (args[i + 1] === "--output" || args[i + 1] === "-o")
        ) {
          // If output option follows
          i++;
          if (i + 1 < args.length) {
            const outputPath = args[++i];
            options.translationSets = [
              { source: sourcePath, output: outputPath },
            ];
          }
        } else {
          // If no output option - use source directory as output path
          const outputPath = path.dirname(sourcePath);
          options.translationSets = [
            { source: sourcePath, output: outputPath },
          ];
        }
      }
    }
  }

  return options;
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
Translation File Generator Script

Usage:
  npx ts-node src/examples/translate-files.ts [options]

Options:
  -h, --help             Show help information
  -l, --list-languages   Show list of supported languages
  -t, --lang <codes>     Language codes to translate to (comma-separated, e.g.: en,ja,zh-Hans)
  -s, --source <path>    Source file path (ko.ts file)
  -o, --output <path>    Output directory path

Examples:
  npx ts-node src/examples/translate-files.ts --lang en,ja,fr
  npx ts-node src/examples/translate-files.ts -s lang/custom/ko -o lang/custom
  `);
}

/**
 * Main execution function
 */
async function main() {
  console.log("🚀 Starting translation...");

  // Parse command line arguments
  const options = parseCommandLineArguments();

  // Show help
  if (options.showHelp) {
    printHelp();
    process.exit(0);
  }

  // Show language list
  if (options.listLanguages) {
    printAvailableLanguages();
    process.exit(0);
  }

  // Display translation sets and language information
  console.log("📋 Translation configuration:");
  console.log(`- Target languages: ${options.targetLanguages.join(", ")}`);
  console.log("- Translation sets:");
  options.translationSets.forEach((set) => {
    console.log(`  * Source: ${set.source}, Output: ${set.output}`);
  });

  // Generate translation files for each set and language
  for (const set of options.translationSets) {
    console.log(`\n🗂️ Starting translation for ${set.source} set...`);

    for (const lang of options.targetLanguages) {
      console.log(
        `\n📝 Generating ${lang} (${LANGUAGE_NAMES[lang]}) translation file...`
      );
      await generateTranslationFile(lang, set.source, set.output);
    }
  }

  console.log("\n✅ All translations completed!");
}

// Run script
main().catch(console.error);
