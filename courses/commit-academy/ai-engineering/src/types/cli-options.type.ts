import z from "zod";
import { llmModelNames } from "./ai-model-names.types.ts";

// no puedo usar discriminatedUnion porque si un flag no viene, al no existir el valor por defecto nunca se ejecuta
export const flagsSchema = z.object({
	// lo hago con .extract y no .exclude para evitar que al añadir nuevos modelos, se puedan usar por defecto
	model: llmModelNames
		.extract(
			["fast", "chaos", "smart"],
			'unknown model. only accept: "fast", "chaos" or "smart" for now.',
		)
		.default("fast"),
	maxTokens: z.coerce
		.number("--max-tokens must be a positive integer.")
		.int()
		.positive()
		.default(256),
});

export type Flags = z.infer<typeof flagsSchema>;

export const toolsSchema = z.object({
	// no lleva un default porqeu es obligatorio
	tool: z.union(
		[
			z
				.literal("summary")
				.describe(
					"El agente te va a devolver los 3 puntos clave del texto que le has proporcionado.",
				),
			z
				.literal("category")
				.describe(
					"El agente te va a etiquetar el mensaje que le has enviado con una categoría a la que él considere que puede pertenecer",
				),
			z
				.literal("extract")
				.describe(
					"El agente te va a devolver un dato concreto sobre el texto que le hayas pasado (por ejemplo: un nombre, una fecha o un importe). Si no le dices que quieres que te de en el propio mensaje, te devolverá un dato aleatorio que él elija de ese texto.",
				),
		],
		'unknown tool. only accept: "--summary", "--category" or "--extract" for now.',
	),
});

export type Tools = z.infer<typeof toolsSchema>;

export const cliArgsSchema = flagsSchema.extend(toolsSchema.shape);
