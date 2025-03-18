import { DeepLTranslator } from "./translator";
import { LanguageCode, TranslationOptions, FileNameFormat } from "./types";
import fs from "fs";
import path from "path";
import { flattenObject, unflattenObject, hasNestedStructure } from "./utils";

/**
 * Type definition for translation configuration
 */
export interface TranslationConfig {
  input: {
    directory: string;
    file: string;
    fileExportName: string;
  };
  output: {
    directory: string;
    prettyPrint: boolean;
    preserveNestedStructure?: boolean; // Whether to preserve nested structure
    formatLanguageCode?: (language: LanguageCode) => string; // Function for formatting language codes
    fileNameFormat?: FileNameFormat; // Option for file name format
    fileNameSuffix?: string; // Suffix to add before file extension (e.g., '.config')
  };
  translation: {
    targetLanguages: LanguageCode[];
    sourceLanguage: LanguageCode;
    autoDetect: boolean;
    useCache: boolean;
    skipExistingKeys: boolean;
    useContext?: boolean; // Whether to use context for translation
    valueOnly?: boolean; // Whether to use only values for translation
  };
}

/**
 * Class for managing multi-language translations
 */
export class TranslationManager {
  private config: TranslationConfig;
  private apiKey: string;

  /**
   * TranslationManager constructor
   * @param config Translation configuration
   * @param apiKey DeepL API key
   */
  constructor(config: TranslationConfig, apiKey: string) {
    this.config = config;
    this.apiKey = apiKey;
  }

  /**
   * Method to execute translation to all target languages
   */
  async translateAll() {
    try {
      // Load source data
      const sourceData = await this.loadSourceData();

      console.log("🌐 Starting translation to multiple languages...\n");
      console.log(`📂 Input directory: ${this.config.input.directory}`);
      console.log(`📂 Output directory: ${this.config.output.directory}`);
      console.log(
        `🈁 Target languages: ${this.config.translation.targetLanguages.join(
          ", "
        )}\n`
      );

      // Translate for each target language
      for (const targetLanguage of this.config.translation.targetLanguages) {
        await this.translateToLanguage(targetLanguage, sourceData);
      }
    } catch (error) {
      console.error(`❌ An error occurred during translation: ${error}`);
      throw error;
    }
  }

  /**
   * Method to translate to a specific language
   */
  async translateToLanguage(
    targetLanguage: LanguageCode,
    sourceData: Record<string, string>
  ) {
    console.log(`\n🔄 Translating to '${targetLanguage}'...`);

    // Set translation options
    const options: TranslationOptions = {
      sourceLanguage: this.config.translation.sourceLanguage,
      targetLanguage: targetLanguage,
      autoDetect: this.config.translation.autoDetect,
      useCache: this.config.translation.useCache,
      useContext: this.config.translation.useContext,
      valueOnly: this.config.translation.valueOnly,
    };

    // Arabic translation settings
    // If the target language is Arabic or starts with "ar", set valueOnly to true and useContext to false by default
    const isArabic =
      targetLanguage === "ar" || targetLanguage.toLowerCase().startsWith("ar");
    if (isArabic) {
      if (this.config.translation.useContext === undefined) {
        options.useContext = false;
        console.log(`ℹ️ Arabic translation: Context disabled by default`);
      }
      if (this.config.translation.valueOnly === undefined) {
        options.valueOnly = true;
        console.log(
          `ℹ️ Arabic translation: Value-only mode enabled by default`
        );
      }
    }

    // Create DeepL translator
    const translator = new DeepLTranslator(options, this.apiKey);

    // Load existing translations
    const existingTranslations = this.config.translation.skipExistingKeys
      ? await this.loadExistingTranslation(targetLanguage)
      : null;

    // Object to store translation results (including existing translations)
    const translations: Record<string, string> = existingTranslations
      ? { ...existingTranslations }
      : {};

    // Track count of new keys
    let newKeysCount = 0;
    let skippedKeysCount = 0;

    // Translate each string
    for (const [key, text] of Object.entries(sourceData)) {
      // Skip already translated keys (if enabled)
      if (this.config.translation.skipExistingKeys && key in translations) {
        // console.log(`⏩ Skipping already translated key: "${key}"`);
        skippedKeysCount++;
        continue;
      }

      try {
        // Use key as context for translation
        const result = await translator.translate(text, key);
        translations[key] = result.translatedText;
        newKeysCount++;

        console.log(`✅ Translated: "${text}" -> "${result.translatedText}"`);
      } catch (error) {
        console.error(`❌ Translation failed: ${error}`);
        console.log(
          `🛟 Saving... ${Object.keys(translations).length} items saved...`
        );

        // Save the current translations
        await this.saveTranslation(targetLanguage, translations);
        console.log(`💾 Saved: ${targetLanguage}.ts file.`);
        console.error("🥷 Please retry translation.");
        process.exit(1);
      }
    }

    // If the target language is Arabic, clean up the translations before saving
    if (isArabic) {
      console.log(`🧹 Final cleanup of Arabic translations before saving...`);
      for (const key of Object.keys(translations)) {
        const value = translations[key];
        if (typeof value === "string") {
          // Remove RTL markers
          let cleanedValue = value.replace(/\u200F/g, "");
          // Clean up special patterns
          cleanedValue = cleanedValue.replace(/_\d+__/g, "");
          cleanedValue = cleanedValue.replace(/_개/g, "");

          // Remove duplicate spaces and trim
          cleanedValue = cleanedValue.replace(/\s+/g, " ").trim();

          translations[key] = cleanedValue;
        }
      }
    }

    // Print translation statistics
    // console.log(`\n📊 Translation statistics:`);
    // console.log(`   - Total keys: ${Object.keys(sourceData).length}`);
    // console.log(`   - Newly translated keys: ${newKeysCount}`);
    // console.log(`   - Skipped keys: ${skippedKeysCount}`);
    // console.log(
    //   `   - Final translation file keys: ${Object.keys(translations).length}`
    // );

    // Save to file
    await this.saveTranslation(targetLanguage, translations);
  }

