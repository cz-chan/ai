import { VectorStore } from "./vector-store.ts";
import { configLLM } from "../config.ts";
import type { RetrievedChunk } from "../types/rag.types.ts";
import { generateEmbedding } from "./embeddings.ts";

/*
  requiere un patron singleton para SOLO abrir una única estancia de la db
  y dejarla abierta durante toda la sesión
*/
let vectorStoreInstance: VectorStore | null = null;

// creamos la función que abre la instancia
function getStore(): VectorStore {
	if (!vectorStoreInstance) {
		vectorStoreInstance = new VectorStore(configLLM.dbPath);
	}

	return vectorStoreInstance;
}

export async function retrieveContext(
	query: string,
	topK: number = configLLM.ragTopK,
): Promise<RetrievedChunk[]> {
	const store = getStore();
	if (store.size === 0) {
		console.log(
			`vector store is empty. use the command '/ingest' to charge the docs`,
		);
		return [];
	}

	// capturamos el significado semántico de la pregunta
	const queryVector = await generateEmbedding(query);

	// cogemos los vextores más similares del vector store vs. la query
	const topSearchResults = store.search(queryVector, topK);

	// conversión del  SearchResult[] al RetrievedChunk[]
	const chunks: RetrievedChunk[] = topSearchResults.map((result) => ({
		...result.chunk,
		score: result.score,
	}));

	// preview para mostrar al usuario qué es lo que está buscando
	const preview = query.length > 50 ? query.slice(0, 50) + "..." : query;
	console.log(`Searching... "${preview}" -> ${chunks.length} chunks`);

	return chunks;
}

// función para hacer una reingestion y borrar los contenidos y dejarlo a cero
export function resetStore(): void {
	if (vectorStoreInstance) {
		vectorStoreInstance.close();
		vectorStoreInstance = null;
	}
}
