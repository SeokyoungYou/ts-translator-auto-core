import { DeepLTranslator } from "../translator";
import { LanguageCode, TranslationOptions, LANGUAGE_NAMES } from "../types";
import dotenv from "dotenv";

// .env 파일 로드
dotenv.config();

/**
 * 사용 가능한 모든 언어 출력
 * @param translator DeepL 번역기 인스턴스
 */
function printAvailableLanguages(translator: DeepLTranslator): void {
  console.log("\n✅ 사용 가능한 언어 목록:");

  const languages = translator.getSupportedLanguageNameMap();
  const languageCodes = translator.getSupportedLanguages();

  languageCodes.forEach((code) => {
    console.log(`- ${code}: ${languages[code]}`);
  });
}

/**
 * 주어진 텍스트를 지정된 언어로 번역
 * @param translator DeepL 번역기 인스턴스
 * @param text 번역할 텍스트
 * @param sourceLanguage 원본 언어 코드
 * @param targetLanguages 번역할 대상 언어 코드 배열
 */
async function translateToMultipleLanguages(
  translator: DeepLTranslator,
  text: string,
  sourceLanguage: LanguageCode,
  targetLanguages: LanguageCode[]
): Promise<void> {
  console.log(`\n📝 원본 텍스트 (${sourceLanguage}): "${text}"`);

  for (const targetLang of targetLanguages) {
    try {
      // 현재 타겟 언어로 번역 옵션 변경
      const options: TranslationOptions = {
        sourceLanguage,
        targetLanguage: targetLang,
        autoDetect: false,
        useCache: true,
      };

      // 새 번역기 인스턴스 생성 (또는 기존 인스턴스 설정 업데이트 방법 사용 가능)
      const langTranslator = new DeepLTranslator(
        options,
        translator["apiKey"],
        translator["apiUrl"]
      );

      // 번역 실행
      console.log(`🔄 '${LANGUAGE_NAMES[targetLang]}'(으)로 번역 중...`);
      const result = await langTranslator.translate(text);

      // 결과 출력
      console.log(
        `✅ ${LANGUAGE_NAMES[targetLang]}: "${result.translatedText}"`
      );
    } catch (error) {
      console.error(`❌ ${targetLang} 번역 실패:`, error);
    }
  }
}

async function main() {
  // 환경 변수에서 API 키 가져오기
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    console.error("❌ DeepL API 키가 설정되지 않았습니다.");
    console.error("💡 .env 파일에 DEEPL_API_KEY를 설정해주세요.");
    process.exit(1);
  }

  // 기본 번역 옵션 설정
  const options: TranslationOptions = {
    sourceLanguage: "ko",
    targetLanguage: "en", // 기본값, 실제로는 아래에서 다양한 언어로 번역
    autoDetect: true,
    useCache: true,
  };

  // DeepL 번역기 생성
  const translator = new DeepLTranslator(options, apiKey);

  // 사용 가능한 언어 출력
  printAvailableLanguages(translator);

  // 번역할 텍스트 예시
  const textsToTranslate = [
    "안녕하세요, 오늘은 날씨가 좋네요.",
    "변수 {name}는 중요한 값입니다.",
    "이 {product}의 가격은 {price}원입니다.",
  ];

  // 번역할 대상 언어 선택 (예시)
  const targetLanguages: LanguageCode[] = [
    "en",
    "ja",
    "zh-Hans",
    "fr",
    "de",
    "es",
  ];

  // 각 텍스트를 여러 언어로 번역
  for (const text of textsToTranslate) {
    await translateToMultipleLanguages(translator, text, "ko", targetLanguages);
  }

  console.log("\n✨ 모든 번역이 완료되었습니다.");
}

// 스크립트 실행
main().catch((error) => console.error("❌ 오류 발생:", error));
