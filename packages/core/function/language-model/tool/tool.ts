import { z } from 'zod';
import { ToolDefinition } from './tool-definition';

/**
 * A tool is a function with a name, description and defined inputs that can be used
 * by agents and chatbots.
 */
export interface Tool<NAME extends string, PARAMETERS, RESULT>
  extends ToolDefinition<NAME, PARAMETERS> {
  /**
   * An optional schema of the output that the tool produces. This will be used to validate the output.
   */
  returnType?: z.Schema<RESULT>;

  /**
   * The actual execution function of the tool.
   */
  execute: (args: PARAMETERS) => PromiseLike<RESULT>;
}
