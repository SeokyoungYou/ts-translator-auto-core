# ts-translator-auto-core

TypeScript 기반 번역기의 코어 라이브러리입니다.

## 설치 방법

```bash
npm install ts-translator-auto-core
```

## 사용 방법

### 기본 사용법

```typescript
import { DummyTranslator } from "ts-translator-auto-core";

// 번역기 인스턴스 생성
const translator = new DummyTranslator({
  sourceLanguage: "ko",
  targetLanguage: "en",
});

// 텍스트 번역
async function translateText() {
  try {
    const result = await translator.translate("안녕하세요");
    console.log(result.translatedText); // [번역됨] 안녕하세요
  } catch (error) {
    console.error("번역 오류:", error);
  }
}

translateText();
```

### 사용자 정의 번역기 만들기

```typescript
import {
  Translator,
  TranslationResult,
  LanguageCode,
} from "ts-translator-auto-core";

class MyCustomTranslator extends Translator {
  protected async translateText(text: string): Promise<TranslationResult> {
    // 여기에 실제 번역 API 호출 로직을 구현
    // 예: Google Translate API, DeepL API 등

    // 예시 구현:
    return {
      originalText: text,
      translatedText: `Custom: ${text}`,
      sourceLanguage: this.options.sourceLanguage,
      targetLanguage: this.options.targetLanguage,
    };
  }

  public getSupportedLanguages(): LanguageCode[] {
    return ["ko", "en", "ja"];
  }
}
```

## 지원하는 언어

- 한국어 (`ko`)
- 영어 (`en`)
- 일본어 (`ja`)
- 중국어 (`zh`)
- 스페인어 (`es`)
- 프랑스어 (`fr`)
- 독일어 (`de`)

## 라이센스

MIT
