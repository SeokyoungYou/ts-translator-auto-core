# 다국어 번역 예제

이 디렉토리에는 TypeScript 번역기 라이브러리를 사용하는 다양한 예제가 포함되어 있습니다.

## 다국어 번역 예제 (multi-language-example.ts)

`ko.ts` 파일에 정의된 한국어 문자열을 여러 언어로 번역하고 결과를 파일로 저장하는 예제입니다.

### 기능

- 한국어 문자열을 5개 언어(영어, 일본어, 중국어(간체), 프랑스어, 독일어)로 번역
- 각 문자열의 키를 컨텍스트로 사용하여 번역 품질 향상
- 번역 결과를 TypeScript 파일로 저장

### 설치 및 준비

1. 의존성 설치:

   ```bash
   npm install
   ```

2. `.env` 파일에 DeepL API 키 설정:
   ```
   DEEPL_API_KEY=your_deepl_api_key
   ```

### 실행 방법

스크립트를 직접 실행하는 방법:

```bash
# 실행 권한 부여
chmod +x src/examples/translate-languages.js

# 스크립트 실행
./src/examples/translate-languages.js
```

또는 `npm` 스크립트를 통해 실행:

```bash
npm run translate-languages
```

> 참고: 이 스크립트를 실행하려면 `package.json`에 다음과 같은 스크립트를 추가해야 합니다:
>
> ```json
> "scripts": {
>   "translate-languages": "node -r ts-node/register src/examples/translate-languages.js"
> }
> ```

### 출력 결과

번역 결과는 `src/examples/output` 디렉토리에 저장됩니다. 각 언어별로 다음과 같은 형식의 파일이 생성됩니다:

- `en.ts` - 영어 번역
- `ja.ts` - 일본어 번역
- `zhHans.ts` - 중국어(간체) 번역
- `fr.ts` - 프랑스어 번역
- `de.ts` - 독일어 번역

## 기타 예제

- `deepl-example.ts`: DeepL API를 사용한 번역 예제
