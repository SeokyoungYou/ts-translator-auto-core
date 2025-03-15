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
  delayBetweenRequests: 500,
  maxRetries: 3,
  retryDelay: 2000,
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
          // Add XML tag handling option
          tag_handling: "xml",
          // Set tags to exclude from translation
          ignore_tags: ["v"],
        },
        {
          headers: {
            Authorization: `DeepL-Auth-Key ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      // 성공 시 현재 딜레이를 기본 값으로 재설정
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
      // Special handling to preserve variable patterns during DeepL translation
      // Wrap with <v> tags to exclude from translation
      const textToTranslate = text.replace(
        this.VARIABLE_PATTERN,
        (match) => `<v>${match}</v>`
      );

      // Create translation text with context if provided
      let textWithContext = textToTranslate;
      if (context) {
        // Prepend context for translation but keep it separate with delimiter
        // Format: "context [CONTEXT_DELIM] text_to_translate"
        textWithContext = `${context} [CONTEXT] ${textToTranslate}`;
      }

      // API 요청 보내기 (재시도 로직 포함)
      const response = await this.makeApiRequest(textWithContext);

      // Get translated text from response
      let translatedText = response.data.translations[0].text;

      // If context was provided, remove the translated context portion
      if (context) {
        // Find the [CONTEXT] delimiter in the translated text and remove everything before it
        const contextDelimIndex = translatedText.indexOf("[CONTEXT]");
        if (contextDelimIndex !== -1) {
          translatedText = translatedText
            .substring(contextDelimIndex + "[CONTEXT]".length)
            .trim();
        }
      }

      // Remove v tags and restore variable format
      // Use regex to handle cases where numbers are added
      translatedText = translatedText.replace(
        /<v>\{([^}]+)\}<\/v>(\d+)?/g,
        (_: string, varName: string) => {
          return `{${varName}}`;
        }
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
