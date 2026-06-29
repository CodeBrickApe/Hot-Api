const { z } = require("zod");

const hotItemSchema = z
  .object({
    title: z.string().min(1),
  })
  .passthrough();

const hotItemsSchema = z.array(hotItemSchema);

const normalizeItems = (items) => {
  const parsed = hotItemsSchema.safeParse(items);
  if (!parsed.success) {
    const error = new Error("Provider returned invalid items");
    error.validation = parsed.error;
    throw error;
  }
  return parsed.data;
};

module.exports = {
  hotItemSchema,
  hotItemsSchema,
  normalizeItems,
};
