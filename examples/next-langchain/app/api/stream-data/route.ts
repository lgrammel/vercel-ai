import {
  StreamingTextResponse,
  createStreamDataTransformer,
  experimental_StreamData,
} from 'ai';

import { ChatOpenAI } from 'langchain/chat_models/openai';
import { BytesOutputParser } from 'langchain/schema/output_parser';
import { PromptTemplate } from 'langchain/prompts';

export const runtime = 'edge';

export async function POST(req: Request) {
  const data = new experimental_StreamData();

  const model = new ChatOpenAI({ streaming: true });

  const stream = await PromptTemplate.fromTemplate('{input}')
    .pipe(model)
    .pipe(new BytesOutputParser())
    .stream(
      { input: 'Hello' },
      {
        callbacks: [
          {
            handleChainEnd(outputs, runId, parentRunId) {
              // check that main chain (without parent) is finished:
              if (parentRunId == null) {
                data.append({ t1: 'v1' });
                data.close();
              }
            },
          },
        ],
      },
    );

  return new StreamingTextResponse(
    stream.pipeThrough(createStreamDataTransformer(true)),
    {},
    data,
  );
}
