import { DeepLTranslator } from "../translator";
import { TranslationOptions } from "../types";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

async function main() {
  // Get API key from environment variable
  const apiKey = process.env.DEEPL_API_KEY;

  if (!apiKey) {
    console.error("❌ DeepL API key is not set.");
    console.error("💡 Please set DEEPL_API_KEY in your .env file.");
    process.exit(1);
  }

  // Set translation options
  const options: TranslationOptions = {
    sourceLanguage: "ko",
    targetLanguage: "en",
    autoDetect: true,
    useCache: true,
  };

  // Create DeepL translator
  const translator = new DeepLTranslator(options, apiKey);

  // Example texts to translate
  const textsToTranslate = [
    "안녕하세요, 오늘은 날씨가 좋네요.",
    "변수 {name}는 중요한 값입니다.",
    "이 {product}의 가격은 {price}원입니다.",
  ];

  // Translate each text and print results
  for (const text of textsToTranslate) {
    try {
      console.log(`🔄 Translating: "${text}"`);
      const result = await translator.translate(text);
      console.log(`✅ Translation result: "${result.translatedText}"`);
    } catch (error) {
      console.error(`❌ Translation failed: ${error}`);
    }
  }

  console.log("✨ Translation completed.");
}

// Run script
main().catch((error) => console.error("❌ Error occurred:", error));
