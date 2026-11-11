import z from "zod";

/**
 * estos nombres tienen el siguiente uso:
 *
 * fast: Rápido y barato · día a día
 * smart: Razonamiento y código difícil
 * embed: RAG y búsqueda semántica
 * rerank: Reordenar resultados de búsqueda
 * chaos: Falla a propósito: practica reintentos
 */

export const llmModelNames = z.literal([
	"fast",
	"smart",
	"embed",
	"rerank",
	"chaos",
]);

export type LLM_MODEL_NAMES = z.infer<typeof llmModelNames>;
