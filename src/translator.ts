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

    // Increase delay time for Arabic to improve API response stability
    const isArabic = options.targetLanguage === "ar";
    if (isArabic && options.delayBetweenRequests === undefined) {
      // For Arabic, set a longer default delay (1sec -> 1.5sec)
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
   * Apply delay between requests to avoid rate limiting
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

    // Special processing for Arabic
    const isArabic = this.options.targetLanguage === "ar";
    if (isArabic) {
      // Remove RTL markers (‏ character, \u200F)
      processedText = processedText.replace(/\u200F/g, "");

      // Remove unnecessary spaces that often occur in Arabic
      processedText = processedText.replace(/\s+/g, " ").trim();

      // Clean up strange patterns (e.g., _0__, _개)
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
   * Determine if retranslation is needed
   * @param translatedText Translated text
   * @returns Need for retranslation
   */
  private shouldRetranslate(translatedText: string): boolean {
    // Check for remaining serious issues
    const ctxPattern = /__DEEPL_CTX[a-z0-9_]*__/g;
    const varPattern = /__DEEPL_VAR[a-z0-9_]*__/g;
    const sourceKeyPattern = /[\u0600-\u06FF]+\.[a-zA-Z0-9.]+\.[a-zA-Z0-9.]+/g;

    // Calculate how many problem patterns remain
    const ctxMatches = (translatedText.match(ctxPattern) || []).length;
    const varMatches = (translatedText.match(varPattern) || []).length;
    const sourceKeyMatches = (translatedText.match(sourceKeyPattern) || [])
      .length;

    // Total problem patterns
    const totalIssues = ctxMatches + varMatches + sourceKeyMatches;

    // Retranslate if there's 1 or more issue patterns or if source key pattern is included
    return totalIssues > 0 || sourceKeyMatches > 0;
  }

  /**
   * DeepL API request function
   * @param textWithContext Text to translate (with context)
   * @param retryCount Current retry count
   * @returns API response
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
   * Process text before translation
   * @param text Original text
   * @param context Optional context
   * @returns Processed text and variables for replacement
   */
  private preprocessText(
    text: string,
    context?: string
  ): {
    processedText: string;
    variables: { start: number; end: number; name: string }[];
    sanitizedContext?: string;
    useContext: boolean;
    valueOnly: boolean;
  } {
    // Check if text already contains our delimiters
    const hasOurDelimiters =
      text.includes(this.VARIABLE_PREFIX) ||
      text.includes(this.CONTEXT_DELIMITER);

    let cleanedText = text;
    if (hasOurDelimiters) {
      console.warn(
        "Text already contains internal delimiters. Cleaning up before translation."
      );
      // Remove existing delimiters
      cleanedText = text.replace(/__DEEPL_CTX[a-z0-9_]*__/g, "");
      cleanedText = cleanedText.replace(/__DEEPL_VAR[a-z0-9_]*__/g, "");
    }

    // Check option values
    let useContext = this.options.useContext ?? DEFAULT_OPTIONS.useContext!;
    let valueOnly = this.options.valueOnly ?? DEFAULT_OPTIONS.valueOnly!;

    // Override defaults for Arabic (if not explicitly set)
    const isArabic = this.options.targetLanguage === "ar";
    if (isArabic) {
      if (this.options.useContext === undefined) {
        useContext = false;
      }
      if (this.options.valueOnly === undefined) {
        valueOnly = true;
      }
    }

    // If valueOnly is true, translate only the value
    // valueOnly has higher priority than useContext
    if (valueOnly) {
      console.info(`Using value-only translation mode (context ignored)`);
      context = undefined;
    }

    // Extract variables from original text and replace them safely
    let processedText = cleanedText;
    const variables: { start: number; end: number; name: string }[] = [];

    // Extract variable positions and names
    let match;
    while ((match = this.VARIABLE_PATTERN.exec(cleanedText)) !== null) {
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

    // Clean up context
    let sanitizedContext = context;
    if (context && useContext) {
      // Remove source key pattern from context (e.g., المكونات.diary.diary...)
      const sourceKeyPattern =
        /[\u0600-\u06FF]+\.[a-zA-Z0-9.]+\.[a-zA-Z0-9.]+/g;
      if (sourceKeyPattern.test(context)) {
        sanitizedContext = context.replace(sourceKeyPattern, "");
        console.info(
          `Cleaned up source key pattern from context: ${context} -> ${sanitizedContext}`
        );
      }

      // Remove delimiter if already present in context
      if (context.includes("__DEEPL_CTX")) {
        sanitizedContext = context.replace(/__DEEPL_CTX[a-z0-9_]*__/g, "");
        console.info(
          `Removed delimiter from context: ${context} -> ${sanitizedContext}`
        );
      }
    } else if (!useContext) {
      // Don't use context if useContext is false
      sanitizedContext = undefined;
    }

    return {
      processedText,
      variables,
      sanitizedContext,
      useContext,
      valueOnly,
    };
  }

  /**
   * Attempt translation with retry logic
   */
  private async attemptTranslation(
    processedText: string,
    variables: { start: number; end: number; name: string }[],
    originalText: string,
    sanitizedContext: string | undefined,
    useContext: boolean,
    retryCount: number = 0,
    forceValueOnly: boolean = false
  ): Promise<string> {
    // Maximum retry count (keep under 3)
    const maxRetries = Math.min(
      this.options.maxRetries || DEFAULT_OPTIONS.maxRetries!,
      3
    );

    if (retryCount > maxRetries) {
      console.warn(`Maximum retranslation attempts (${maxRetries}) reached.`);
      return processedText;
    }

    // Switch to valueOnly mode from second retry (retryCount=1) onwards
    const useValueOnlyMode = forceValueOnly || retryCount >= 1;
    if (retryCount >= 1 && !forceValueOnly) {
      console.info(`Retry #${retryCount + 1}: Switching to valueOnly mode`);
    }

    // For forceValueOnly=true or from 2nd retry, ignore context and translate only the value
    let textWithContext = processedText;
    if (sanitizedContext && useContext && !useValueOnlyMode) {
      // Simplify context for retries
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

    // Detect empty result (empty or whitespace only)
    if (!result || result.trim() === "") {
      console.warn(`Empty translation result detected.`);

      // If not already tried with valueOnly, retry with valueOnly=true
      if (!useValueOnlyMode) {
        console.info(`Retrying with valueOnly=true mode...`);
        return await this.attemptTranslation(
          processedText,
          variables,
          originalText,
          undefined,
          useContext,
          retryCount,
          true
        );
      }
    }

    // If context is provided, remove the translated context part
    if (sanitizedContext && useContext && !useValueOnlyMode) {
      const delimiterIndex = result.indexOf(this.CONTEXT_DELIMITER);
      if (delimiterIndex !== -1) {
        result = result
          .substring(delimiterIndex + this.CONTEXT_DELIMITER.length)
          .trim();
      } else {
        // If delimiter not found, delete based on original length
        // Context is typically shorter than the original text, so translated context should be shorter too
        const originalContextLen = sanitizedContext.length;
        // Consider translated context length up to twice the original
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

    // Perform post-processing and validation
    result = await this.postProcessTranslation(
      result,
      originalText,
      variables,
      useContext && !useValueOnlyMode ? sanitizedContext : undefined
    );

    // Check for empty result again (after post-processing)
    if (!result || result.trim() === "") {
      console.warn(`Empty result after post-processing.`);

      // If not already tried with valueOnly, retry with valueOnly=true
      if (!useValueOnlyMode) {
        console.info(
          `Retrying with valueOnly=true mode after post-processing...`
        );
        return await this.attemptTranslation(
          processedText,
          variables,
          originalText,
          undefined,
          useContext,
          retryCount,
          true
        );
      }
    }

    // Check if there are still issues after post-processing
    if (this.shouldRetranslate(result) && retryCount < maxRetries) {
      console.warn(
        `Translation still has issues after attempt ${
          retryCount + 1
        }. Retrying...`
      );

      // Attempt retranslation
      // Next retry always uses valueOnly=true (due to retryCount increase)
      return await this.attemptTranslation(
        processedText,
        variables,
        originalText,
        sanitizedContext,
        useContext,
        retryCount + 1,
        useValueOnlyMode
      );
    }

    return result;
  }

  /**
   * Final cleanup of translated text
   */
  private finalCleanup(translatedText: string): string {
    // Check for remaining problematic patterns
    const ctxPattern = /__DEEPL_CTX[a-z0-9_]*__/g;
    const varPattern = /__DEEPL_VAR[a-z0-9_]*__/g;
    const sourceKeyPattern = /[\u0600-\u06FF]+\.[a-zA-Z0-9.]+\.[a-zA-Z0-9.]+/g;

    if (
      ctxPattern.test(translatedText) ||
      varPattern.test(translatedText) ||
      sourceKeyPattern.test(translatedText)
    ) {
      console.warn(
        `After post-processing, translation still contains problematic patterns. Will try one more cleanup.`
      );

      // One last cleanup attempt
      return translatedText
        .replace(ctxPattern, "")
        .replace(varPattern, "")
        .replace(sourceKeyPattern, "")
        .replace(/(_!|_\s+)/g, "");
    }

    return translatedText;
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
      // Preprocess text and context
      const {
        processedText,
        variables,
        sanitizedContext,
        useContext,
        valueOnly,
      } = this.preprocessText(text, context);

      // Flag for empty result detection
      let emptyResultDetected = false;

      // Initial translation attempt
      let translatedText = await this.attemptTranslation(
        processedText,
        variables,
        text,
        useContext ? sanitizedContext : undefined,
        useContext,
        0,
        valueOnly
      );

      // Final cleanup of translated text
      translatedText = this.finalCleanup(translatedText);

      // Final check for empty result
      if (
        (!translatedText || translatedText.trim() === "") &&
        !emptyResultDetected
      ) {
        console.warn(
          `Final translation result is empty. Retrying with valueOnly=true.`
        );
        // Force valueOnly=true and try again
        return await this.translateText(text, undefined);
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
