import * as fs from "fs/promises";
import * as path from "path";
import { configLLM } from "../config.ts";
import { processDirectory } from "./chunker.ts";
import { generateEmbeddings } from "./embeddings.ts";

const PREVIEW_JSON = path.join(
	path.dirname(configLLM.dbPath),
	"chunks-preview.json",
);

export async function runIngest(
	docsPath: string = configLLM.dbPath,
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

	// guardado de una preview de un .json para una posible depuración

	// guardado del .json 'real' para la búsqueda semántica
}
