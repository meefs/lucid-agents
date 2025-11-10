import { z } from 'zod';
export declare function toJsonSchemaOrUndefined(
  s?: z.ZodTypeAny
): z.core.JSONSchema.JSONSchema | undefined;
