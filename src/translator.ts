import { LanguageCode, TranslationOptions, TranslationResult } from "./types";

/**
 * 기본 번역 옵션
 */
const DEFAULT_OPTIONS: Partial<TranslationOptions> = {
  autoDetect: true,
  useCache: true,
  maxLength: 5000,
};

/**
 * 기본 번역기 클래스
 * 실제 번역 로직은 하위 클래스에서 구현해야 합니다.
 */
export abstract class Translator {
  protected options: TranslationOptions;

  /**
   * 번역기 생성자
   * @param options 번역 옵션
   */
  constructor(options: TranslationOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options } as TranslationOptions;
  }

  /**
   * 텍스트 번역
   * @param text 번역할 텍스트
   * @returns 번역 결과 프로미스
   */
  public async translate(text: string): Promise<TranslationResult> {
    if (!text || text.trim() === "") {
      throw new Error("번역할 텍스트가 비어있습니다.");
    }

    if (text.length > (this.options.maxLength || DEFAULT_OPTIONS.maxLength!)) {
      throw new Error(
        `텍스트가 최대 길이(${this.options.maxLength})를 초과했습니다.`
      );
    }

    return this.translateText(text);
  }

  /**
   * 실제 번역 로직 구현 (하위 클래스에서 구현)
   * @param text 번역할 텍스트
   */
  protected abstract translateText(text: string): Promise<TranslationResult>;

  /**
   * 지원하는 언어 목록 반환
   */
  public abstract getSupportedLanguages(): LanguageCode[];
}

/**
 * 기본 번역기 구현 (예제용)
 * 실제로는 외부 API를 사용하거나 구체적인 번역 로직을 구현해야 합니다.
 */
export class DummyTranslator extends Translator {
  protected async translateText(text: string): Promise<TranslationResult> {
    // 실제 구현에서는 외부 API 호출 등을 수행합니다.
    // 이 예제에서는 간단한 더미 구현을 제공합니다.
    return {
      originalText: text,
      translatedText: `[번역됨] ${text}`,
      sourceLanguage: this.options.sourceLanguage,
      targetLanguage: this.options.targetLanguage,
    };
  }

  public getSupportedLanguages(): LanguageCode[] {
    return ["ko", "en", "ja", "zh", "es", "fr", "de"];
  }
}
