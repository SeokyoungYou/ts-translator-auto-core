import {
  LanguageCode,
  TranslationOptions,
  TranslationResult,
  LANGUAGE_CODE_MAPPING,
  LANGUAGE_NAMES,
} from "./types";
import axios, { AxiosError } from "axios";

/**
 * Default translation options
 */
const DEFAULT_OPTIONS: Partial<TranslationOptions> = {
  autoDetect: true,
  useCache: true,
  maxLength: 5000,
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
   * @returns Translation result promise
   */
  public async translate(text: string): Promise<TranslationResult> {
    if (!text || text.trim() === "") {
      throw new Error("Text to translate is empty.");
    }

    if (text.length > (this.options.maxLength || DEFAULT_OPTIONS.maxLength!)) {
      throw new Error(
        `Text exceeds maximum length (${this.options.maxLength}).`
      );
    }

    return this.translateText(text);
  }

  /**
   * Implement actual translation logic (implemented in subclasses)
   * @param text Text to translate
   */
  protected abstract translateText(text: string): Promise<TranslationResult>;

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
  protected async translateText(text: string): Promise<TranslationResult> {
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
   * Translate text using DeepL API
   * @param text Text to translate
   * @returns Translation result
   */
  protected async translateText(text: string): Promise<TranslationResult> {
    try {
      // Convert variables to <keep>variable</keep> format to exclude from translation
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
          // Add XML handling options
          tag_handling: "xml",
          // Set keep tags to not be translated
          ignore_tags: ["keep"],
        },
        {
          headers: {
            Authorization: `DeepL-Auth-Key ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Remove <keep> tags and restore original variable format
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
