# TS 번역기 자동화 코어

TypeScript로 작성된 다양한 번역 API를 사용할 수 있는 코어 라이브러리입니다.

## 설치

```bash
npm install ts-translator-auto-core
```

## 기능

- 다양한 번역 서비스 지원 (DeepL, Dummy 등)
- 변수 패턴 보존 (예: `{name}`)
- 확장 가능한 추상 클래스 기반 설계
- 타입 안전성 지원
- DeepL에서 지원하는 모든 언어 지원 (33개 언어)
- 언어 간 번역 자동화 도구 제공

## 지원하는 언어

DeepL API에서 지원하는 33개 언어:

- 아랍어 (ar)
- 불가리아어 (bg)
- 체코어 (cs)
- 덴마크어 (da)
- 독일어 (de)
- 그리스어 (el)
- 영어 (미국) (en)
- 영어 (영국) (en-GB)
- 스페인어 (es)
- 에스토니아어 (et)
- 핀란드어 (fi)
- 프랑스어 (fr)
- 헝가리어 (hu)
- 인도네시아어 (id)
- 이탈리아어 (it)
- 일본어 (ja)
- 한국어 (ko)
- 리투아니아어 (lt)
- 라트비아어 (lv)
- 노르웨이어 (nb)
- 네덜란드어 (nl)
- 폴란드어 (pl)
- 포르투갈어 (포르투갈) (pt)
- 포르투갈어 (브라질) (pt-BR)
- 루마니아어 (ro)
- 러시아어 (ru)
- 슬로바키아어 (sk)
- 슬로베니아어 (sl)
- 스웨덴어 (sv)
- 터키어 (tr)
- 우크라이나어 (uk)
- 중국어 (간체) (zh-Hans)
- 중국어 (번체) (zh-Hant)

## 사용 방법

### 환경 설정

1. `.env.example` 파일을 복사하여 `.env` 파일 생성
2. DeepL API 키를 설정

```
cp .env.example .env
```

`.env` 파일 내용:

```
DEEPL_API_KEY=your_deepl_api_key_here
```

### DeepL 번역기 사용 예시

```typescript
import { DeepLTranslator } from "ts-translator-auto-core";
import { TranslationOptions } from "ts-translator-auto-core/types";
import dotenv from "dotenv";

// .env 파일 로드
dotenv.config();

async function main() {
  // 번역 옵션 설정
  const options: TranslationOptions = {
    sourceLanguage: "ko",
    targetLanguage: "en",
    autoDetect: true,
    useCache: true,
  };

  // DeepL 번역기 생성
  const translator = new DeepLTranslator(options, process.env.DEEPL_API_KEY!);

  // 텍스트 번역
  const result = await translator.translate(
    "안녕하세요, 변수 {name}는 보존됩니다."
  );
  console.log(result.translatedText);
  // 출력: "Hello, the variable {name} is preserved."
}

main().catch(console.error);
```

### 다중 언어 번역 예시

```typescript
import { DeepLTranslator } from "ts-translator-auto-core";
import {
  TranslationOptions,
  LanguageCode,
} from "ts-translator-auto-core/types";

async function main() {
  const options: TranslationOptions = {
    sourceLanguage: "ko",
    targetLanguage: "en", // 기본값
    autoDetect: false,
  };

  const translator = new DeepLTranslator(options, process.env.DEEPL_API_KEY!);

  // 사용 가능한 모든 언어 출력
  console.log("지원하는 언어 목록:");
  translator.getSupportedLanguages().forEach((lang) => {
    console.log(`- ${lang}`);
  });

  // 번역할 대상 언어 선택
  const targetLanguages: LanguageCode[] = ["en", "ja", "zh-Hans", "fr"];
  const text = "안녕하세요, 세계!";

  // 각 언어로 번역
  for (const lang of targetLanguages) {
    // 옵션 변경
    const langOptions = { ...options, targetLanguage: lang };
    const langTranslator = new DeepLTranslator(
      langOptions,
      process.env.DEEPL_API_KEY!
    );

    // 번역 실행
    const result = await langTranslator.translate(text);
    console.log(`${lang}: ${result.translatedText}`);
  }
}
```

### 번역 파일 자동화 도구

프로젝트에는 번역 파일 자동화를 위한 도구가 포함되어 있습니다:

```bash
# 모든 언어 목록 보기
npx ts-node src/examples/translate-files.ts --list-languages

# 특정 언어로 번역 파일 생성 (en, ja, fr)
npx ts-node src/examples/translate-files.ts --lang en,ja,fr

# 특정 소스 파일에서 번역 생성
npx ts-node src/examples/translate-files.ts --source lang/custom/ko --output lang/custom
```

## 지원하는 번역기

1. **DummyTranslator** - 테스트용 더미 번역기
2. **DeepLTranslator** - DeepL API를 사용한 번역기 (33개 언어 지원)

## License

MIT
