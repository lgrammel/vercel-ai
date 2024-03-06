import { nanoid } from 'nanoid';
import OpenAI from 'openai';
import {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from 'openai/resources';
import { LanguageModel, LanguageModelStreamPart, ObjectMode } from '../../core';
import { tryParseJSON } from '../../core/util/try-json-parse';
import { readableFromAsyncIterable } from '../../streams';
import { convertToOpenAIChatMessages } from './convert-to-openai-chat-messages';

export class OpenAIChatLanguageModel<
  SETTINGS extends {
    objectMode?: 'tool' | 'json';
  },
> implements LanguageModel
{
  readonly settings: SETTINGS;

  private readonly getClient: () => Promise<OpenAI>;
  private readonly mapSettings: (settings: SETTINGS) => Record<
    string,
    unknown
  > & {
    model: string;
  };

  constructor(
    settings: SETTINGS,
    config: {
      client: () => Promise<OpenAI>;
      mapSettings: (settings: SETTINGS) => Record<string, unknown> & {
        model: string;
      };
    },
  ) {
    this.settings = settings;
    this.getClient = config.client;
    this.mapSettings = config.mapSettings;
  }

  get objectMode(): ObjectMode {
    return this.settings.objectMode ?? 'tool';
  }

  private get basePrompt() {
    return this.mapSettings(this.settings);
  }

  private getArgs(
    options: Parameters<LanguageModel['doGenerate']>[0],
    stream: true,
  ): ChatCompletionCreateParamsStreaming;
  private getArgs(
    options: Parameters<LanguageModel['doGenerate']>[0],
    stream: false,
  ): ChatCompletionCreateParamsNonStreaming;
  private getArgs(
    {
      mode,
      prompt,
      maxCompletionTokens,
      temperature,
      frequencyPenalty,
      presencePenalty,
    }: Parameters<LanguageModel['doGenerate']>[0],
    stream: boolean,
  ):
    | ChatCompletionCreateParamsNonStreaming
    | ChatCompletionCreateParamsStreaming {
    const type = mode.type;
    const messages = convertToOpenAIChatMessages(prompt);

    // TODO standardize temperature, presencePenalty, frequencyPenalty scales
    const standardizedSettings = {
      max_tokens: maxCompletionTokens,
      temperature,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
    };

    switch (type) {
      case 'regular': {
        // when the tools array is empty, change it to undefined to prevent OpenAI errors:
        const tools = mode.tools?.length ? mode.tools : undefined;

        return {
          stream,
          ...this.basePrompt,
          ...standardizedSettings,
          messages,
          tools: tools?.map(tool => ({
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          })),
        };
      }

      case 'object-json': {
        return {
          stream,
          ...this.basePrompt,
          ...standardizedSettings,
          response_format: { type: 'json_object' },
          messages,
        };
      }

      case 'object-tool': {
        return {
          stream,
          ...this.basePrompt,
          ...standardizedSettings,
          tool_choice: { type: 'function', function: { name: mode.tool.name } },
          tools: [{ type: 'function', function: mode.tool }],
          messages,
        };
      }

      case 'object-grammar': {
        throw new Error('Grammar mode is not supported by OpenAI Chat.');
      }

      default: {
        const _exhaustiveCheck: never = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }

  async doGenerate(options: Parameters<LanguageModel['doGenerate']>[0]) {
    const client = await this.getClient();

    const completion = await client.chat.completions.create(
      this.getArgs(options, false),
    );

    const message = completion.choices[0].message;

    return {
      text: message.content ?? undefined,
      toolCalls: message.tool_calls?.map(toolCall => ({
        toolCallId: toolCall.id,
        toolName: toolCall.function.name,
        args: toolCall.function.arguments!,
      })),
    };
  }

  async doStream(
    options: Parameters<LanguageModel['doStream']>[0],
  ): Promise<ReadableStream<LanguageModelStreamPart>> {
    const client = await this.getClient();

    const response = await client.chat.completions.create(
      this.getArgs(options, true),
    );

    const toolCalls: Array<{
      id?: string;
      type?: 'function';
      function?: {
        name?: string;
        arguments?: string;
      };
    }> = [];

    return readableFromAsyncIterable(response).pipeThrough(
      new TransformStream<
        OpenAI.Chat.Completions.ChatCompletionChunk,
        LanguageModelStreamPart
      >({
        transform(chunk, controller) {
          if (chunk.choices?.[0].delta == null) {
            return;
          }

          const delta = chunk.choices[0].delta;

          if (delta.content != null) {
            controller.enqueue({
              type: 'text-delta',
              textDelta: delta.content,
            });
          }

          if (delta.tool_calls != null) {
            for (const toolCallDelta of delta.tool_calls) {
              const index = toolCallDelta.index;

              // new tool call, add to list
              if (toolCalls[index] == null) {
                toolCalls[index] = toolCallDelta;
                continue;
              }

              // existing tool call, merge
              const toolCall = toolCalls[index];

              if (toolCallDelta.function?.arguments != null) {
                toolCall.function!.arguments +=
                  toolCallDelta.function?.arguments ?? '';
              }

              // send delta
              controller.enqueue({
                type: 'tool-call-delta',
                toolCallId: toolCall.id ?? '', // TODO empty?
                toolName: toolCall.function?.name ?? '', // TODO empty?
                argsTextDelta: toolCallDelta.function?.arguments ?? '', // TODO empty?
              });

              // check if tool call is complete
              if (
                toolCall.function?.name == null ||
                toolCall.function?.arguments == null ||
                tryParseJSON(toolCall.function.arguments) == null
              ) {
                continue;
              }

              controller.enqueue({
                type: 'tool-call',
                toolCallId: toolCall.id ?? nanoid(),
                toolName: toolCall.function.name,
                args: toolCall.function.arguments,
              });
            }
          }
        },
      }),
    );
  }
}
