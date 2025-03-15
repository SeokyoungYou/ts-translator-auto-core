import { DeepLTranslator } from "../translator";
import { TranslationOptions } from "../types";
import dotenv from "dotenv";

// .env 파일 로드
dotenv.config();

async function main() {
  // 환경 변수에서 API 키 가져오기
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    console.error("❌ DeepL API 키가 설정되지 않았습니다.");
    console.error("💡 .env 파일에 DEEPL_API_KEY를 설정해주세요.");
    process.exit(1);
  }

  // 번역 옵션 설정
  const options: TranslationOptions = {
    sourceLanguage: "ko",
    targetLanguage: "en",
    autoDetect: true,
    useCache: true,
  };

  // DeepL 번역기 생성
  const translator = new DeepLTranslator(options, apiKey);

  // 번역할 텍스트 예시
  const textsToTranslate = [
    "안녕하세요, 오늘은 날씨가 좋네요.",
    "변수 {name}는 중요한 값입니다.",
    "이 {product}의 가격은 {price}원입니다.",
  ];

  // 각 텍스트 번역 및 결과 출력
  for (const text of textsToTranslate) {
    try {
      console.log(`🔄 번역 중: "${text}"`);
      const result = await translator.translate(text);
      console.log(`✅ 번역 결과: "${result.translatedText}"`);
    } catch (error) {
      console.error(`❌ 번역 실패: ${error}`);
    }
  }

  console.log("✨ 번역이 완료되었습니다.");
}

// 스크립트 실행
main().catch((error) => console.error("❌ 오류 발생:", error));
