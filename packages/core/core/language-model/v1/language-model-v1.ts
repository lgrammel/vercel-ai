import { JsonSchema } from './json-schema';
import { LanguageModelV1Prompt } from './language-model-v1-prompt';

type LanguageModelV1 = {
  /**
   * The language model must specify which language model interface
   * version it implements. This will allow us to evolve the language
   * model interface and retain backwards compatibility. The different
   * implementation versions can be handled as a discriminated union
   * on our side.
   */
  readonly specificationVersion: 'v1';

  /**
   * Name of the provider for logging purposes.
   */
  readonly provider: string;

  /**
   * Provider-specific model ID for logging purposes.
   */
  readonly modelId: string;

  /**
   * Default object generation mode that should be used with this model when
   * no mode is specified. Should be the mode with the best results for this
   * model. `undefined` can be returned if object generation is not supported.
   *
   * This is needed to generate the best objects possible w/o requiring the
   * user to explicitly specify the object generation mode.
   */
  readonly defaultObjectGenerationMode: 'json' | 'tool' | 'grammar' | undefined;

  /**
   * Generates a language model output (non-streaming).
   *
   * Naming: "do" prefix to prevent accidental direct usage of the method
   * by the user.
   */
  doGenerate(options: LanguageModelV1CallOptions): PromiseLike<{
    /**
     * Text that the model has generated. Can be undefined if the model
     * has only generated tool calls.
     */
    text?: string;

    /**
     * Tool calls that the model has generated. Can be undefined if the
     * model has only generated text.
     */
    toolCalls?: Array<LanguageModelV1FunctionToolCall>;

    /**
     * Finish reason.
     */
    finishReason: LanguageModelV1FinishReason;

    /**
     * Usage information.
     */
    usage: {
      promptTokens: number;
      completionTokens: number;
    };
  }>;

  /**
   * Generates a language model output (streaming).
   *
   * Naming: "do" prefix to prevent accidental direct usage of the method
   * by the user.
   *
   * @return A stream of higher-level language model output parts.
   */
  doStream(options: LanguageModelV1CallOptions): PromiseLike<
    ReadableStream<
      // Basic text deltas:
      | { type: 'text-delta'; textDelta: string }

      // Complete tool calls:
      | ({ type: 'tool-call' } & LanguageModelV1FunctionToolCall)

      // Tool call deltas are only needed for object generation modes.
      // The tool call deltas must be partial JSON strings.
      | {
          type: 'tool-call-delta';
          toolCallId: string;
          toolName: string;
          argsTextDelta: string;
        }

      // the usage stats and finish reason should be the last part of the
      // stream:
      | {
          type: 'final-metadata';
          finishReason: LanguageModelV1FinishReason;
          usage: { promptTokens: number; completionTokens: number };
        }

      // error parts are streamed, allowing for multiple errors
      | { type: 'error'; error: unknown }
    >
  >;
} & ( // Tokenization capability (example of an optional capability):
  | {
      /**
       * Model supports tokenization.
       */
      readonly tokenizationCapability: true;

      /**
       * Size of the context window in tokens.
       */
      readonly contextWindowSize: number;

      /**
       * Count the number of tokens in the given text or prompt.
       *
       * @param value When it is a text, tokenize & count the tokens.
       *              When it is a prompt, expand it, tokenize & count the tokens
       *              for the full prompt.
       *              This should be accurate to enable calculating the remaining
       *              available tokens.
       */
      doCountTokens(value: LanguageModelV1Prompt | string): PromiseLike<number>;

      /**
       * Tokenize the given text using the model tokenizer.
       *
       * Note: unclear if needed in v1
       */
      doTokenize(text: string): PromiseLike<{
        tokens: Array<number>;
        tokenTexts: Array<string>;
      }>;

      /**
       * Map tokens back to text.
       *
       * Note: unclear if needed in v1
       */
      doDetokenize(tokens: Array<number>): PromiseLike<string>;
    }
  | {
      /**
       * Tokenization not supported.
       */
      readonly tokenizationCapability: false;
    }
);

