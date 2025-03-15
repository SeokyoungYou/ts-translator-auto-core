import axios from "axios";
import dotenv from "dotenv";
import "dotenv/config";
import * as fs from "fs/promises";
import * as path from "path";
import { dirname } from "path";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { LanguageCode, LANGUAGE_CODE_MAPPING, LANGUAGE_NAMES } from "../types";

// ES 모듈에서 __dirname 사용하기 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.local 파일 로드
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

// DeepL API 설정
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL =
  process.env.DEEPL_API_URL || "https://api-free.deepl.com/v2/translate";

// API 키 확인
if (!DEEPL_API_KEY) {
  console.error("❌ DeepL API 키가 설정되지 않았습니다.");
  console.error("💡 .env.local 파일을 확인해주세요.");
  console.error("현재 환경변수 값:", { DEEPL_API_KEY, DEEPL_API_URL });
  process.exit(1);
}

// 지원 언어 설정 - DeepL에서 지원하는 모든 언어
const TARGET_LANGUAGES = Object.values(LANGUAGE_CODE_MAPPING);
type TargetLanguage = LanguageCode;

// 기본적으로 한국어(ko)에서 번역될 대상 언어
const DEFAULT_TARGET_LANGUAGES: TargetLanguage[] = ["en", "ja", "zh-Hans"];

// 번역 타입 정의
type TranslationType = Record<string, string>;

// 변수 패턴을 찾기 위한 정규식
const VARIABLE_PATTERN = /\{([^}]+)\}/g;

/**
 * 사용 가능한 모든 언어 출력
 */
function printAvailableLanguages(): void {
  console.log("\n✅ 사용 가능한 언어 목록:");

  Object.keys(LANGUAGE_NAMES)
    .sort()
    .forEach((code) => {
      const name = LANGUAGE_NAMES[code as LanguageCode];
      console.log(`- ${code}: ${name}`);
    });
}

/**
 * 번역 함수
 * @param text 번역할 텍스트
 * @param targetLang 대상 언어 코드
 * @param sourceLang 원본 언어 코드
 * @returns 번역된 텍스트
 */