  /**
   * Method to load data to translate from input file
   */
  async loadSourceData(): Promise<Record<string, string>> {
    try {
      const inputFilePath = path.join(
        this.config.input.directory,
        this.config.input.file
      );

      if (!fs.existsSync(inputFilePath)) {
        throw new Error(`Input file not found: ${inputFilePath}`);
      }

      const fileExtension = path.extname(inputFilePath);

      let data;

      // Process CommonJS module (.js)
      if (fileExtension === ".js") {
        try {
          // Use require() in Node.js environment
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const moduleData = require(inputFilePath);

          if (this.config.input.fileExportName === "default") {
            data = moduleData;
          } else {
            data = moduleData[this.config.input.fileExportName];
          }
        } catch (err) {
          console.error(`Failed to require JS module: ${err}`);
          throw err;
        }
      }
      // Process TypeScript and ESM modules
      else {
        try {
          const fileUrl = `file://${path.resolve(inputFilePath)}`;
          const module = await import(fileUrl);

          if (this.config.input.fileExportName === "default") {
            data = module.default;
          } else {
            data = module[this.config.input.fileExportName];
          }
        } catch (err) {
          console.error(`Failed to import TS/ESM module: ${err}`);
          throw err;
        }
      }

      if (!data) {
        throw new Error(
          `Could not find export in the input file. Please check your fileExportName setting.`
        );
      }

      const hasNested = hasNestedStructure(data);

      if (hasNested) {
        console.log("🔄 Nested structure detected. Flattening...");
        return flattenObject(data);
      }

      return data as Record<string, string>;
    } catch (error) {
      console.error(`❌ Failed to load input file: ${error}`);
      throw error;
    }
  }

