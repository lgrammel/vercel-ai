import MistralClient, { ToolType } from '@mistralai/mistralai';
import { LastArrayElement } from 'type-fest';
import {
  LanguageModelV1Prompt,
  UnsupportedFunctionalityError,
} from '../../core';

type MistralChatMessage = LastArrayElement<
  Parameters<MistralClient['chat']>[0]['messages']
>;

export function convertToMistralChatPrompt(
  prompt: LanguageModelV1Prompt,
): Array<MistralChatMessage> {
  const messages: Array<MistralChatMessage> = [];

  for (const { role, content } of prompt) {
    switch (role) {
      case 'system': {
        messages.push({ role: 'system', content });
        break;
      }

      case 'user': {
        messages.push({
          role: 'user',
          content: content
            .map(part => {
              switch (part.type) {
                case 'text': {
                  return part.text;
                }
                case 'image': {
                  throw new UnsupportedFunctionalityError({
                    provider: 'mistral.chat',
                    functionality: 'image-part',
                  });
                }
              }
            })
            .join(''),
        });

        break;
      }
      case 'assistant': {
        let text = '';
        const toolCalls: Array<{
          id: string;
          type: 'function';
          function: { name: string; arguments: string };
        }> = [];

        for (const part of content) {
          switch (part.type) {
            case 'text': {
              text += part.text;
              break;
            }
            case 'tool-call': {
              toolCalls.push({
                id: part.toolCallId,
                type: 'function',
                function: {
                  name: part.toolName,
                  arguments: JSON.stringify(part.args),
                },
              });
              break;
            }
            default: {
              const _exhaustiveCheck: never = part;
              throw new Error(`Unsupported part: ${_exhaustiveCheck}`);
            }
          }
        }

        messages.push({
          role: 'assistant',
          content: text,
          tool_calls:
            toolCalls.length > 0
              ? toolCalls.map(({ function: { name, arguments: args } }) => ({
                  id: 'null',
                  type: 'function' as ToolType,
                  function: { name, arguments: args },
                }))
              : undefined,
        });

        break;
      }
      case 'tool': {
        for (const toolResponse of content) {
          messages.push({
            role: 'tool',
            name: toolResponse.toolName,
            content: JSON.stringify(toolResponse.result),
          });
        }
        break;
      }
      default: {
        const _exhaustiveCheck: never = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }

  return messages;
}
