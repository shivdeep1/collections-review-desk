import { z } from 'zod';

// Gemini receives a compact generation schema. The server still validates every constraint.
export function geminiSchema(input: z.ZodType) {
  const schema = z.toJSONSchema(input);
  delete schema.$schema;
  function simplify(value: unknown) {
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    for (const field of ['minLength', 'maxLength', 'minItems', 'maxItems', 'pattern'])
      delete object[field];
    Object.values(object).forEach(simplify);
  }
  simplify(schema);
  return schema;
}
