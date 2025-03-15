import {
  LanguageCode,
  TranslationOptions,
  TranslationResult,
  LANGUAGE_CODE_MAPPING,
  LANGUAGE_NAMES,
} from "./types";
import axios, { AxiosError, AxiosResponse } from "axios";

/**
 * Default translation options
 */
const DEFAULT_OPTIONS: Partial<TranslationOptions> = {
  autoDetect: true,
  useCache: true,
  maxLength: 5000,
  delayBetweenRequests: 1000,
  maxRetries: 3,
  retryDelay: 2000,
};

/**
 * 특정 언어 문자 범위 정의
 */
const LANGUAGE_CHAR_PATTERNS = {
  // 영어와 일반 구두점, 숫자는 모든 언어에서 공통으로 사용
  common: /^[a-zA-Z0-9\s.,!?():\-'"]+$/,
  // 한국어
  ko: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/,
  // 중국어 (간체 및 번체)
  zh: /[\u4E00-\u9FFF\u3400-\u4DBF]/,
  // 일본어 (히라가나, 가타카나, 한자)
  ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/,
  // 아랍어
  ar: /[\u0600-\u06FF]/,
  // 러시아어 (키릴 문자)
  ru: /[\u0400-\u04FF]/,
  // 히브리어
  he: /[\u0590-\u05FF]/,
  // 태국어
  th: /[\u0E00-\u0E7F]/,
};

/**
 * Base Translator class
 * Actual translation logic must be implemented in subclasses.
 */
export abstract class Translator {
  protected options: TranslationOptions;

  /**
   * Translator constructor
   * @param options Translation options
   */
  constructor(options: TranslationOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options } as TranslationOptions;
  }

  /**
   * Translate text
   * @param text Text to translate
   * @param context Optional context key to provide more context for translation
   * @returns Translation result promise
   */
  public async translate(
    text: string,
    context?: string
  ): Promise<TranslationResult> {
    if (!text || text.trim() === "") {
      throw new Error("Text to translate is empty.");
    }

    if (text.length > (this.options.maxLength || DEFAULT_OPTIONS.maxLength!)) {
      throw new Error(
        `Text exceeds maximum length (${this.options.maxLength}).`
      );
    }

    return this.translateText(text, context);
  }

  /**
   * Implement actual translation logic (implemented in subclasses)
   * @param text Text to translate
   * @param context Optional context key to provide more context for translation
   */
  protected abstract translateText(
    text: string,
    context?: string
  ): Promise<TranslationResult>;

  /**
   * Return list of supported languages
   */
  public abstract getSupportedLanguages(): LanguageCode[];
}

/**
 * Basic translator implementation (for example)
 * In practice, you should use an external API or implement specific translation logic.
 */
export class DummyTranslator extends Translator {
  protected async translateText(
    text: string,
    context?: string
  ): Promise<TranslationResult> {
    // In a real implementation, you would call an external API, etc.
    // This example provides a simple dummy implementation.
    return {
      originalText: text,
      translatedText: `[Translated] ${text}`,
      sourceLanguage: this.options.sourceLanguage,
      targetLanguage: this.options.targetLanguage,
    };
  }

  public getSupportedLanguages(): LanguageCode[] {
    return ["ko", "en", "ja", "zh-Hans", "es", "fr", "de"];
  }
}

/**
 * Translator implementation using DeepL API
 */
