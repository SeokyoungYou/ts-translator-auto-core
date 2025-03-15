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

  test("텍스트 번역을 수행합니다", async () => {
    const text = "안녕하세요";
    const result = await translator.translate(text);

    expect(result).toEqual({
      originalText: text,
      translatedText: `[번역됨] ${text}`,
      sourceLanguage: options.sourceLanguage,
      targetLanguage: options.targetLanguage,
    });
  });

  test("빈 텍스트 번역 시 에러를 발생시킵니다", async () => {
    await expect(translator.translate("")).rejects.toThrow(
      "번역할 텍스트가 비어있습니다."
    );
  });

  test("지원하는 언어 목록을 반환합니다", () => {
    const languages = translator.getSupportedLanguages();
    expect(languages).toContain("ko");
    expect(languages).toContain("en");
    expect(languages).toHaveLength(7);
  });
});
