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
					"el agente debe devolver los tres puntos clave del texto proporcionado",
				),
			z
				.literal("category")
				.describe(
					"etiqueta un mensaje con una categoría (por ejemplo: ticket de soporte) sobre el tema del que va el texto dado",
				),
			z
				.literal("extract")
				.describe(
					"devuelve un dato sobre el cual el usuario haya preguntado en un texto concreto (por ejemplo: un nombre, una fecha o un importe)",
				),
		],
		'unknown tool. only accept: "--summary", "--category" or "--extract" for now.',
	),
});

export type Tools = z.infer<typeof toolsSchema>;

export const cliArgsSchema = flagsSchema.extend(toolsSchema.shape);
