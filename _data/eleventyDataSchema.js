import { z } from "zod";
import { fromZodError } from "zod-validation-error";

const schema = z.object({
  // Draft content, validate `draft` front matter
  draft: z.boolean().optional(),
  // Posts in a series, grouped by `name` and ordered by `part`
  series: z
    .object({
      name: z.string().trim().min(1),
      part: z.number().int().positive(),
    })
    .strict()
    .optional(),
});

function eleventyDataSchema(data) {
  const result = schema.safeParse(data);

  if (result.error) {
    throw fromZodError(result.error);
  }
}

// Eleventy calls functions exported from `_data` and uses the return value as
// the data, so return the validator rather than exporting it directly
export default function eleventyDataSchemaData() {
  return eleventyDataSchema;
}
