# TS Translator Automation Core

A TypeScript library for automating translations across multiple languages using various translation APIs.

## Key Features

- Variable pattern preservation in translations (e.g., `{name}`)

```typescript
const translator = new DeepLTranslator(options, process.env.DEEPL_API_KEY!);

// Variables like {name} are preserved in translation
const result = await translator.translate(
  "안녕하세요, 변수 {name}는 보존됩니다."
);
console.log(result.translatedText);
// Output: "Hello, the variable {name} is preserved."
```

- Context-based translation for improved accuracy

```typescript
// Without context - might be ambiguous
const result1 = await translator.translate("{count}개");
console.log(result1.translatedText); // Could be "{count} dog" or just "{count}"

// With context - provides better translation
const result2 = await translator.translate("{count}개", "item_count");
console.log(result2.translatedText); // "{count} items"

const result3 = await translator.translate("{count}명", "person_count");
console.log(result3.translatedText); // "{count} people"
```

- Type safety with TypeScript
- Support for all 33 languages available in DeepL API
- Translation automation tools for batch processing

## Installation

```bash
npm install ts-translator-auto-core
```

## Quick Start

### 1. Environment Setup

Create an `.env` file with your DeepL API key:

```bash
cp .env.example .env
```

Then add your API key:

```
DEEPL_API_KEY=your_deepl_api_key_here
```

### 2. Batch Translation with TranslationManager

Translate files with multiple languages at once:

```typescript
import {
  LanguageCode,
  TranslationManager,
  TranslationConfig,
} from "ts-translator-auto-core";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const CONFIG: TranslationConfig = {
  input: {
    directory: path.join(__dirname, "data"),
    file: "ko.ts",
    fileExportName: "default",
  },
  output: {
    directory: path.join(__dirname, "data"),
    prettyPrint: true,
  },
  translation: {
    targetLanguages: [
      "en", // English
      "ja", // Japanese
      "zh-Hans", // Chinese (Simplified)
      "fr", // French
      "de", // German
    ] as LanguageCode[],
    sourceLanguage: "ko" as LanguageCode,
    autoDetect: false,
    useCache: true,
    skipExistingKeys: true,
  },
};

async function main() {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    console.error("❌ DeepL API key is not configured in .env file");
    process.exit(1);
  }

  try {
    const translationManager = new TranslationManager(CONFIG, apiKey);
    await translationManager.translateAll();
    console.log("\n✨ All language translations completed.");
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

main().catch(console.error);
```

### 3. Command-Line Translation Tool

The library includes a CLI tool for translation:

Run the translation tool via npm script by adding to your package.json:

```json
"scripts": {
  "translate-languages": "node -r ts-node/register src/examples/translate-languages.js"
}
```

Then run:

```bash
npm run translate-languages
```

### 4. Output Results

Translation output is organized by language:

- `en.ts` - English
- `ja.ts` - Japanese
- `zhHans.ts` - Chinese (Simplified)
- `fr.ts` - French
- `de.ts` - German

## Supported Translators

- **DeepLTranslator**: Uses DeepL API for high-quality translations
- **DummyTranslator**: For testing and development purposes

## Supported Languages

All 33 languages supported by DeepL API:

| Language     | Code  |     | Language              | Code    |
| ------------ | ----- | --- | --------------------- | ------- |
| Arabic       | ar    |     | Italian               | it      |
| Bulgarian    | bg    |     | Japanese              | ja      |
| Czech        | cs    |     | Korean                | ko      |
| Danish       | da    |     | Lithuanian            | lt      |
| German       | de    |     | Latvian               | lv      |
| Greek        | el    |     | Norwegian             | nb      |
| English (US) | en    |     | Dutch                 | nl      |
| English (UK) | en-GB |     | Polish                | pl      |
| Spanish      | es    |     | Portuguese            | pt      |
| Estonian     | et    |     | Portuguese (Brazil)   | pt-BR   |
| Finnish      | fi    |     | Romanian              | ro      |
| French       | fr    |     | Russian               | ru      |
| Hungarian    | hu    |     | Slovak                | sk      |
| Indonesian   | id    |     | Slovenian             | sl      |
| Swedish      | sv    |     | Ukrainian             | uk      |
| Turkish      | tr    |     | Chinese (Simplified)  | zh-Hans |
|              |       |     | Chinese (Traditional) | zh-Hant |

## License

MIT
