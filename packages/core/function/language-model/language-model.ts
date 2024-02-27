import { LanguageModelPrompt } from './prompt';

export interface LanguageModel {
  // TODO include usage data
  // TODO support tool calls
  doGenerate(options: { prompt: LanguageModelPrompt }): PromiseLike<{
    text: string;
  }>;

  doGenerateJsonText(options: {
    schema: Record<string, unknown>;
    prompt: LanguageModelPrompt;
  }): PromiseLike<{
    jsonText: string;
  }>;

  doStream(options: {
    prompt: LanguageModelPrompt;
    tools?: Array<{
      name: string;
      description?: string;
      parameters: Record<string, unknown>;
    }>;
  }): PromiseLike<ReadableStream<LanguageModelStreamPart>>;

  doStreamJsonText(options: {
    schema: Record<string, unknown>;
    prompt: LanguageModelPrompt;
  }): PromiseLike<
    ReadableStream<
      | { type: 'json-text-delta'; textDelta: string }
      | LanguageModelErrorStreamPart
    >
  >;
}

export type LanguageModelErrorStreamPart = {
  type: 'error';
  error: unknown;
};

export type LanguageModelStreamPart =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'tool-call'; id: string | null; name: string; args: unknown }
  | LanguageModelErrorStreamPart;
