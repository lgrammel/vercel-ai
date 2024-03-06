import { LanguageModelV1CallOptions } from './v1/language-model-v1';

export interface LanguageModel {
  objectMode: ObjectMode;

  doGenerate(options: LanguageModelV1CallOptions): PromiseLike<{
    text?: string;
    toolCalls?: Array<LanguageModelToolCall>;
  }>;

  doStream(
    options: LanguageModelV1CallOptions,
  ): PromiseLike<ReadableStream<LanguageModelStreamPart>>;
}

export type ObjectMode = 'tool' | 'json';

export type ErrorStreamPart = {
  type: 'error';
  error: unknown;
};

export type LanguageModelToolCall = {
  toolCallId: string;
  toolName: string;
  args: string;
};

type ToolCallStreamPart = {
  type: 'tool-call';
} & LanguageModelToolCall;

type ToolCallDeltaStreamPart = {
  type: 'tool-call-delta';
  toolCallId: string;
  toolName: string;
  argsTextDelta: string;
};

type TextDeltaStreamPart = {
  type: 'text-delta';
  textDelta: string;
};

export type LanguageModelStreamPart =
  | TextDeltaStreamPart
  | ToolCallDeltaStreamPart
  | ToolCallStreamPart
  | ErrorStreamPart;
