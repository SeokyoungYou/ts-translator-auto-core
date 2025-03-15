import {
  LanguageCode,
  TranslationOptions,
  TranslationResult,
  LANGUAGE_CODE_MAPPING,
  LANGUAGE_NAMES,
} from "./types";
import axios, { AxiosError } from "axios";

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
    return ["ko", "en", "ja", "zh-Hans", "es", "fr", "de"];
  }
}

/**
 * DeepL API를 사용한 번역기 구현
 */
export class DeepLTranslator extends Translator {
  private apiKey: string;
  private apiUrl: string;
  private readonly VARIABLE_PATTERN = /\{([^}]+)\}/g;

  /**
   * DeepL 번역기 생성자
   * @param options 번역 옵션
   * @param apiKey DeepL API 키
   * @param apiUrl DeepL API URL (기본값: https://api-free.deepl.com/v2/translate)
   */
  constructor(
    options: TranslationOptions,
    apiKey: string,
    apiUrl: string = "https://api-free.deepl.com/v2/translate"
  ) {
    super(options);

    if (!apiKey) {
      throw new Error("DeepL API 키가 필요합니다.");
    }

    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * 언어 코드를 DeepL API 형식으로 변환
   * @param langCode 언어 코드
   * @returns DeepL API 형식의 언어 코드
   */
  private formatLanguageCodeForApi(langCode: LanguageCode): string {
    // DeepL API는 언어 코드를 특정 형식으로 요구함
    // en-GB → EN-GB, zh-Hans → ZH, pt-BR → PT-BR 등
    return langCode.toUpperCase();
  }

  /**
   * DeepL API를 사용하여 텍스트 번역
   * @param text 번역할 텍스트
   * @returns 번역 결과
   */
  protected async translateText(text: string): Promise<TranslationResult> {
    try {
      // 변수를 <keep>변수</keep> 형태로 변환하여 번역에서 제외
      const textToTranslate = text.replace(
        this.VARIABLE_PATTERN,
        (match) => `<keep>${match}</keep>`
      );

      const response = await axios.post(
        this.apiUrl,
        {
          text: [textToTranslate],
          target_lang: this.formatLanguageCodeForApi(
            this.options.targetLanguage
          ),
          source_lang: this.options.autoDetect
            ? undefined
            : this.formatLanguageCodeForApi(this.options.sourceLanguage),
          // XML 처리 옵션 추가
          tag_handling: "xml",
          // keep 태그 내부는 번역하지 않도록 설정
          ignore_tags: ["keep"],
        },
        {
          headers: {
            Authorization: `DeepL-Auth-Key ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      // <keep> 태그 제거하고 원래 변수 형태 복원
      let translatedText = response.data.translations[0].text;
      translatedText = translatedText.replace(/<keep>|<\/keep>/g, "");

      return {
        originalText: text,
        translatedText,
        sourceLanguage: this.options.sourceLanguage,
        targetLanguage: this.options.targetLanguage,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new Error(
          `DeepL API 번역 실패: ${
            axiosError.response?.data || axiosError.message
          }`
        );
      } else {
        throw new Error(`DeepL API 번역 실패: ${String(error)}`);
      }
    }
  }

  /**
   * DeepL API에서 지원하는 언어 목록 반환
   */
  public getSupportedLanguages(): LanguageCode[] {
    return Object.values(LANGUAGE_CODE_MAPPING);
  }

  /**
   * DeepL API에서 지원하는 언어 이름과 코드 맵 반환
   */
  public getSupportedLanguageNameMap(): Record<LanguageCode, string> {
    return LANGUAGE_NAMES;
  }
}
