import { DeepLTranslator } from "../translator";
import { LanguageCode, TranslationOptions } from "../types";
import fs from "fs";
import path from "path";

/**
 * 번역 설정을 위한 타입 정의
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
 * 다국어 번역을 관리하는 클래스
 */
export class TranslationManager {
  private config: TranslationConfig;
  private apiKey: string;

  /**
   * TranslationManager 생성자
   * @param config 번역 설정
   * @param apiKey DeepL API 키
   */
  constructor(config: TranslationConfig, apiKey: string) {
    this.config = config;
    this.apiKey = apiKey;
  }

  /**
   * 모든 대상 언어로 번역을 실행하는 메서드
   */
  async translateAll() {
    try {
      // 원본 데이터 로드
      const sourceData = await this.loadSourceData();

      console.log("🌐 여러 언어로 번역을 시작합니다...\n");
      console.log(`📂 입력 디렉토리: ${this.config.input.directory}`);
      console.log(`📂 출력 디렉토리: ${this.config.output.directory}`);
      console.log(
        `🈁 번역할 언어: ${this.config.translation.targetLanguages.join(
          ", "
        )}\n`
      );

      // 각 대상 언어에 대해 번역 수행
      for (const targetLanguage of this.config.translation.targetLanguages) {
        await this.translateToLanguage(targetLanguage, sourceData);
      }
    } catch (error) {
      console.error(`❌ 번역 과정에서 오류가 발생했습니다: ${error}`);
      throw error;
    }
  }

  /**
   * 특정 언어로 번역하는 메서드
   */
  async translateToLanguage(
    targetLanguage: LanguageCode,
    sourceData: Record<string, string>
  ) {
    console.log(`\n🔄 '${targetLanguage}'로 번역 중...`);

    // 번역 옵션 설정
    const options: TranslationOptions = {
      sourceLanguage: this.config.translation.sourceLanguage,
      targetLanguage: targetLanguage,
      autoDetect: this.config.translation.autoDetect,
      useCache: this.config.translation.useCache,
    };

    // DeepL 번역기 생성
    const translator = new DeepLTranslator(options, this.apiKey);

    // 이미 존재하는 번역 로드
    const existingTranslations = this.config.translation.skipExistingKeys
      ? await this.loadExistingTranslation(targetLanguage)
      : null;

    // 번역 결과를 저장할 객체 (기존 번역 포함)
    const translations: Record<string, string> = existingTranslations
      ? { ...existingTranslations }
      : {};

    // 추가된 새 키 수 추적
    let newKeysCount = 0;
    let skippedKeysCount = 0;

    // 각 문자열 번역
    for (const [key, text] of Object.entries(sourceData)) {
      // 이미 번역된 키는 건너뛰기 (설정이 활성화된 경우)
      if (this.config.translation.skipExistingKeys && key in translations) {
        // console.log(`⏩ 이미 번역된 키 건너뛰기: "${key}"`);
        skippedKeysCount++;
        continue;
      }

      try {
        console.log(`📝 번역 중: "${key}" -> "${text}"`);

        // 컨텍스트로 키를 사용하여 번역
        const result = await translator.translate(text, key);
        translations[key] = result.translatedText;
        newKeysCount++;

        console.log(`✅ 번역됨: "${result.translatedText}"`);
      } catch (error) {
        console.error(`❌ 번역 실패: ${error}`);
        // 실패한 경우 원본 텍스트 유지
        translations[key] = text;
      }
    }

    // 번역 통계 출력
    console.log(`\n📊 번역 통계:`);
    console.log(`   - 전체 키: ${Object.keys(sourceData).length}개`);
    console.log(`   - 새로 번역된 키: ${newKeysCount}개`);
    console.log(`   - 건너뛴 키: ${skippedKeysCount}개`);
    console.log(
      `   - 최종 번역 파일 키 수: ${Object.keys(translations).length}개`
    );

    // 파일로 저장
    await this.saveTranslation(targetLanguage, translations);
  }

  /**
   * 입력 파일에서 번역할 데이터를 불러오는 메서드
   */
  async loadSourceData(): Promise<Record<string, string>> {
    try {
      const inputFilePath = path.join(
        this.config.input.directory,
        this.config.input.file
      );

      if (!fs.existsSync(inputFilePath)) {
        throw new Error(`입력 파일을 찾을 수 없습니다: ${inputFilePath}`);
      }

      // 파일 동적 import
      const module = await import(inputFilePath);
      const data = module[this.config.input.fileExportName];

      if (!data) {
        throw new Error(
          `입력 파일에서 '${this.config.input.fileExportName}' export를 찾을 수 없습니다.`
        );
      }

      return data as Record<string, string>;
    } catch (error) {
      console.error(`❌ 입력 파일 로드 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 이미 존재하는 번역 파일을 불러오는 메서드
   */
  async loadExistingTranslation(
    language: LanguageCode
  ): Promise<Record<string, string> | null> {
    try {
      const targetFilePath = path.join(
        this.config.output.directory,
        `${language}.ts`
      );

      // 파일이 존재하지 않으면 null 반환
      if (!fs.existsSync(targetFilePath)) {
        console.log(`⚠️ 기존 ${language}.ts 파일이 없습니다. 새로 생성합니다.`);
        return null;
      }

      // 파일 내용 읽기
      const fileContent = fs.readFileSync(targetFilePath, "utf-8");

      // export default 구문 찾기
      const exportName = language.replace("-", "");
      const exportRegex = new RegExp(`export\\s+default\\s+${exportName}`);

      if (!exportRegex.test(fileContent)) {
        console.log(
          `⚠️ ${language}.ts 파일에서 export default ${exportName}를 찾을 수 없습니다.`
        );
        return null;
      }

      // 파일 동적 import
      const importPath = targetFilePath.replace(/\.ts$/, "");
      const relativePath = path.relative(__dirname, importPath);

      try {
        // 상대 경로로 import
        const module = await import(`./${relativePath}`);
        const data = module.default;

        if (!data) {
          console.log(
            `⚠️ ${language}.ts 파일에서 default export를 찾을 수 없습니다.`
          );
          return null;
        }

        console.log(
          `📖 기존 ${language}.ts 파일을 불러왔습니다. (${
            Object.keys(data).length
          }개 키)`
        );
        return data as Record<string, string>;
      } catch (importError) {
        console.log(`⚠️ ${language}.ts 파일 import 실패: ${importError}`);
        return null;
      }
    } catch (error) {
      console.log(`⚠️ 기존 ${language}.ts 파일 로드 실패: ${error}`);
      return null;
    }
  }

  /**
   * 지정된 언어로 번역 결과를 파일로 저장하는 메서드
   */
  async saveTranslation(
    language: LanguageCode,
    translations: Record<string, string>
  ) {
    const outputPath = path.join(
      this.config.output.directory,
      `${language}.ts`
    );

    // 결과를 저장할 디렉토리가 없으면 생성
    if (!fs.existsSync(this.config.output.directory)) {
      fs.mkdirSync(this.config.output.directory, { recursive: true });
    }

    // 들여쓰기 설정
    const indentation = this.config.output.prettyPrint ? 2 : 0;

    // TypeScript 파일 형식으로 저장
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
    console.log(`✅ ${language} 번역 파일이 저장되었습니다: ${outputPath}`);
  }
}
