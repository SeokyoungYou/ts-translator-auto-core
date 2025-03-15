# TS Translator Automation Core

A TypeScript library for automating translations across multiple languages using various translation APIs.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/SeokyoungYou/ts-translator-auto-core)

## Key Features

- Variable pattern preservation in translations (e.g., `{name}`)
- Context-based translation for improved accuracy
- Type safety with TypeScript
- Support for all 33 languages available in DeepL API
- Translation automation tools for batch processing
- **Dual module system support (ESM and CommonJS)**
- **Rate limiting protection with automatic retry and delay**

## Demo

![Mar-16-2025 00-06-41](https://github.com/user-attachments/assets/218b5853-7a11-480a-a364-15338acf3078)

## Installation

```bash
npm install ts-translator-auto-core
```

## Quick Start

### Environment Setup

Create an `.env` file with your DeepL API key:

```bash
cp .env.example .env
```

Then add your API key:

```
DEEPL_API_KEY=your_deepl_api_key_here
```

### Example Projects

This library includes examples that can be used in various module system environments:

##### CommonJS Example (src/examples/cjs-example)

An example using Node.js CommonJS module system.

```javascript
// index.js
const { TranslationManager } = require("ts-translator-auto-core");

// Create TranslationManager instance
const translationManager = new TranslationManager(CONFIG, apiKey);

// Execute translation for all languages
await translationManager.translateAll();
```

How to run:

```bash
cd src/examples/cjs-example
npm install
node index.js
```

##### ESM Example (src/examples/esm-example)

A TypeScript example using ECMAScript module system.

```typescript
// index.ts
import {
  TranslationManager,
  TranslationConfig,
  LanguageCode,
} from "ts-translator-auto-core";

// Create TranslationManager instance with ESM module path workaround
const translationManager = new TranslationManager(CONFIG, apiKey);

// Execute translation for all languages
await translationManager.translateAll();
```

How to run:

```bash
cd src/examples/esm-example
npm install
npm run translate
```

##### Dual Module System Example (src/examples/module-example)

An example that works in both ESM and CommonJS environments.

```typescript
// package.json with "type": "module" setting
{
  "name": "ts-translator-module-example",
  "type": "module",
  "scripts": {
    "translate": "tsx index.ts"
  }
}
```

How to run:

```bash
cd src/examples/module-example
npm install
npm run translate
```

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

## Advanced Configuration

### Rate Limiting and API Protection

To avoid rate limiting errors (429 Too Many Requests), you can configure delay between requests and automatic retries:

```typescript
import { TranslationManager, DeepLTranslator } from "ts-translator-auto-core";

// Create translator with rate limiting configuration
const translator = new DeepLTranslator(
  {
    sourceLanguage: "en",
    targetLanguage: "ko",
    // Add delay between requests (milliseconds)
    delayBetweenRequests: 1000,
    // Configure retry behavior
    maxRetries: 3,
    retryDelay: 2000,
  },
  apiKey
);

// Or configure through TranslationManager
const translationManager = new TranslationManager(
  {
    // ...your config
    translationOptions: {
      delayBetweenRequests: 1000,
      maxRetries: 3,
      retryDelay: 2000,
    },
  },
  apiKey
);
```

The system automatically handles:

- Maintaining delay between consecutive API requests
- Exponential backoff for rate limit errors (429)
- Automatic retry for temporary server errors (5xx)
