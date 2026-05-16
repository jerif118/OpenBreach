import { z } from "zod";

export const municipalitySeedRecordSchema = z.object({
  id: z.string().regex(/^mx-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  state: z.string().min(1),
  population: z.number().int().positive(),
  websiteUrl: z.string().url().startsWith("https://"),
  latitude: z.number().min(14).max(33),
  longitude: z.number().min(-119).max(-86),
  sourceUrl: z.string().url().startsWith("https://"),
  riskTier: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

export const municipalitySeedSchema = z.array(municipalitySeedRecordSchema).superRefine((records, ctx) => {
  const ids = new Set<string>();
  for (const [index, record] of records.entries()) {
    if (ids.has(record.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate municipality id: ${record.id}`,
        path: [index, "id"],
      });
    }
    ids.add(record.id);
  }
});

export type MunicipalitySeedRecord = z.infer<typeof municipalitySeedRecordSchema>;
