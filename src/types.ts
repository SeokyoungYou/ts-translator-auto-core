/**
 * Type definitions used for translators
 */

/**
 * Supported language codes
 */
export type LanguageCode =
  | "ar" // Arabic
  | "bg" // Bulgarian
  | "cs" // Czech
  | "da" // Danish
  | "de" // German
  | "el" // Greek
  | "en" // English (US)
  | "en-GB" // English (UK)
  | "es" // Spanish
  | "et" // Estonian
  | "fi" // Finnish
  | "fr" // French
  | "hu" // Hungarian
  | "id" // Indonesian
  | "it" // Italian
  | "ja" // Japanese
  | "ko" // Korean
  | "lt" // Lithuanian
  | "lv" // Latvian
  | "nb" // Norwegian
  | "nl" // Dutch
  | "pl" // Polish
  | "pt" // Portuguese (Portugal)
  | "pt-BR" // Portuguese (Brazil)
  | "ro" // Romanian
  | "ru" // Russian
  | "sk" // Slovak
  | "sl" // Slovenian
  | "sv" // Swedish
  | "tr" // Turkish
  | "uk" // Ukrainian
  | "zh-Hans" // Chinese (Simplified)
  | "zh-Hant"; // Chinese (Traditional)

/**
 * Language code mapping (converts file names to API codes)
 */
export const LANGUAGE_CODE_MAPPING: Record<string, LanguageCode> = {
  ar: "ar",
  bg: "bg",
  cs: "cs",
  da: "da",
  de: "de",
  el: "el",
  en: "en",
  enGb: "en-GB",
  es: "es",
  et: "et",
  fi: "fi",
  fr: "fr",
  hu: "hu",
  id: "id",
  it: "it",
  ja: "ja",
  ko: "ko",
  lt: "lt",
  lv: "lv",
  nb: "nb",
  nl: "nl",
  pl: "pl",
  pt: "pt",
  ptBr: "pt-BR",
  ro: "ro",
  ru: "ru",
  sk: "sk",
  sl: "sl",
  sv: "sv",
  tr: "tr",
  uk: "uk",
  zhHans: "zh-Hans",
  zhHant: "zh-Hant",
};

/**
 * Language name mapping (converts codes to language names)
 */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  ar: "Arabic",
  bg: "Bulgarian",
  cs: "Czech",
  da: "Danish",
  de: "German",
  el: "Greek",
  en: "English (US)",
  "en-GB": "English (UK)",
  es: "Spanish",
  et: "Estonian",
  fi: "Finnish",
  fr: "French",
  hu: "Hungarian",
  id: "Indonesian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  lt: "Lithuanian",
  lv: "Latvian",
  nb: "Norwegian",
  nl: "Dutch",
  pl: "Polish",
  pt: "Portuguese (Portugal)",
  "pt-BR": "Portuguese (Brazil)",
  ro: "Romanian",
  ru: "Russian",
  sk: "Slovak",
  sl: "Slovenian",
  sv: "Swedish",
  tr: "Turkish",
  uk: "Ukrainian",
  "zh-Hans": "Chinese (Simplified)",
  "zh-Hant": "Chinese (Traditional)",
};

/**
 * Translation configuration options
 */
export interface TranslationOptions {
  /** Source language code */
  sourceLanguage: LanguageCode;
  /** Target language code */
  targetLanguage: LanguageCode;
  /** Auto detection option (if source language is not provided) */
  autoDetect?: boolean;
  /** Maximum character length */
  maxLength?: number;
  /** Whether to use caching */
  useCache?: boolean;
  /** Delay between consecutive requests in milliseconds */
  delayBetweenRequests?: number;
  /** Maximum number of retry attempts on failure */
  maxRetries?: number;
  /** Base delay in milliseconds before retrying after a failure */
  retryDelay?: number;
  /** Whether to use context for translation (if provided) */
  useContext?: boolean;
  /** Whether to use only the value for translation (ignoring context) */
  valueOnly?: boolean;
}

/**
 * Translation result
 */
export interface TranslationResult {
  /** Original text */
  originalText: string;
  /** Translated text */
  translatedText: string;
  /** Source language (including detected if applicable) */
  sourceLanguage: LanguageCode;
  /** Target language */
  targetLanguage: LanguageCode;
}

/**
 * 출력 파일 이름 포맷 옵션
 */
export type FileNameFormat =
  | "default" // 그대로 유지 (예: "zh-Hans")
  | "simple" // 하이픈 제거 (예: "zhHans")
  | "camelCase" // 카멜 케이스 (예: "zhHans")
  | "pascalCase" // 파스칼 케이스 (예: "ZhHans")
  | "snake_case" // 스네이크 케이스 (예: "zh_hans")
  | "kebab-case"; // 케밥 케이스 (예: "zh-hans")
