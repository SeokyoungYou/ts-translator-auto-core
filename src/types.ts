/**
 * 번역기에 사용되는 타입 정의
 */

/**
 * 지원하는 언어 코드
 */
export type LanguageCode =
  | "ko" // 한국어
  | "en" // 영어
  | "ja" // 일본어
  | "zh" // 중국어
  | "es" // 스페인어
  | "fr" // 프랑스어
  | "de"; // 독일어

/**
 * 번역 설정 옵션
 */
export interface TranslationOptions {
  /** 소스 언어 코드 */
  sourceLanguage: LanguageCode;
  /** 대상 언어 코드 */
  targetLanguage: LanguageCode;
  /** 자동 감지 여부 (소스 언어가 제공되지 않은 경우) */
  autoDetect?: boolean;
  /** 최대 문자 길이 */
  maxLength?: number;
  /** 캐싱 사용 여부 */
  useCache?: boolean;
}

/**
 * 번역 결과
 */
export interface TranslationResult {
  /** 원본 텍스트 */
  originalText: string;
  /** 번역된 텍스트 */
  translatedText: string;
  /** 소스 언어 (감지된 경우 포함) */
  sourceLanguage: LanguageCode;
  /** 대상 언어 */
  targetLanguage: LanguageCode;
}
