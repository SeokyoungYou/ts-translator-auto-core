# TS Translator Automation Core

A TypeScript library for automating translations across multiple languages using various translation APIs.

## Key Features

- Variable pattern preservation in translations (e.g., `{name}`)
- Context-based translation for improved accuracy
- Type safety with TypeScript
- Support for all 33 languages available in DeepL API
- Translation automation tools for batch processing
- **Dual module system support (ESM and CommonJS)**

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

### 2. Dual Module System Support

This package supports both ESM and CommonJS module systems:

#### ESM (ECMAScript Modules)

```javascript
// Using ESM import syntax
import { DeepLTranslator, TranslationManager } from "ts-translator-auto-core";

const translator = new DeepLTranslator(
  {
    sourceLanguage: "ko",
    targetLanguage: "en",
    autoDetect: false,
  },
  "your_api_key"
);
```

#### CommonJS

```javascript
// Using CommonJS require syntax
const {
  DeepLTranslator,
  TranslationManager,
} = require("ts-translator-auto-core");

const translator = new DeepLTranslator(
  {
    sourceLanguage: "ko",
    targetLanguage: "en",
    autoDetect: false,
  },
  "your_api_key"
);
```

#### Module Compatibility Test

You can test module compatibility with the provided example scripts:

```bash
# Test ESM compatibility
npm run test:esm

# Test CommonJS compatibility
npm run test:cjs

# Test both module systems
npm run test:modules
```

### 3. Batch Translation with TranslationManager

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

### 4. Command-Line Translation Tool

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

### 5. Output Results

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
