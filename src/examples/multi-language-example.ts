import { LanguageCode } from "../types";
import dotenv from "dotenv";
import path from "path";
import { TranslationManager, TranslationConfig } from "../manager";

// .env 파일 로드
dotenv.config();

// ===== 설정 =====
// 입력/출력 디렉토리 설정 (필요에 따라 수정하세요)
const CONFIG: TranslationConfig = {
  // 입력 파일 설정
  input: {
    directory: path.join(__dirname, "data"),
    file: "ko.ts", // 입력 파일명
    fileExportName: "default", // 파일 내 export 이름
  },
  // 출력 설정
  output: {
    directory: path.join(__dirname, "data"),
    prettyPrint: true, // JSON 출력 시 들여쓰기 적용
  },
  // 번역 설정
  translation: {
    // 번역할 언어 목록
    targetLanguages: [
      "en", // 영어 (미국)
      //   "ja", // 일본어
      //   "zh-Hans", // 중국어 (간체)
      //   "fr", // 프랑스어
      //   "de", // 독일어
    ] as LanguageCode[],
    sourceLanguage: "ko" as LanguageCode, // 원본 언어
    autoDetect: false, // 언어 자동 감지
    useCache: true, // 번역 캐시 사용
    skipExistingKeys: true, // 이미 번역된 키 건너뛰기
  },
};

async function main() {
  // API 키 환경 변수에서 가져오기
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    console.error("❌ DeepL API 키가 설정되지 않았습니다.");
    console.error("💡 .env 파일에 DEEPL_API_KEY를 설정해 주세요.");
    process.exit(1);
  }

  try {
    // TranslationManager 인스턴스 생성
    const translationManager = new TranslationManager(CONFIG, apiKey);

    // 모든 언어 번역 실행
    await translationManager.translateAll();

    console.log("\n✨ 모든 언어 번역이 완료되었습니다.");
  } catch (error) {
    console.error(`❌ 번역 과정에서 오류가 발생했습니다: ${error}`);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch((error) => console.error("❌ 오류 발생:", error));
}

export { main };
