import {
  LanguageCode,
  TranslationOptions,
  TranslationResult,
  LANGUAGE_CODE_MAPPING,
  LANGUAGE_NAMES,
} from "./types";
import axios, { AxiosError, AxiosResponse } from "axios";

/**
 * Default translation options
 */
const DEFAULT_OPTIONS: Partial<TranslationOptions> = {
  autoDetect: true,
  useCache: true,
  maxLength: 5000,
  delayBetweenRequests: 1000,
  maxRetries: 3,
  retryDelay: 2000,
  useContext: true,
  valueOnly: false,
};

/**
 * 특정 언어 문자 범위 정의
 */
const LANGUAGE_CHAR_PATTERNS = {
  // 영어와 일반 구두점, 숫자는 모든 언어에서 공통으로 사용
  common: /^[a-zA-Z0-9\s.,!?():\-'"]+$/,
  // 한국어
  ko: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/,
  // 중국어 (간체 및 번체)
  zh: /[\u4E00-\u9FFF\u3400-\u4DBF]/,
  // 일본어 (히라가나, 가타카나, 한자)
  ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/,
  // 아랍어
  ar: /[\u0600-\u06FF]/,
  // 러시아어 (키릴 문자)
  ru: /[\u0400-\u04FF]/,
  // 히브리어
  he: /[\u0590-\u05FF]/,
  // 태국어
  th: /[\u0E00-\u0E7F]/,
};

/**
 * Base Translator class
 * Actual translation logic must be implemented in subclasses.
 */
export abstract class Translator {
  protected options: TranslationOptions;

  /**
   * Translator constructor
   * @param options Translation options
   */
  constructor(options: TranslationOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options } as TranslationOptions;
  }

  /**
   * Translate text
   * @param text Text to translate
   * @param context Optional context key to provide more context for translation
   * @returns Translation result promise
   */
  public async translate(
    text: string,
    context?: string
  ): Promise<TranslationResult> {
    if (!text || text.trim() === "") {
      throw new Error("Text to translate is empty.");
    }

    if (text.length > (this.options.maxLength || DEFAULT_OPTIONS.maxLength!)) {
      throw new Error(
        `Text exceeds maximum length (${this.options.maxLength}).`
      );
    }

    return this.translateText(text, context);
  }

  /**
   * Implement actual translation logic (implemented in subclasses)
   * @param text Text to translate
   * @param context Optional context key to provide more context for translation
   */
  protected abstract translateText(
    text: string,
    context?: string
  ): Promise<TranslationResult>;

  /**
   * Return list of supported languages
   */
  public abstract getSupportedLanguages(): LanguageCode[];
}

/**
 * Basic translator implementation (for example)
 * In practice, you should use an external API or implement specific translation logic.
 */
export class DummyTranslator extends Translator {
  protected async translateText(
    text: string,
    context?: string
  ): Promise<TranslationResult> {
    // In a real implementation, you would call an external API, etc.
    // This example provides a simple dummy implementation.
    return {
      originalText: text,
      translatedText: `[Translated] ${text}`,
      sourceLanguage: this.options.sourceLanguage,
      targetLanguage: this.options.targetLanguage,
    };
  }

  public getSupportedLanguages(): LanguageCode[] {
    return ["ko", "en", "ja", "zh-Hans", "es", "fr", "de"];
  }
}

/**
 * Translator implementation using DeepL API
 */
