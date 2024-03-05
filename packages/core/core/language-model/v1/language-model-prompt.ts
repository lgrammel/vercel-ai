/**
 * A prompt is a combination of a system message and a list
 * of user, assistant, and tool messages.
 *
 * Note: Not all models and prompt formats support multi-modal inputs and
 * tool calls. The validation happens at runtime.
 *
 * Note: This is not a user-facing prompt. The AI SDK methods will map the
 * user-facing prompt types such as chat or instruction prompts to this format.
 */
interface LanguageModelPrompt {
  system?: string;
  messages: Array<
    // Note: there could be additional parts for each role in the future,
    // e.g. when the assistant can return images or the user can share files
    // such as PDFs.
    | { role: 'user'; content: Array<TextPart | ImagePart> }
    | { role: 'assistant'; content: Array<TextPart | ToolCallPart> }
    | { role: 'tool'; content: Array<ToolResultPart> }
  >;
}

interface TextPart {
  type: 'text';

  /**
   * The text content.
   */
  text: string;
}

interface ImagePart {
  type: 'image';

  /**
   * Image data as a Uint8Array.
   */
  image: Uint8Array;

  /**
   * Optional mime type of the image.
   */
  mimeType?: string;
}

interface ToolCallPart {
  type: 'tool-call';

  toolCallId: string;
  toolName: string;

  args: unknown;
}

interface ToolResultPart {
  type: 'tool-result';

  toolCallId: string;
  toolName: string;

  result: unknown;
}