  /**
   * Method to load existing translation file
   */
  async loadExistingTranslation(
    language: LanguageCode
  ): Promise<Record<string, string> | null> {
    try {
      // Extract extension from input file
      const fileExtension = path.extname(this.config.input.file);

      // Convert language code for file name
      const filenameLanguage = this.formatOutput(language);

      const targetFilePath = path.join(
        this.config.output.directory,
        `${filenameLanguage}${fileExtension}`
      );

      // Return null if file doesn't exist
      if (!fs.existsSync(targetFilePath)) {
        console.log(
          `⚠️ No existing ${filenameLanguage}${fileExtension} file. Creating new file.`
        );
        return null;
      }

      // Read file content
      const fileContent = fs.readFileSync(targetFilePath, "utf-8");

      // Use language code as variable name
      const langVarName = filenameLanguage;

      // Find export statement (change search pattern based on file format)
      const exportRegex =
        fileExtension === ".ts"
          ? new RegExp(`export\\s+default\\s+${langVarName}`)
          : new RegExp(`module\\.exports\\s*=\\s*${langVarName}`);

      if (!exportRegex.test(fileContent)) {
        console.log(
          `⚠️ Could not find export for ${langVarName} in ${filenameLanguage}${fileExtension} file.`
        );
        return null;
      }

      // Dynamic import of the file
      try {
        let data = null;

        // CommonJS Module (.js)
        if (fileExtension === ".js") {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const moduleData = require(targetFilePath);
            data = moduleData;
          } catch (err) {
            console.error(`Failed to require JS module: ${err}`);
            return null;
          }
        }
        // TypeScript / ESM Module
        else {
          try {
            const fileUrl = `file://${path.resolve(targetFilePath)}`;
            const module = await import(fileUrl);
            data = module.default;
          } catch (err) {
            console.error(`Failed to import TS/ESM module: ${err}`);
            return null;
          }
        }

        if (!data) {
          console.log(
            `⚠️ Could not find export in ${filenameLanguage}${fileExtension} file.`
          );
          return null;
        }

        console.log(
          `🔄 Loaded existing ${filenameLanguage}${fileExtension} file. (${
            Object.keys(data).length
          } keys)`
        );

        // Check and flatten nested structure
        if (hasNestedStructure(data)) {
          console.log(`🔄 Nested structure detected. Flattening...`);
          data = flattenObject(data);
        }

        // For Arabic, clean up RTL markers and special patterns in existing translations
        const isArabic = language === "ar";
        if (isArabic) {
          console.log(
            `🧹 Cleaning up RTL markers and special patterns in Arabic translations...`
          );
          const cleanedData: Record<string, string> = {};

          for (const [key, value] of Object.entries(data)) {
            if (typeof value === "string") {
              let cleanedValue = value;
              // Remove RTL markers
              cleanedValue = cleanedValue.replace(/\u200F/g, "");
              // Clean up strange patterns
              cleanedValue = cleanedValue.replace(/_\d+__/g, "");
              cleanedValue = cleanedValue.replace(/_개/g, "");
              cleanedData[key] = cleanedValue;
            } else {
              cleanedData[key] = value as string;
            }
          }

          return cleanedData;
        }

        return data as Record<string, string>;
      } catch (importError) {
        console.log(
          `⚠️ Failed to import ${filenameLanguage}${fileExtension} file: ${importError}`
        );
        return null;
      }
    } catch (error) {
      console.log(`⚠️ Failed to load existing ${language} file: ${error}`);
      return null;
    }
  }

  /**
   * Method to save translation results to file for the specified language
   */
  async saveTranslation(
    language: LanguageCode,
    translations: Record<string, string>
  ) {
    // Extract extension from input file
    const fileExtension = path.extname(this.config.input.file);

    // Convert language code for file name
    const filenameLanguage = this.formatOutput(language);

    // Add suffix if provided
    const suffix = this.config.output.fileNameSuffix || "";

    const outputPath = path.join(
      this.config.output.directory,
      `${filenameLanguage}${suffix}${fileExtension}`
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(this.config.output.directory)) {
      fs.mkdirSync(this.config.output.directory, { recursive: true });
    }

    // Set indentation
    const indentation = this.config.output.prettyPrint ? 2 : 0;

    // Convert if preserve nested structure option is enabled
    const outputData = this.config.output.preserveNestedStructure
      ? unflattenObject(translations)
      : translations;

    // Use language code as variable name
    const langVarName = filenameLanguage;

    // Determine output format based on extension
    let fileContent;
    if (fileExtension === ".ts") {
      fileContent = `
/**
 * ${filenameLanguage} translations
 * Auto-generated from ${this.config.translation.sourceLanguage} source
 */

const ${langVarName} = ${JSON.stringify(
        outputData,
        null,
        indentation
      )} as const;

export default ${langVarName};
`;
    } else {
      // JavaScript file (.js)
      fileContent = `
/**
 * ${filenameLanguage} translations
 * Auto-generated from ${this.config.translation.sourceLanguage} source
 */

const ${langVarName} = ${JSON.stringify(outputData, null, indentation)};

module.exports = ${langVarName};
`;
    }

    fs.writeFileSync(outputPath, fileContent);
    console.log(`✅ Translation file saved: ${outputPath}`);
  }

  /**
   * Convert language code to output file name format
   * @param language Language code
   * @returns Converted file name format
   */
  private formatOutput(language: LanguageCode): string {
    // Use custom formatting function if provided
    if (this.config.output.formatLanguageCode) {
      return this.config.output.formatLanguageCode(language);
    }

    // Convert format according to fileNameFormat option
    const format = this.config.output.fileNameFormat || "simple";

    switch (format) {
      case "default":
        // Keep as is
        return language;

      case "simple":
        // Remove hyphens (e.g., zh-Hans -> zhHans)
        return language.replace(/-/g, "");

      case "camelCase":
        // Camel case (e.g., zh-hans -> zhHans)
        return language
          .toLowerCase()
          .split("-")
          .map((part, index) =>
            index === 0
              ? part
              : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          )
          .join("");

      case "pascalCase":
        // Pascal case (e.g., zh-hans -> ZhHans)
        return language
          .toLowerCase()
          .split("-")
          .map(
            (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          )
          .join("");

      case "snake_case":
        // Snake case (e.g., zh-Hans -> zh_hans)
        return language.toLowerCase().replace(/-/g, "_");

      case "kebab-case":
        // Kebab case (e.g., zh-Hans -> zh-hans)
        return language.toLowerCase();

      default:
        // Default: remove hyphens
        return language.replace(/-/g, "");
    }
  }
}
