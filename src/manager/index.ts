import { DeepLTranslator } from "../translator";
import { LanguageCode, TranslationOptions } from "../types";
import fs from "fs";
import path from "path";

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
  };
  translation: {
    targetLanguages: LanguageCode[];
    sourceLanguage: LanguageCode;
    autoDetect: boolean;
    useCache: boolean;
    skipExistingKeys: boolean;
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
    };

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
        console.log(`📝 Translating: "${key}" -> "${text}"`);

        // Use key as context for translation
        const result = await translator.translate(text, key);
        translations[key] = result.translatedText;
        newKeysCount++;

        console.log(`✅ Translated: "${result.translatedText}"`);
      } catch (error) {
        console.error(`❌ Translation failed: ${error}`);
        // Keep original text if translation fails
        translations[key] = text;
      }
    }

    // Print translation statistics
    console.log(`\n📊 Translation statistics:`);
    console.log(`   - Total keys: ${Object.keys(sourceData).length}`);
    console.log(`   - Newly translated keys: ${newKeysCount}`);
    console.log(`   - Skipped keys: ${skippedKeysCount}`);
    console.log(
      `   - Final translation file keys: ${Object.keys(translations).length}`
    );

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

      // Dynamic import of the file
      const module = await import(inputFilePath);
      const data = module[this.config.input.fileExportName];

      if (!data) {
        throw new Error(
          `Could not find '${this.config.input.fileExportName}' export in the input file.`
        );
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
      const targetFilePath = path.join(
        this.config.output.directory,
        `${language}.ts`
      );

      // Return null if file doesn't exist
      if (!fs.existsSync(targetFilePath)) {
        console.log(`⚠️ No existing ${language}.ts file. Creating new file.`);
        return null;
      }

      // Read file content
      const fileContent = fs.readFileSync(targetFilePath, "utf-8");

      // Find export default statement
      const exportName = language.replace("-", "");
      const exportRegex = new RegExp(`export\\s+default\\s+${exportName}`);

      if (!exportRegex.test(fileContent)) {
        console.log(
          `⚠️ Could not find export default ${exportName} in ${language}.ts file.`
        );
        return null;
      }

      // Dynamic import of the file
      try {
        // 파일 경로를 URL로 변환하여 임포트 ('file://' 프로토콜 사용)
        const fileUrl = `file://${path.resolve(targetFilePath)}`;
        const module = await import(fileUrl);
        const data = module.default;

        if (!data) {
          console.log(
            `⚠️ Could not find default export in ${language}.ts file.`
          );
          return null;
        }

        console.log(
          `📖 Loaded existing ${language}.ts file. (${
            Object.keys(data).length
          } keys)`
        );
        return data as Record<string, string>;
      } catch (importError) {
        console.log(`⚠️ Failed to import ${language}.ts file: ${importError}`);
        return null;
      }
    } catch (error) {
      console.log(`⚠️ Failed to load existing ${language}.ts file: ${error}`);
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
    const outputPath = path.join(
      this.config.output.directory,
      `${language}.ts`
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(this.config.output.directory)) {
      fs.mkdirSync(this.config.output.directory, { recursive: true });
    }

    // Set indentation
    const indentation = this.config.output.prettyPrint ? 2 : 0;

    // Save as TypeScript file
    const fileContent = `
/**
 * ${language} translations
 * Auto-generated from ${this.config.translation.sourceLanguage} source
 */

const ${language.replace("-", "")} = ${JSON.stringify(
      translations,
      null,
      indentation
    )} as const;

export default ${language.replace("-", "")};
`;

    fs.writeFileSync(outputPath, fileContent);
    console.log(`✅ Translation file saved: ${outputPath}`);
  }
}