export class DeepLTranslator extends Translator {
  private apiKey: string;
  private apiUrl: string;
  private readonly VARIABLE_PATTERN = /\{([^}]+)\}/g;
  private readonly CONTEXT_DELIMITER: string;
  private readonly VARIABLE_PREFIX: string;
  private readonly VARIABLE_SUFFIX: string;
  private lastRequestTime: number = 0;
  private currentDelay: number;

  /**
   * DeepL Translator constructor
   * @param options Translation options
   * @param apiKey DeepL API key
   * @param apiUrl DeepL API URL (default: https://api-free.deepl.com/v2/translate)
   */
  constructor(
    options: TranslationOptions,
    apiKey: string,
    apiUrl: string = "https://api-free.deepl.com/v2/translate"
  ) {
    super(options);

    if (!apiKey) {
      throw new Error("DeepL API key is required.");
    }

    this.apiKey = apiKey;
    this.apiUrl = apiUrl;

    // 아랍어인 경우 딜레이 시간 증가 (API 응답 안정성 개선)
    const isArabic = options.targetLanguage === "ar";
    if (isArabic && options.delayBetweenRequests === undefined) {
      // 아랍어의 경우 기본 딜레이를 더 길게 설정 (1초 -> 1.5초)
      this.currentDelay = 1500;
      console.info(
        "Arabic translation: Increased delay between requests for stability"
      );
    } else {
      this.currentDelay =
        this.options.delayBetweenRequests ||
        DEFAULT_OPTIONS.delayBetweenRequests!;
    }

    // Context delimiter is unique to each instance
    const randomId = Math.random().toString(36).substring(2, 10);
    this.CONTEXT_DELIMITER = `__DEEPL_CTX_${randomId}__`;
    this.VARIABLE_PREFIX = `__DEEPL_VAR_${randomId}_`;
    this.VARIABLE_SUFFIX = `__`;
  }

  /**
   * Convert language code to DeepL API format
   * @param langCode Language code
   * @returns Language code in DeepL API format
   */
  private formatLanguageCodeForApi(langCode: LanguageCode): string {
    // DeepL API requires language codes in a specific format
    // en-GB → EN-GB, zh-Hans → ZH, pt-BR → PT-BR, etc.
    return langCode.toUpperCase();
  }

  /**
   * 요청 사이의 딜레이를 적용하는 함수
   * @private
   */
  private async applyRequestDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (this.lastRequestTime && timeSinceLastRequest < this.currentDelay) {
      const waitTime = this.currentDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * 텍스트에 특정 언어의 문자가, 해당 언어가 타겟 언어와 일치하는지 확인
   * @param text 검사할 텍스트
   * @param targetLanguage 타겟 언어 코드
   * @returns {boolean} 올바른 언어로만 구성되었으면 true, 아니면 false
   */
  private isTextInExpectedLanguage(
    text: string,
    targetLanguage: LanguageCode
  ): { valid: boolean; detectedLanguages: string[] } {
    // 변수 패턴 제거 (언어 검증에서 제외)
    const textWithoutVars = text.replace(this.VARIABLE_PATTERN, "");

    // 공통 문자 (영어, 숫자, 구두점) 제거
    const textWithoutCommon = textWithoutVars.replace(
      /[a-zA-Z0-9\s.,!?():\-'"]/g,
      ""
    );

    // 텍스트가 비어있으면 공통 문자만 포함하므로 유효함
    if (textWithoutCommon.length === 0) {
      return { valid: true, detectedLanguages: ["common"] };
    }

    // 감지된 언어들 저장
    const detectedLanguages: string[] = [];

    // 각 언어 패턴으로 검사
    for (const [langCode, pattern] of Object.entries(LANGUAGE_CHAR_PATTERNS)) {
      if (langCode === "common") continue; // 공통 패턴은 이미 제거됨

      if (pattern.test(textWithoutCommon)) {
        detectedLanguages.push(langCode);
      }
    }

    // 타겟 언어 약어 추출 (zh-Hans -> zh)
    const targetLangBase = targetLanguage.split("-")[0];

    // 감지된 언어 중 타겟 언어가 있는지 확인
    const hasTargetLang = detectedLanguages.some(
      (lang) => lang === targetLangBase
    );

    // 다른 언어들도 있는지 확인
    const hasOtherLangs = detectedLanguages.some(
      (lang) => lang !== targetLangBase && lang !== "common"
    );

    // 타겟 언어만 있거나, 아무 언어도 감지되지 않으면 유효함
    const valid =
      (hasTargetLang && !hasOtherLangs) || detectedLanguages.length === 0;

    return { valid, detectedLanguages };
  }

  /**
   * Translation post-processing and validation
   */
  private async postProcessTranslation(
    translatedText: string,
    originalText: string,
    variables: { start: number; end: number; name: string }[],
    context?: string
  ): Promise<string> {
    let processedText = translatedText;
    let needsReTranslation = false;
    let autoFixApplied = false;
    const issues: string[] = [];

    // Restore variable tags to their original variable format
    for (let i = 0; i < variables.length; i++) {
      const varName = variables[i].name;
      const varPattern = new RegExp(
        `${this.VARIABLE_PREFIX}${i}${this.VARIABLE_SUFFIX}`,
        "g"
      );
      processedText = processedText.replace(varPattern, `{${varName}}`);
    }

    // 아랍어 특수 처리
    const isArabic = this.options.targetLanguage === "ar";
    if (isArabic) {
      // RTL 마커 제거 (‏ 문자, \u200F)
      processedText = processedText.replace(/\u200F/g, "");

      // 아랍어에서 종종 발생하는 불필요한 공백 제거
      processedText = processedText.replace(/\s+/g, " ").trim();

      // 이상한 패턴 정리 (예: _0__, _개)
      processedText = processedText.replace(/_\d+__/g, "");
      processedText = processedText.replace(/_개/g, "");
    }

    // Check for any DEEPL_CTX pattern and remove it (improved pattern)
    const ctxPattern = /__DEEPL_CTX[a-z0-9_]*__/g;
    if (ctxPattern.test(processedText)) {
      issues.push(`Context delimiter pattern found in translation result`);
      processedText = processedText.replace(ctxPattern, "");
      autoFixApplied = true;
    }

    // Check for partial variable delimiters (like DEEPL_VAR_ without full pattern)
    if (
      processedText.includes("DEEPL_VAR_") ||
      processedText.includes("__DEEPL_VAR")
    ) {
      issues.push(`Partial variable delimiters found in translation result`);
      autoFixApplied = true;

      // Try to match any partial variable identifier pattern
      const partialVarPattern =
        /(?:DEEPL_VAR_[a-z0-9]+_\d+__)|(?:__DEEPL_VAR_[a-z0-9]+_\d+)|(?:DEEPL_VAR_\d+__)/g;
      const matches = processedText.match(partialVarPattern);

      if (matches) {
        console.warn(
          `Found partial variable identifiers: ${matches.join(", ")}`
        );

        // Process each partial identifier
        for (const match of matches) {
          // Try to extract index from the partial identifier
          const indexMatch = match.match(/(\d+)/);
          if (
            indexMatch &&
            indexMatch[1] &&
            variables[parseInt(indexMatch[1], 10)]
          ) {
            const index = parseInt(indexMatch[1], 10);
            const varName = variables[index].name;
            processedText = processedText.replace(match, `{${varName}}`);
            console.info(`Restored partial variable ${match} to {${varName}}`);
          } else {
            // If can't determine which variable it is, remove it
            processedText = processedText.replace(match, "");
            console.warn(`Removed unidentifiable partial variable: ${match}`);
          }
        }
      }

      // Generic cleanup for any remaining base identifiers
      processedText = processedText.replace(/DEEPL_VAR_[a-z0-9_]+/g, "");
    }

    // 1. Check if variable count is maintained
    const originalVarCount = (originalText.match(this.VARIABLE_PATTERN) || [])
      .length;
    const translatedVarCount = (
      processedText.match(this.VARIABLE_PATTERN) || []
    ).length;

    if (originalVarCount !== translatedVarCount) {
      issues.push(
        `Variable count mismatch: original=${originalVarCount}, translated=${translatedVarCount}`
      );

      // Auto-fix: Restore missing variables
      if (translatedVarCount < originalVarCount) {
        // Extract original variables
        const originalVars: string[] = [];
        let match;
        const pattern = new RegExp(this.VARIABLE_PATTERN);
        let tempText = originalText;

        while ((match = pattern.exec(tempText)) !== null) {
          originalVars.push(match[0]);
          // Modify temp text to reset pattern
          tempText =
            tempText.substring(0, match.index) +
            "".padStart(match[0].length, " ") +
            tempText.substring(match.index + match[0].length);
        }

        // Find missing variables in translated text
        const translatedVars: string[] = [];
        tempText = processedText;

        while ((match = pattern.exec(tempText)) !== null) {
          translatedVars.push(match[0]);
          // Modify temp text to reset pattern
          tempText =
            tempText.substring(0, match.index) +
            "".padStart(match[0].length, " ") +
            tempText.substring(match.index + match[0].length);
        }

        // Restore missing variables
        const missingVars = originalVars.filter(
          (v) => !translatedVars.includes(v)
        );

        if (missingVars.length > 0) {
          console.warn(
            `Restoring missing variables: ${missingVars.join(", ")}`
          );
          processedText += ` ${missingVars.join(" ")}`;
          autoFixApplied = true;
        } else {
          // Variables count is different but can't find them
          needsReTranslation = true;
        }
      } else {
        // Extra variables were added
        needsReTranslation = true;
      }
    }

    // 2. Check if our delimiters are still present
    if (
      processedText.includes(this.VARIABLE_PREFIX) ||
      processedText.includes(this.VARIABLE_SUFFIX) ||
      processedText.includes(this.CONTEXT_DELIMITER)
    ) {
      issues.push(`Delimiters found in translation result`);

      // Clean up remaining delimiters
      for (let i = 0; i < variables.length; i++) {
        const varName = variables[i].name;
        const pattern = new RegExp(
          `${this.VARIABLE_PREFIX}${i}${this.VARIABLE_SUFFIX}`,
          "g"
        );
        processedText = processedText.replace(pattern, `{${varName}}`);
      }
      processedText = processedText.replace(
        new RegExp(this.CONTEXT_DELIMITER, "g"),
        ""
      );

      autoFixApplied = true;
    }

    // Clean up any remaining random ID based variable patterns
    // This helps catch any partial patterns with the specific random ID
    if (
      this.VARIABLE_PREFIX &&
      processedText.includes(this.VARIABLE_PREFIX.split("_")[0])
    ) {
      const basePrefix = this.VARIABLE_PREFIX.split("_")[0];
      const cleanupPattern = new RegExp(`${basePrefix}_[a-z0-9]+_\\d+__?`, "g");
      const matches = processedText.match(cleanupPattern);

      if (matches && matches.length > 0) {
        issues.push(`Found remaining variable identifiers with instance ID`);
        console.warn(
          `Cleaning up remaining ID-based variables: ${matches.join(", ")}`
        );

        for (const match of matches) {
          // Try to extract index from the pattern
          const indexMatch = match.match(/_(\d+)_/);
          if (
            indexMatch &&
            indexMatch[1] &&
            variables[parseInt(indexMatch[1], 10)]
          ) {
            const index = parseInt(indexMatch[1], 10);
            const varName = variables[index].name;
            processedText = processedText.replace(match, `{${varName}}`);
          } else {
            // If can't determine which variable it is, remove it
            processedText = processedText.replace(match, "");
          }
        }

        autoFixApplied = true;
      }
    }

    // If issues were detected, log warnings
    if (issues.length > 0) {
      console.warn(
        `Translation issues detected: ${issues.join(
          ", "
        )}, text="${originalText}"`
      );
      if (autoFixApplied) {
        console.info(`Auto-fix applied: "${processedText}"`);
      }
    }

    return processedText;
  }

  /**
   * 재번역이 필요한지 결정하는 함수
   * @param translatedText 번역된 텍스트
   * @returns 재번역 필요 여부
   */
  private shouldRetranslate(translatedText: string): boolean {
    // 심각한 문제가 남아있는지 확인
    const ctxPattern = /__DEEPL_CTX[a-z0-9_]*__/g;
    const varPattern = /__DEEPL_VAR[a-z0-9_]*__/g;
    const sourceKeyPattern = /[\u0600-\u06FF]+\.[a-zA-Z0-9.]+\.[a-zA-Z0-9.]+/g;

    // 문제 패턴들이 얼마나 남아있는지 계산
    const ctxMatches = (translatedText.match(ctxPattern) || []).length;
    const varMatches = (translatedText.match(varPattern) || []).length;
    const sourceKeyMatches = (translatedText.match(sourceKeyPattern) || [])
      .length;

    // 총 문제 패턴 수
    const totalIssues = ctxMatches + varMatches + sourceKeyMatches;

    // 심각한 경우: 문제 패턴이 3개 이상 남아있거나 소스 키 패턴이 포함된 경우
    return totalIssues >= 3 || sourceKeyMatches > 0;
  }

  /**
   * DeepL API 요청 함수
   * @param textWithContext 번역할 텍스트 (컨텍스트 포함)
   * @param retryCount 현재 재시도 횟수
   * @returns API 응답
   */
  private async makeApiRequest(
    textWithContext: string,
    retryCount: number = 0
  ): Promise<AxiosResponse> {
    try {
      // Apply delay before request
      await this.applyRequestDelay();

      const response = await axios.post(
        this.apiUrl,
        {
          text: [textWithContext],
          target_lang: this.formatLanguageCodeForApi(
            this.options.targetLanguage
          ),
          source_lang: this.options.autoDetect
            ? undefined
            : this.formatLanguageCodeForApi(this.options.sourceLanguage),
          preserve_formatting: true,
          // Add format handling options
          tag_handling: "xml",
          outline_detection: false,
          splitting_tags: [],
          non_splitting_tags: [],
        },
        {
          headers: {
            Authorization: `DeepL-Auth-Key ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Reset delay time
      this.currentDelay =
        this.options.delayBetweenRequests ||
        DEFAULT_OPTIONS.delayBetweenRequests!;

      return response;
    } catch (error: unknown) {
      const maxRetries = this.options.maxRetries || DEFAULT_OPTIONS.maxRetries!;

      if (axios.isAxiosError(error) && retryCount < maxRetries) {
        const axiosError = error as AxiosError;

        // Handle 429 error (Too Many Requests)
        if (axiosError.response?.status === 429) {
          // Increase delay time (exponential backoff)
          this.currentDelay = this.currentDelay * 2;
          console.warn(
            `DeepL API rate limit reached. Retrying in ${this.currentDelay}ms...`
          );

          // Wait and retry
          await new Promise((resolve) =>
            setTimeout(resolve, this.currentDelay)
          );
          return this.makeApiRequest(textWithContext, retryCount + 1);
        }

        // Handle other temporary errors (5xx)
        if (axiosError.response?.status && axiosError.response.status >= 500) {
          const retryDelay =
            this.options.retryDelay || DEFAULT_OPTIONS.retryDelay!;
          console.warn(
            `DeepL API server error. Retrying in ${retryDelay}ms...`
          );

          // Wait and retry
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return this.makeApiRequest(textWithContext, retryCount + 1);
        }
      }

      // Max retries exceeded or non-retryable error
      throw error;
    }
  }

  /**
   * Translate text using DeepL API
   * @param text Text to translate
   * @param context Optional context key to provide more context for translation
   * @returns Translation result
   */
  protected async translateText(
    text: string,
    context?: string
  ): Promise<TranslationResult> {
    try {
      // Check if text already contains our delimiters
      const hasOurDelimiters =
        text.includes(this.VARIABLE_PREFIX) ||
        text.includes(this.CONTEXT_DELIMITER);

      if (hasOurDelimiters) {
        console.warn(
          "Text already contains internal delimiters. Cleaning up before translation."
        );
        // 기존 구분자 제거
        text = text.replace(/__DEEPL_CTX[a-z0-9_]*__/g, "");
        text = text.replace(/__DEEPL_VAR[a-z0-9_]*__/g, "");
      }

      // 옵션 값 확인
      let useContext = this.options.useContext ?? DEFAULT_OPTIONS.useContext!;
      let valueOnly = this.options.valueOnly ?? DEFAULT_OPTIONS.valueOnly!;

      // 아랍어인 경우 기본값 재정의 (명시적으로 설정되지 않은 경우)
      const isArabic = this.options.targetLanguage === "ar";
      if (isArabic) {
        if (this.options.useContext === undefined) {
          useContext = false;
        }
        if (this.options.valueOnly === undefined) {
          valueOnly = true;
        }
      }

      // valueOnly가 true인 경우, 값만 번역
      // valueOnly는 useContext보다 우선순위가 높음
      if (valueOnly) {
        console.info(`Using value-only translation mode (context ignored)`);
        context = undefined;
      }

      // Extract variables from original text and replace them safely
      let processedText = text;
      const variables: { start: number; end: number; name: string }[] = [];

      // Extract variable positions and names
      let match;
      while ((match = this.VARIABLE_PATTERN.exec(text)) !== null) {
        variables.push({
          start: match.index,
          end: match.index + match[0].length,
          name: match[1],
        });
      }

      // Replace variables from the end (to avoid index changes)
      for (let i = variables.length - 1; i >= 0; i--) {
        const v = variables[i];
        const safeName = `${this.VARIABLE_PREFIX}${i}${this.VARIABLE_SUFFIX}`;
        processedText =
          processedText.substring(0, v.start) +
          safeName +
          processedText.substring(v.end);
      }

      // 컨텍스트 정제
      let sanitizedContext = context;
      if (context && useContext) {
        // 컨텍스트에서 소스 키 패턴 제거 (예: المكونات.diary.diary...)
        const sourceKeyPattern =
          /[\u0600-\u06FF]+\.[a-zA-Z0-9.]+\.[a-zA-Z0-9.]+/g;
        if (sourceKeyPattern.test(context)) {
          sanitizedContext = context.replace(sourceKeyPattern, "");
          console.info(
            `Cleaned up source key pattern from context: ${context} -> ${sanitizedContext}`
          );
        }

        // 컨텍스트에 이미 구분자가 있으면 제거
        if (context.includes("__DEEPL_CTX")) {
          sanitizedContext = context.replace(/__DEEPL_CTX[a-z0-9_]*__/g, "");
          console.info(
            `Removed delimiter from context: ${context} -> ${sanitizedContext}`
          );
        }
      } else if (!useContext) {
        // useContext가 false인 경우 컨텍스트 사용 안 함
        sanitizedContext = undefined;
      }

      // 재번역 시도 함수
      const attemptTranslation = async (
        processedText: string,
        sanitizedContext: string | undefined,
        retryCount: number = 0
      ): Promise<string> => {
        // 최대 재시도 횟수 (3회 이하로 유지)
        const maxRetries = Math.min(
          this.options.maxRetries || DEFAULT_OPTIONS.maxRetries!,
          3
        );

        if (retryCount > maxRetries) {
          console.warn(
            `Maximum retranslation attempts (${maxRetries}) reached.`
          );
          return processedText;
        }

        // If context is provided, combine it with a unique delimiter
        let textWithContext = processedText;
        if (sanitizedContext && useContext) {
          // 재시도 시에는 컨텍스트를 간소화
          if (retryCount > 0) {
            const simplifiedContext = sanitizedContext
              .split(" ")
              .slice(0, 3)
              .join(" ");
            textWithContext = `${simplifiedContext} ${this.CONTEXT_DELIMITER} ${processedText}`;
          } else {
            textWithContext = `${sanitizedContext} ${this.CONTEXT_DELIMITER} ${processedText}`;
          }
        }

        // Send API request (with retry logic)
        const response = await this.makeApiRequest(textWithContext);

        // Get translated text
        let result = response.data.translations[0].text;

        // If context is provided, remove the translated context part
        if (sanitizedContext && useContext) {
          const delimiterIndex = result.indexOf(this.CONTEXT_DELIMITER);
          if (delimiterIndex !== -1) {
            result = result
              .substring(delimiterIndex + this.CONTEXT_DELIMITER.length)
              .trim();
          } else {
            // 구분자를 찾을 수 없는 경우, 원본 길이를 기준으로 삭제
            // 컨텍스트는 일반적으로 원본 텍스트보다 짧으므로, 번역된 컨텍스트도 더 짧을 것이라고 가정
            const originalContextLen = sanitizedContext.length;
            // 번역된 컨텍스트 길이를 원본의 두 배까지 고려
            const possibleTranslatedContextLen = Math.min(
              originalContextLen * 2,
              result.length / 2
            );

            console.warn(
              `Context delimiter not found in translation result. Trying to extract based on length.`
            );
            result = result.substring(possibleTranslatedContextLen).trim();
          }
        }

        // 번역 후처리 및 검증 수행
        result = await this.postProcessTranslation(
          result,
          text,
          variables,
          useContext ? context : undefined
        );

        // 후처리 후에도 문제가 있는지 확인
        if (this.shouldRetranslate(result) && retryCount < maxRetries) {
          console.warn(
            `Translation still has issues after attempt ${
              retryCount + 1
            }. Retrying...`
          );
          // 재번역 시도 (컨텍스트 단순화 또는 없이)
          // 재시도 할 때는 컨텍스트를 더 간단하게 하거나 제거
          const nextContext = retryCount === 0 ? sanitizedContext : undefined;
          return await attemptTranslation(
            processedText,
            nextContext,
            retryCount + 1
          );
        }

        return result;
      };

      // 초기 번역 시도
      let translatedText = await attemptTranslation(
        processedText,
        useContext ? sanitizedContext : undefined
      );

      // 최종 검증 - 번역 결과에 여전히 문제가 있는지 확인
      const ctxPattern = /__DEEPL_CTX[a-z0-9_]*__/g;
      const varPattern = /__DEEPL_VAR[a-z0-9_]*__/g;
      const sourceKeyPattern =
        /[\u0600-\u06FF]+\.[a-zA-Z0-9.]+\.[a-zA-Z0-9.]+/g;

      if (
        ctxPattern.test(translatedText) ||
        varPattern.test(translatedText) ||
        sourceKeyPattern.test(translatedText)
      ) {
        console.warn(
          `After post-processing, translation still contains problematic patterns. Will try one more cleanup.`
        );

        // 마지막 정리 시도
        translatedText = translatedText
          .replace(ctxPattern, "")
          .replace(varPattern, "")
          .replace(sourceKeyPattern, "")
          .replace(/(_!|_\s+)/g, "");
      }

      return {
        originalText: text,
        translatedText,
        sourceLanguage: this.options.sourceLanguage,
        targetLanguage: this.options.targetLanguage,
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new Error(
          `DeepL API translation failed: ${
            axiosError.response?.data || axiosError.message
          }`
        );
      } else {
        throw new Error(`DeepL API translation failed: ${String(error)}`);
      }
    }
  }

  /**
   * Return list of languages supported by DeepL API
   */
  public getSupportedLanguages(): LanguageCode[] {
    return Object.values(LANGUAGE_CODE_MAPPING);
  }

  /**
   * Return map of language names and codes supported by DeepL API
   */
  public getSupportedLanguageNameMap(): Record<LanguageCode, string> {
    return LANGUAGE_NAMES;
  }
}