export type LanguageModelV1CallOptions = {
  /**
   * The mode affects the behavior of the language model. It is required to
   * support provider-independent streaming and generation of structured objects.
   * The model can take this information and e.g. configure json mode, the correct
   * low level grammar, etc. It can also be used to optimize the efficiency of the
   * streaming, e.g. tool-delta stream parts are only needed in the object-tool mode.
   */
  mode:
    | {
        // stream text & complete tool calls
        type: 'regular';
        tools?: Array<LanguageModelV1FunctionTool>;
      }
    | {
        // object generation with json mode enabled, stream text
        type: 'object-json';
      }
    | {
        // object generation with grammar enabled, stream text
        type: 'object-grammar';
        schema: JsonSchema;
      }
    | {
        // object generation with tool mode enabled, stream tool call deltas
        type: 'object-tool';
        tool: LanguageModelV1FunctionTool;
      };

  /**
   * Maximum number of tokens to generate.
   */
  maxTokens?: number;

  /**
   * Temperature setting. This is a number between 0 (almost no randomness) and
   * 1 (very random).
   *
   * Different LLM providers have different temperature
   * scales, so they'd need to map it (without mapping, the same temperature has
   * different effects on different models). The provider can also chose to map
   * this to topP, potentially even using a custom setting on their model.
   *
   * Note: This is an example of a setting that requires a clear specification of
   * the semantics.
   */
  temperature?: number;

  /**
   * Nucleus sampling. This is a number between 0 and 1.
   *
   * E.g. 0.1 would mean that only tokens with the top 10% probability mass are considered.
   *
   * It is recommended to set either `temperature` or `topP`, but not both.
   */
  topP?: number;

  /**
   * Presence penalty setting. This is a number between 0 (no penalty)
   * and 1 (maximum penalty). It affects the likelihood of the model to repeat
   * information that is already in the prompt.
   */
  presencePenalty?: number;

  /**
   * Frequency penalty setting. This is a number between 0 (no penalty)
   * and 1 (maximum penalty). It affects the likelihood of the model to repeatedly
   * use the same words or phrases.
   */
  frequencyPenalty?: number;

  /**
   * The seed to use for random sampling. If set and supported by the model,
   * calls will generate deterministic results.
   */
  seed?: number;

  // more standardized settings would come here.

  // note: I have not included stopSequences, bc they are an artifact of
  // older approaches (text prompts), and should be used internally in the models
  // (e.g. to support specific internal prompt formats).

  // note: I have not included n (number of completions to generate), since
  // our API is focussed on a single completion

  /**
   * A language mode prompt is a standardized prompt type.
   *
   * Note: This is **not** the user-facing prompt. The AI SDK methods will map the
   * user-facing prompt types such as chat or instruction prompts to this format.
   * That approach allows us to evolve the user  facing prompts without breaking
   * the language model interface.
   */
  prompt: LanguageModelV1Prompt;
};

/**
 * A tool has a name, a description, and a set of parameters.
 *
 * Note: this is **not** the user-facing tool definition. The AI SDK methods will
 * map the user-facing tool definitions to this format.
 */
export type LanguageModelV1FunctionTool = {
  /**
   * The type of the tool. Only functions for now, but this gives us room to
   * add more specific tool types in the future and use a discriminated union.
   */
  type: 'function';

  /**
   * The name of the tool. Unique within this model call.
   */
  name: string;

  description?: string;

  parameters: JsonSchema;
};

type LanguageModelV1FunctionToolCall = {
  type: 'function';
  toolCallId: string;
  toolName: string;

  /**
   * Stringified JSON object with the tool call arguments. Must match the
   * parameters schema of the tool.
   */
  args: string;
};

type LanguageModelV1FinishReason =
  | 'stop' // model generated stop sequence
  | 'length' // model generated maximum number of tokens
  | 'content-filter' // content filter violation stopped the model
  | 'tool-calls' // model triggered tool calls
  | 'error' // model stopped because of an error
  | 'other'; // model stopped for other reasons
