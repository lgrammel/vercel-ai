export type CallSettings = {
  /**
   * Maximum number of tokens to generate.
   */
  maxTokens?: number;

  /**
   * Temperature setting. This is a number between 0 (almost no randomness) and
   * 1 (very random).
   */
  temperature?: number;

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
};
