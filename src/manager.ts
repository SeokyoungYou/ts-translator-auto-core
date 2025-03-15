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
    preserveNestedStructure?: boolean; // 중첩 구조 유지 여부
    formatLanguageCode?: (language: LanguageCode) => string; // 언어 코드 포맷팅 함수
    fileNameFormat?: FileNameFormat; // 파일 이름 형식 지정 옵션
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

      // 확장자 확인
      const fileExtension = path.extname(inputFilePath);

      let data;

      // CommonJS 모듈 (.js) 처리
      if (fileExtension === ".js") {
        try {
          // Node.js 환경에서 require() 사용
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
      // TypeScript 및 ESM 모듈 처리
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
      // 입력 파일의 확장자 추출
      const fileExtension = path.extname(this.config.input.file);

      // 파일 이름용 언어 코드 변환
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

      // 언어 코드를 변수 이름으로 사용
      const langVarName = filenameLanguage;

      // Find export statement (파일 형식에 따라 검색 패턴 변경)
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

        // CommonJS 모듈 (.js) 처리
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
        // TypeScript 및 ESM 모듈 처리
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
          `�� Loaded existing ${filenameLanguage}${fileExtension} file. (${
            Object.keys(data).length
          } keys)`
        );

        // 중첩 구조 확인 및 평탄화
        if (hasNestedStructure(data)) {
          console.log(`🔄 Nested structure detected. Flattening...`);
          return flattenObject(data);
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
    // 입력 파일의 확장자 추출
    const fileExtension = path.extname(this.config.input.file);

    // 파일 이름용 언어 코드 변환
    const filenameLanguage = this.formatOutput(language);

    const outputPath = path.join(
      this.config.output.directory,
      `${filenameLanguage}${fileExtension}`
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(this.config.output.directory)) {
      fs.mkdirSync(this.config.output.directory, { recursive: true });
    }

    // Set indentation
    const indentation = this.config.output.prettyPrint ? 2 : 0;

    // 중첩 구조 유지 옵션이 활성화된 경우 변환
    const outputData = this.config.output.preserveNestedStructure
      ? unflattenObject(translations)
      : translations;

    // 언어 코드를 변수 이름으로 사용
    const langVarName = filenameLanguage;

    // 확장자에 따라 출력 포맷 결정
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
      // JavaScript 파일 (.js)
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
   * 언어 코드를 출력 파일 이름 형식으로 변환
   * @param language 언어 코드
   * @returns 변환된 파일 이름 형식
   */
  private formatOutput(language: LanguageCode): string {
    // 사용자 정의 포맷팅 함수가 있으면 해당 함수 사용
    if (this.config.output.formatLanguageCode) {
      return this.config.output.formatLanguageCode(language);
    }

    // fileNameFormat 옵션에 따라 형식 변환
    const format = this.config.output.fileNameFormat || "simple";

    switch (format) {
      case "default":
        // 그대로 유지
        return language;

      case "simple":
        // 하이픈 제거 (예: zh-Hans -> zhHans)
        return language.replace(/-/g, "");

      case "camelCase":
        // 카멜 케이스 (예: zh-hans -> zhHans)
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
        // 파스칼 케이스 (예: zh-hans -> ZhHans)
        return language
          .toLowerCase()
          .split("-")
          .map(
            (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          )
          .join("");

      case "snake_case":
        // 스네이크 케이스 (예: zh-Hans -> zh_hans)
        return language.toLowerCase().replace(/-/g, "_");

      case "kebab-case":
        // 케밥 케이스 (예: zh-Hans -> zh-hans)
        return language.toLowerCase();

      default:
        // 기본값: 하이픈 제거
        return language.replace(/-/g, "");
    }
  }
}
