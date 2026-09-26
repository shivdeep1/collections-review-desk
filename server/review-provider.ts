import type { ModelAdapter } from './model.ts';
import { createGeminiModel } from './model.ts';
import { createSarvamReviewModel } from './sarvam-review.ts';

export function reviewProviders() {
  const sarvam = createSarvamReviewModel();
  const gemini = createGeminiModel();
  const defaultProvider = process.env.REVIEW_PROVIDER === 'gemini' ? 'gemini' : 'sarvam';
  const selected = defaultProvider === 'gemini' ? gemini : sarvam;
  const model: ModelAdapter = {
    info: selected.info,
    review(source, loanContext, options) {
      return (
        options?.provider === 'gemini' ? gemini : options?.provider === 'sarvam' ? sarvam : selected
      ).review(source, loanContext, options);
    },
  };
  return {
    model,
    availability: {
      defaultProvider,
      sarvam: sarvam.info().configured,
      gemini: gemini.info().configured,
    },
  };
}
