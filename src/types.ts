/**
 * 번역기에 사용되는 타입 정의
 */

/**
 * 지원하는 언어 코드
 */
export type LanguageCode =
  | "ar" // 아랍어
  | "bg" // 불가리아어
  | "cs" // 체코어
  | "da" // 덴마크어
  | "de" // 독일어
  | "el" // 그리스어
  | "en" // 영어 (미국)
  | "en-GB" // 영어 (영국)
  | "es" // 스페인어
  | "et" // 에스토니아어
  | "fi" // 핀란드어
  | "fr" // 프랑스어
  | "hu" // 헝가리어
  | "id" // 인도네시아어
  | "it" // 이탈리아어
  | "ja" // 일본어
  | "ko" // 한국어
  | "lt" // 리투아니아어
  | "lv" // 라트비아어
  | "nb" // 노르웨이어
  | "nl" // 네덜란드어
  | "pl" // 폴란드어
  | "pt" // 포르투갈어 (포르투갈)
  | "pt-BR" // 포르투갈어 (브라질)
  | "ro" // 루마니아어
  | "ru" // 러시아어
  | "sk" // 슬로바키아어
  | "sl" // 슬로베니아어
  | "sv" // 스웨덴어
  | "tr" // 터키어
  | "uk" // 우크라이나어
  | "zh-Hans" // 중국어 (간체)
  | "zh-Hant"; // 중국어 (번체)

/**
 * 언어 코드 매핑 (파일명을 API 코드로 변환)
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
 * 언어명 매핑 (코드를 언어명으로 변환)
 */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  ar: "아랍어",
  bg: "불가리아어",
  cs: "체코어",
  da: "덴마크어",
  de: "독일어",
  el: "그리스어",
  en: "영어 (미국)",
  "en-GB": "영어 (영국)",
  es: "스페인어",
  et: "에스토니아어",
  fi: "핀란드어",
  fr: "프랑스어",
  hu: "헝가리어",
  id: "인도네시아어",
  it: "이탈리아어",
  ja: "일본어",
  ko: "한국어",
  lt: "리투아니아어",
  lv: "라트비아어",
  nb: "노르웨이어",
  nl: "네덜란드어",
  pl: "폴란드어",
  pt: "포르투갈어 (포르투갈)",
  "pt-BR": "포르투갈어 (브라질)",
  ro: "루마니아어",
  ru: "러시아어",
  sk: "슬로바키아어",
  sl: "슬로베니아어",
  sv: "스웨덴어",
  tr: "터키어",
  uk: "우크라이나어",
  "zh-Hans": "중국어 (간체)",
  "zh-Hant": "중국어 (번체)",
};

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