async function translateText(
  text: string,
  targetLang: TargetLanguage,
  sourceLang: LanguageCode = "ko"
): Promise<string> {
  try {
    // 변수를 <keep>변수</keep> 형태로 변환
    const textToTranslate = text.replace(
      VARIABLE_PATTERN,
      (match) => `<keep>${match}</keep>`
    );

    const response = await axios.post(
      DEEPL_API_URL,
      {
        text: [textToTranslate],
        target_lang: targetLang.toUpperCase(),
        source_lang: sourceLang.toUpperCase(),
        // XML 처리 옵션 추가
        tag_handling: "xml",
        // keep 태그 내부는 번역하지 않도록 설정
        ignore_tags: ["keep"],
      },
      {
        headers: {
          Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // <keep> 태그 제거하고 원래 변수 형태 복원
    let translatedText = response.data.translations[0].text;
    translatedText = translatedText.replace(/<keep>|<\/keep>/g, "");

    console.log(`✅ "${text}" => "${translatedText}"`);
    return translatedText;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        `❌ 번역 실패: ${text}`,
        error.response?.data || error.message
      );
    } else {
      console.error(`❌ 번역 실패: ${text}`, error);
    }
    return text;
  }
}

/**
 * 번역 파일 생성 함수
 * @param lang 대상 언어 코드
 * @param sourcePath 소스 파일 경로
 * @param outputPath 출력 파일 경로
 */
async function generateTranslationFile(
  lang: TargetLanguage,
  sourcePath: string,
  outputPath: string
) {
  try {
    // 경로에서 파일명과 디렉토리 분리
    const sourceDir = path.dirname(sourcePath);
    const sourceFile = path.basename(sourcePath);
    const sourceBaseName = path.basename(sourceFile, ".ts");

    // ko.ts와 대상 언어 파일 불러오기
    const koModule = await import(`../${sourcePath}`);
    const koContent = koModule[sourceBaseName];

    let existingTranslations: TranslationType = {};
    try {
      // 기존 번역 파일이 있다면 불러오기
      const targetFilePath = `${outputPath}/${lang}`;
      const existingModule = await import(`../${targetFilePath}`);
      existingTranslations = existingModule[lang];
      console.log(`📖 기존 ${targetFilePath}.ts 파일을 불러왔습니다.`);
    } catch (e) {
      console.log(
        `⚠️ 기존 ${outputPath}/${lang}.ts 파일이 없습니다. 새로 생성합니다.`
      );
    }

    // 새로운 번역 객체 생성 (기존 번역 복사)
    const translations: TranslationType = { ...existingTranslations };
    let newKeysCount = 0;

    // 각 키에 대해 번역 수행
    for (const [key, value] of Object.entries(koContent)) {
      // 이미 번역된 키는 건너뛰기
      if (key in translations) {
        continue;
      }

      console.log(`🔄 새로운 키 번역 중: ${key}`);
      const translatedText = await translateText(value as string, lang, "ko");
      translations[key] = translatedText;
      newKeysCount++;
    }

    // 번역 파일 생성
    const outputContent = `export const ${lang} = ${JSON.stringify(
      translations,
      null,
      2
    )} as const;\n`;
    const fullOutputPath = path.join(
      process.cwd(),
      `${outputPath}`,
      `${lang}.ts`
    );

    // 디렉토리가 없으면 생성
    await fs.mkdir(path.dirname(fullOutputPath), { recursive: true });

    await fs.writeFile(fullOutputPath, outputContent, "utf-8");
    console.log(`✨ ${outputPath}/${lang}.ts 파일이 업데이트되었습니다.`);
    console.log(`📊 새로 번역된 키: ${newKeysCount}개`);
  } catch (error) {
    console.error(`❌ ${outputPath}/${lang} 파일 생성 실패:`, error);
  }
}

/**
 * 커맨드라인 인수 파싱
 * @returns 파싱된 옵션들
 */
function parseCommandLineArguments() {
  const args = process.argv.slice(2);
  const options: {
    targetLanguages: TargetLanguage[];
    translationSets: { source: string; output: string }[];
    showHelp: boolean;
    listLanguages: boolean;
  } = {
    targetLanguages: [...DEFAULT_TARGET_LANGUAGES],
    translationSets: [
      { source: "lang/clientData/ko", output: "lang/clientData" },
      { source: "lang/metaData/ko", output: "lang/metaData" },
    ],
    showHelp: false,
    listLanguages: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      options.showHelp = true;
    } else if (arg === "--list-languages" || arg === "-l") {
      options.listLanguages = true;
    } else if (arg === "--lang" || arg === "-t") {
      // 다음 인자가 언어 코드
      if (i + 1 < args.length) {
        const langs = args[++i].split(",");
        // 언어 코드 검증
        const validLangs = langs.filter((lang) =>
          TARGET_LANGUAGES.includes(lang as LanguageCode)
        ) as TargetLanguage[];

        if (validLangs.length > 0) {
          options.targetLanguages = validLangs;
        } else {
          console.warn("⚠️ 유효한 언어 코드가 없습니다. 기본값을 사용합니다.");
        }
      }
    } else if (arg === "--source" || arg === "-s") {
      // 다음 인자가 소스 경로
      if (i + 1 < args.length) {
        const sourcePath = args[++i];
        if (
          sourcePath &&
          i + 1 < args.length &&
          (args[i + 1] === "--output" || args[i + 1] === "-o")
        ) {
          // output 옵션이 다음에 있는 경우
          i++;
          if (i + 1 < args.length) {
            const outputPath = args[++i];
            options.translationSets = [
              { source: sourcePath, output: outputPath },
            ];
          }
        } else {
          // output 옵션이 없는 경우 - 소스 경로의 디렉토리를 출력 경로로 사용
          const outputPath = path.dirname(sourcePath);
          options.translationSets = [
            { source: sourcePath, output: outputPath },
          ];
        }
      }
    }
  }

  return options;
}

/**
 * 도움말 출력
 */
function printHelp() {
  console.log(`
번역 파일 생성 스크립트

사용법:
  npx ts-node src/examples/translate-files.ts [옵션]

옵션:
  -h, --help             도움말 출력
  -l, --list-languages   지원하는 언어 목록 출력
  -t, --lang <codes>     번역할 언어 코드 (쉼표로 구분, 예: en,ja,zh-Hans)
  -s, --source <path>    소스 파일 경로 (ko.ts 파일)
  -o, --output <path>    출력 디렉토리 경로

예시:
  npx ts-node src/examples/translate-files.ts --lang en,ja,fr
  npx ts-node src/examples/translate-files.ts -s lang/custom/ko -o lang/custom
  `);
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log("🚀 번역 시작...");

  // 커맨드라인 인수 파싱
  const options = parseCommandLineArguments();

  // 도움말 출력
  if (options.showHelp) {
    printHelp();
    process.exit(0);
  }

  // 언어 목록 출력
  if (options.listLanguages) {
    printAvailableLanguages();
    process.exit(0);
  }

  // 번역 세트와 언어 정보 출력
  console.log("📋 번역 설정:");
  console.log(`- 대상 언어: ${options.targetLanguages.join(", ")}`);
  console.log("- 번역 세트:");
  options.translationSets.forEach((set) => {
    console.log(`  * 소스: ${set.source}, 출력: ${set.output}`);
  });

  // 각 번역 세트와 언어에 대해 번역 파일 생성
  for (const set of options.translationSets) {
    console.log(`\n🗂️ ${set.source} 세트 번역 시작...`);

    for (const lang of options.targetLanguages) {
      console.log(
        `\n📝 ${lang} (${LANGUAGE_NAMES[lang]}) 번역 파일 생성 중...`
      );
      await generateTranslationFile(lang, set.source, set.output);
    }
  }

  console.log("\n✅ 모든 번역이 완료되었습니다!");
}

// 스크립트 실행
main().catch(console.error);
