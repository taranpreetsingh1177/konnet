import { z } from "zod";

export const DocumentNodeSchema = z.object({
    nodes: z.array(
        z.discriminatedUnion("type", [
            z.object({
                type: z.literal("coverTable"),
                rows: z.array(z.object({ label: z.string(), value: z.string() })),
            }),
            z.object({
                type: z.literal("heading"),
                level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
                text: z.string(),
            }),
            z.object({
                type: z.literal("paragraph"),
                text: z.string(),
            }),
            z.object({
                type: z.literal("bulletList"),
                intro: z.string().optional(), // e.g. "Alvion can support:"
                items: z.array(z.string()),
            }),
            z.object({
                type: z.literal("table"),
                headers: z.array(z.string()),
                rows: z.array(z.array(z.string())),
            }),
            z.object({
                type: z.literal("questionGroup"),
                category: z.string(),
                questions: z.array(z.string()),
            }),
            z.object({
                type: z.literal("footer"),
                text: z.string(),
            }),
        ])
    ),
});

export type DocumentAST = z.infer<typeof DocumentNodeSchema>;
