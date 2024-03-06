import { z } from 'zod';
import { LanguageModel } from '../language-model';
import { safeParseJSON } from '../schema/parse-json';
import { ZodSchema } from '../schema/zod-schema';
import { injectJsonSchemaIntoSystem } from './inject-json-schema-into-system';
import { NoObjectGeneratedError } from './no-object-generated-error';
import { ObjectParseError } from './object-parse-error';
import { ObjectValidationError } from './object-validation-error';
import { Message } from '../prompt';
import { convertToLanguageModelPrompt } from '../prompt/convert-to-language-model-prompt';

/**
 * Generate a structured, typed object using a language model.
 */
export async function generateObject<T>({
  model,
  schema: zodSchema,
  system,
  prompt,
  messages,
}: {
  model: LanguageModel;
  schema: z.Schema<T>;
  system?: string;
  prompt?: string;
  messages?: Array<Message>;
}): Promise<GenerateObjectResult<T>> {
  const schema = new ZodSchema(zodSchema);
  const jsonSchema = schema.getJsonSchema();
  const objectMode = model.objectMode;

  let result: string;

  switch (objectMode) {
    case 'json': {
      const generateResult = await model.doGenerate({
        mode: { type: 'object-json' },
        prompt: convertToLanguageModelPrompt({
          system: injectJsonSchemaIntoSystem({ system, schema: jsonSchema }),
          prompt,
          messages,
        }),
      });

      if (generateResult.text === undefined) {
        throw new NoObjectGeneratedError();
      }

      result = generateResult.text;

      break;
    }

    case 'tool': {
      const generateResult = await model.doGenerate({
        mode: {
          type: 'object-tool',
          tool: {
            type: 'function',
            name: 'json',
            description: 'Respond with a JSON object.',
            parameters: jsonSchema,
          },
        },
        prompt: convertToLanguageModelPrompt({ system, prompt, messages }),
      });

      const functionArgs = generateResult.toolCalls?.[0]?.args;

      if (functionArgs === undefined) {
        throw new NoObjectGeneratedError();
      }

      result = functionArgs;

      break;
    }

    default: {
      const _exhaustiveCheck: never = objectMode;
      throw new Error(`Unsupported objectMode: ${_exhaustiveCheck}`);
    }
  }

  const parseResult = safeParseJSON({ text: result });

  if (!parseResult.success) {
    throw new ObjectParseError({
      valueText: result,
      cause: parseResult.error,
    });
  }

  const validationResult = schema.validate(parseResult.value);

  if (!validationResult.success) {
    throw new ObjectValidationError({
      valueText: result,
      value: parseResult.value,
      cause: validationResult.error,
    });
  }

  return new GenerateObjectResult({
    object: validationResult.value,
  });
}

export class GenerateObjectResult<T> {
  readonly object: T;

  constructor(options: { object: T }) {
    this.object = options.object;
  }
}
