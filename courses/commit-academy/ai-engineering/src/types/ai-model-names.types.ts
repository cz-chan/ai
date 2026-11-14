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

export const llmModelNames = z.enum([
	// le doy .enum y no .literal para poder usar la api que trae para extraer, excluir y usar solo
	// aquellos que me interesan en los labs
	"fast",
	"smart",
	"embed",
	"rerank",
	"chaos",
]);

export type LLM_MODEL_NAMES = z.infer<typeof llmModelNames>;