export class DeepLTranslator extends Translator {
  private apiKey: string;
  private apiUrl: string;
  private readonly VARIABLE_PATTERN = /\{([^}]+)\}/g;
  private readonly CONTEXT_DELIMITER: string;
  private readonly VARIABLE_PREFIX: string;
  private readonly VARIABLE_SUFFIX: string;
  private lastRequestTime: number = 0;
  private currentDelay: number;

  /**
   * DeepL Translator constructor
   * @param options Translation options
   * @param apiKey DeepL API key
   * @param apiUrl DeepL API URL (default: https://api-free.deepl.com/v2/translate)
   */
  constructor(
    options: TranslationOptions,
    apiKey: string,
    apiUrl: string = "https://api-free.deepl.com/v2/translate"
  ) {
    super(options);

    if (!apiKey) {
      throw new Error("DeepL API key is required.");
    }

    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.currentDelay =
      this.options.delayBetweenRequests ||
      DEFAULT_OPTIONS.delayBetweenRequests!;

    // Context delimiter is unique to each instance
    const randomId = Math.random().toString(36).substring(2, 10);
    this.CONTEXT_DELIMITER = `__DEEPL_CTX_${randomId}__`;
    this.VARIABLE_PREFIX = `__DEEPL_VAR_${randomId}_`;
    this.VARIABLE_SUFFIX = `__`;
  }

  /**
   * Convert language code to DeepL API format
   * @param langCode Language code
   * @returns Language code in DeepL API format
   */
  private formatLanguageCodeForApi(langCode: LanguageCode): string {
    // DeepL API requires language codes in a specific format
    // en-GB → EN-GB, zh-Hans → ZH, pt-BR → PT-BR, etc.
    return langCode.toUpperCase();
  }

  /**
   * 요청 사이의 딜레이를 적용하는 함수
   * @private
   */
  private async applyRequestDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (this.lastRequestTime && timeSinceLastRequest < this.currentDelay) {
      const waitTime = this.currentDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * DeepL API 요청 함수
   * @param textWithContext 번역할 텍스트 (컨텍스트 포함)
   * @param retryCount 현재 재시도 횟수
   * @returns API 응답
   */
  private async makeApiRequest(
    textWithContext: string,
    retryCount: number = 0
  ): Promise<AxiosResponse> {
    try {
      // 요청 전 딜레이 적용
      await this.applyRequestDelay();

      const response = await axios.post(
        this.apiUrl,
        {
          text: [textWithContext],
          target_lang: this.formatLanguageCodeForApi(
            this.options.targetLanguage
          ),
          source_lang: this.options.autoDetect
            ? undefined
            : this.formatLanguageCodeForApi(this.options.sourceLanguage),
          preserve_formatting: true,
          // 형식 무시 옵션 추가
          tag_handling: "xml",
          outline_detection: false,
          splitting_tags: [],
          non_splitting_tags: [],
        },
        {
          headers: {
            Authorization: `DeepL-Auth-Key ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Reset delay time
      this.currentDelay =
        this.options.delayBetweenRequests ||
        DEFAULT_OPTIONS.delayBetweenRequests!;

      return response;
    } catch (error: unknown) {
      const maxRetries = this.options.maxRetries || DEFAULT_OPTIONS.maxRetries!;

      if (axios.isAxiosError(error) && retryCount < maxRetries) {
        const axiosError = error as AxiosError;

        // 429 에러 (Too Many Requests) 처리
        if (axiosError.response?.status === 429) {
          // 딜레이 시간 증가 (지수 백오프)
          this.currentDelay = this.currentDelay * 2;
          console.warn(
            `DeepL API rate limit reached. Retrying in ${this.currentDelay}ms...`
          );

          // 기다린 후 재시도
          await new Promise((resolve) =>
            setTimeout(resolve, this.currentDelay)
          );
          return this.makeApiRequest(textWithContext, retryCount + 1);
        }

        // 그 외 일시적인 오류 (5xx) 처리
        if (axiosError.response?.status && axiosError.response.status >= 500) {
          const retryDelay =
            this.options.retryDelay || DEFAULT_OPTIONS.retryDelay!;
          console.warn(
            `DeepL API server error. Retrying in ${retryDelay}ms...`
          );

          // 기다린 후 재시도
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return this.makeApiRequest(textWithContext, retryCount + 1);
        }
      }

      // 재시도 횟수 초과 또는 재시도 불가능한 오류
      throw error;
    }
  }

  /**
   * 텍스트에 특정 언어의 문자가, 해당 언어가 타겟 언어와 일치하는지 확인
   * @param text 검사할 텍스트
   * @param targetLanguage 타겟 언어 코드
   * @returns {boolean} 올바른 언어로만 구성되었으면 true, 아니면 false
   */
  private isTextInExpectedLanguage(
    text: string,
    targetLanguage: LanguageCode
  ): { valid: boolean; detectedLanguages: string[] } {
    // 변수 패턴 제거 (언어 검증에서 제외)
    const textWithoutVars = text.replace(this.VARIABLE_PATTERN, "");

    // 공통 문자 (영어, 숫자, 구두점) 제거
    const textWithoutCommon = textWithoutVars.replace(
      /[a-zA-Z0-9\s.,!?():\-'"]/g,
      ""
    );

    // 텍스트가 비어있으면 공통 문자만 포함하므로 유효함
    if (textWithoutCommon.length === 0) {
      return { valid: true, detectedLanguages: ["common"] };
    }

    // 감지된 언어들 저장
    const detectedLanguages: string[] = [];

    // 각 언어 패턴으로 검사
    for (const [langCode, pattern] of Object.entries(LANGUAGE_CHAR_PATTERNS)) {
      if (langCode === "common") continue; // 공통 패턴은 이미 제거됨

      if (pattern.test(textWithoutCommon)) {
        detectedLanguages.push(langCode);
      }
    }

    // 타겟 언어 약어 추출 (zh-Hans -> zh)
    const targetLangBase = targetLanguage.split("-")[0];

    // 감지된 언어 중 타겟 언어가 있는지 확인
    const hasTargetLang = detectedLanguages.some(
      (lang) => lang === targetLangBase
    );

    // 다른 언어들도 있는지 확인
    const hasOtherLangs = detectedLanguages.some(
      (lang) => lang !== targetLangBase && lang !== "common"
    );

    // 타겟 언어만 있거나, 아무 언어도 감지되지 않으면 유효함
    const valid =
      (hasTargetLang && !hasOtherLangs) || detectedLanguages.length === 0;

    return { valid, detectedLanguages };
  }

  /**
   * 번역 후처리 및 검증
   */
  private postProcessTranslation(
    translatedText: string,
    originalText: string,
    variables: { start: number; end: number; name: string }[]
  ): string {
    // 변수 태그를 원래의 변수 형식으로 복원
    for (let i = 0; i < variables.length; i++) {
      const varName = variables[i].name;
      const varPattern = new RegExp(
        `${this.VARIABLE_PREFIX}${i}${this.VARIABLE_SUFFIX}`,
        "g"
      );
      translatedText = translatedText.replace(varPattern, `{${varName}}`);
    }

    // 번역 결과 검증
    // 1. 변수 갯수가 유지되는지 확인
    const originalVarCount = (originalText.match(this.VARIABLE_PATTERN) || [])
      .length;
    const translatedVarCount = (
      translatedText.match(this.VARIABLE_PATTERN) || []
    ).length;

    if (originalVarCount !== translatedVarCount) {
      console.warn(
        `변수 개수 불일치: 원본=${originalVarCount}, 번역=${translatedVarCount}, 텍스트="${originalText}"`
      );
    }

    // 2. 우리 구분자가 남아있는지 확인
    if (
      translatedText.includes(this.VARIABLE_PREFIX) ||
      translatedText.includes(this.VARIABLE_SUFFIX) ||
      translatedText.includes(this.CONTEXT_DELIMITER)
    ) {
      console.warn(`구분자가 번역 결과에 남아있습니다: "${translatedText}"`);

      // 남아있는 구분자 정리 시도
      for (let i = 0; i < variables.length; i++) {
        const varName = variables[i].name;
        const pattern = new RegExp(
          `${this.VARIABLE_PREFIX}${i}${this.VARIABLE_SUFFIX}`,
          "g"
        );
        translatedText = translatedText.replace(pattern, `{${varName}}`);
      }
      translatedText = translatedText.replace(
        new RegExp(this.CONTEXT_DELIMITER, "g"),
        ""
      );
    }

    // 3. 언어 혼합 검사
    const languageCheck = this.isTextInExpectedLanguage(
      translatedText,
      this.options.targetLanguage
    );

    if (!languageCheck.valid) {
      console.warn(
        `언어 혼합 감지: 타겟 언어=${this.options.targetLanguage}, ` +
          `감지된 언어=[${languageCheck.detectedLanguages.join(", ")}], ` +
          `텍스트="${translatedText}"`
      );
    }

    return translatedText;
  }

  /**
   * Translate text using DeepL API
   * @param text Text to translate
   * @param context Optional context key to provide more context for translation
   * @returns Translation result
   */
  protected async translateText(
    text: string,
    context?: string
  ): Promise<TranslationResult> {
    try {
      // Check if text already contains our delimiters
      const hasOurDelimiters =
        text.includes(this.VARIABLE_PREFIX) ||
        text.includes(this.CONTEXT_DELIMITER);

      // Extract variables from original text and replace them safely
      let processedText = text;
      const variables: { start: number; end: number; name: string }[] = [];

      // Extract variable positions and names
      let match;
      while ((match = this.VARIABLE_PATTERN.exec(text)) !== null) {
        variables.push({
          start: match.index,
          end: match.index + match[0].length,
          name: match[1],
        });
      }

      // Replace variables from the end (to avoid index changes)
      for (let i = variables.length - 1; i >= 0; i--) {
        const v = variables[i];
        const safeName = `${this.VARIABLE_PREFIX}${i}${this.VARIABLE_SUFFIX}`;
        processedText =
          processedText.substring(0, v.start) +
          safeName +
          processedText.substring(v.end);
      }

      // If context is provided, combine it with a unique delimiter
      let textWithContext = processedText;
      if (context) {
        textWithContext = `${context} ${this.CONTEXT_DELIMITER} ${processedText}`;
      }

      // Send API request (with retry logic)
      const response = await this.makeApiRequest(textWithContext);

      // Get translated text
      let translatedText = response.data.translations[0].text;

      // If context is provided, remove the translated context part
      if (context) {
        const delimiterIndex = translatedText.indexOf(this.CONTEXT_DELIMITER);
        if (delimiterIndex !== -1) {
          translatedText = translatedText
            .substring(delimiterIndex + this.CONTEXT_DELIMITER.length)
            .trim();
        }
      }

      // 번역 후처리 및 검증 수행
      translatedText = this.postProcessTranslation(
        translatedText,
        text,
        variables
      );

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
          `DeepL API translation failed: ${
            axiosError.response?.data || axiosError.message
          }`
        );
      } else {
        throw new Error(`DeepL API translation failed: ${String(error)}`);
      }
    }
  }

  /**
   * Return list of languages supported by DeepL API
   */
  public getSupportedLanguages(): LanguageCode[] {
    return Object.values(LANGUAGE_CODE_MAPPING);
  }

  /**
   * Return map of language names and codes supported by DeepL API
   */
  public getSupportedLanguageNameMap(): Record<LanguageCode, string> {
    return LANGUAGE_NAMES;
  }
}
