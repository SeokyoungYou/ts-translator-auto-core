# TS Translator Automation Core

A core library for utilizing various translation APIs written in TypeScript.

## Installation

```bash
npm install ts-translator-auto-core
```

## Features

- Support for various translation services (DeepL, Dummy, etc.)
- Variable pattern preservation (e.g., `{name}`)
- Extensible abstract class-based design
- Type safety support
- Support for all languages supported by DeepL (33 languages)
- Provides language translation automation tools

## Supported Languages

33 languages supported by the DeepL API:

- Arabic (ar)
- Bulgarian (bg)
- Czech (cs)
- Danish (da)
- German (de)
- Greek (el)
- English (US) (en)
- English (UK) (en-GB)
- Spanish (es)
- Estonian (et)
- Finnish (fi)
- French (fr)
- Hungarian (hu)
- Indonesian (id)
- Italian (it)
- Japanese (ja)
- Korean (ko)
- Lithuanian (lt)
- Latvian (lv)
- Norwegian (nb)
- Dutch (nl)
- Polish (pl)
- Portuguese (Portugal) (pt)
- Portuguese (Brazil) (pt-BR)
- Romanian (ro)
- Russian (ru)
- Slovak (sk)
- Slovenian (sl)
- Swedish (sv)
- Turkish (tr)
- Ukrainian (uk)
- Chinese (Simplified) (zh-Hans)
- Chinese (Traditional) (zh-Hant)

## Usage

### Environment Setup

1. Copy the `.env.example` file to create an `.env` file
2. Set up your DeepL API key

```
cp .env.example .env
```

Content of the `.env` file:

```
DEEPL_API_KEY=your_deepl_api_key_here
```

### DeepL Translator Usage Example

```typescript
import { DeepLTranslator } from "ts-translator-auto-core";
import { TranslationOptions } from "ts-translator-auto-core/types";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

async function main() {
  // Set translation options
  const options: TranslationOptions = {
    sourceLanguage: "ko",
    targetLanguage: "en",
    autoDetect: true,
    useCache: true,
  };

  // Create DeepL translator
  const translator = new DeepLTranslator(options, process.env.DEEPL_API_KEY!);

  // Translate text
  const result = await translator.translate(
    "안녕하세요, 변수 {name}는 보존됩니다."
  );
  console.log(result.translatedText);
  // Output: "Hello, the variable {name} is preserved."
}

main().catch(console.error);
```

### Multiple Language Translation Example

```typescript
import { DeepLTranslator } from "ts-translator-auto-core";
import {
  TranslationOptions,
  LanguageCode,
} from "ts-translator-auto-core/types";

async function main() {
  const options: TranslationOptions = {
    sourceLanguage: "ko",
    targetLanguage: "en", // Default value
    autoDetect: false,
  };

  const translator = new DeepLTranslator(options, process.env.DEEPL_API_KEY!);

  // Print all available languages
  console.log("Supported languages list:");
  translator.getSupportedLanguages().forEach((lang) => {
    console.log(`- ${lang}`);
  });

  // Select target languages for translation
  const targetLanguages: LanguageCode[] = ["en", "ja", "zh-Hans", "fr"];
  const text = "안녕하세요, 세계!";

  // Translate to each language
  for (const lang of targetLanguages) {
    // Change options
    const langOptions = { ...options, targetLanguage: lang };
    const langTranslator = new DeepLTranslator(
      langOptions,
      process.env.DEEPL_API_KEY!
    );

    // Execute translation
    const result = await langTranslator.translate(text);
    console.log(`${lang}: ${result.translatedText}`);
  }
}
```

### Translation File Automation Tool

The project includes tools for automating translation files:

```bash
# View all language lists
npx ts-node src/examples/translate-files.ts --list-languages

# Generate translation files for specific languages (en, ja, fr)
npx ts-node src/examples/translate-files.ts --lang en,ja,fr

# Generate translations from a specific source file
npx ts-node src/examples/translate-files.ts --source lang/custom/ko --output lang/custom
```

## Supported Translators

1. **DummyTranslator** - A dummy translator for testing
2. **DeepLTranslator** - A translator using the DeepL API (supports 33 languages)

## License

MIT
