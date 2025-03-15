import { DummyTranslator } from "../translator";
import { TranslationOptions } from "../types";

describe("DummyTranslator", () => {
  const options: TranslationOptions = {
    sourceLanguage: "ko",
    targetLanguage: "en",
    autoDetect: true,
    useCache: true,
  };

  let translator: DummyTranslator;

  beforeEach(() => {
    translator = new DummyTranslator(options);
  });

  test("performs text translation", async () => {
    const text = "안녕하세요";
    const result = await translator.translate(text);

    expect(result).toEqual({
      originalText: text,
      translatedText: `[Translated] ${text}`,
      sourceLanguage: options.sourceLanguage,
      targetLanguage: options.targetLanguage,
    });
  });

  test("throws an error when translating empty text", async () => {
    await expect(translator.translate("")).rejects.toThrow(
      "Text to translate is empty."
    );
  });

  test("returns a list of supported languages", () => {
    const languages = translator.getSupportedLanguages();
    expect(languages).toContain("ko");
    expect(languages).toContain("en");
    expect(languages).toHaveLength(7);
  });
});
