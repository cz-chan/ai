import * as fs from "fs/promises";
import * as path from "path";
import { configLLM } from "../config.ts";
import { processDirectory } from "./chunker.ts";
import { generateEmbeddings } from "./embeddings.ts";
import { VectorStore } from "./vector-store.ts";

const PREVIEW_JSON = path.join(
	path.dirname(configLLM.dbPath),
	"chunks-preview.json",
);

export async function runIngest(
	docsPath: string = configLLM.docsPath,
): Promise<void> {
	console.log(`initializing docs ingest...` + `Dir: ${docsPath}\n`);

	const chunks = await processDirectory(docsPath);

	if (chunks.length === 0) {
		throw new Error(`there are not a .md files in directory "${docsPath}"`);
	}

	console.log(`total chunks generated: ${chunks.length}\n`);
	console.log(`generating embeddings\n`);

	const texts = chunks.map((chunk) => chunk.content);
	const embeddings = await generateEmbeddings(texts);

	if (!embeddings[0]) {
		throw new Error(`error generating embeddings`);
	}

	const dimensions = embeddings[0].length ?? 0;

	console.log(`embeddings generated. there are ${dimensions} dimensions c/u`);

	/*
		guardado de una preview de un .json para una posible depuración
	*/
	const preview = chunks.map((chunk, i) => ({
		id: chunk.id,
		content:
			chunk.content.slice(0, 200) + (chunk.content.length > 200 ? "..." : ""),
		metadata: chunk.metadata,
		embeddingsPreview: (embeddings[i] ?? []).slice(0, 5),
		embeddingsDimensions: embeddings[i]?.length ?? 0,
	}));
	// guardado de información
	await fs.mkdir(path.dirname(PREVIEW_JSON), { recursive: true });
	await fs.writeFile(PREVIEW_JSON, JSON.stringify(preview, null, 2), "utf-8");
	console.log(`saving vector file in ${configLLM.dbPath}`);
	const store = new VectorStore(configLLM.dbPath);
	store.clear(); // esto es para hacer una ingestión limpia
	for (let index = 0; index < chunks.length; index++) {
		const chunk = chunks[index];
		const embedding = embeddings[index];
		if (chunk && embedding) {
			store.insert(chunk, embedding);
		}
	}
	console.log(
		`saved ${store.size} vector store chunk in ${configLLM.dbPath}\n`,
	);
	console.log(`total: ${chunks.length} chunks processed\n`);
	console.log(`ingest completed. ready to the semantic search.`);

	/*
	guardado de los chunks en la db para la búsqueda semántica
	*/
}

// haces el propio llamado de la función para que se haga de manera automática
runIngest().catch((err: Error) =>
	console.error(`Error during ingestion: ${err.message}`),
);
