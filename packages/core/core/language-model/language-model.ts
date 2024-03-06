import { LanguageModelV1Prompt } from './v1/language-model-v1-prompt';

export interface LanguageModel {
  objectMode: ObjectMode;

  doGenerate(options: LanguageModelCallOptions): PromiseLike<{
    text?: string;
    toolCalls?: Array<LanguageModelToolCall>;
  }>;

  doStream(
    options: LanguageModelCallOptions,
  ): PromiseLike<ReadableStream<LanguageModelStreamPart>>;
}

export type ObjectMode = 'tool' | 'json';

type LanguageModelCallOptions = {
  mode:
    | { type: 'regular'; tools?: Array<LanguageModelToolDefinition> }
    | { type: 'object-json' }
    | { type: 'object-tool'; tool: LanguageModelToolDefinition };

  prompt: LanguageModelV1Prompt;
};

export interface LanguageModelSettings {
  maxTokens?: number;
}

type LanguageModelToolDefinition = {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
};

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
