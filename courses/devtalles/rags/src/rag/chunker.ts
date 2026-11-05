import * as fs from "fs/promises";
import * as path from "path";
import type { Chunk } from "../types/rag.types.ts";

const MAX_CHUNCK_SIZE = 2000;

/*
  si una sección es demasiado larga quieres dividirla en distintos
  párrafos (o headings) para no llegar al límite de tokens y después mantener
  el último párrafo del anterior elemento en el siguiente (overlap) para
  tener con mejor contexto

  el texto que vamos a cortar es de tipo markdown por lo que podemos averiguar
  si es o no un heading a través de "#" pero si esa sección sigue siendo muy 
  larga, se subdivide en párrafos (esta último forma es útil para los archivos
  que no sean .md)

  en el caso de ser headings, mantenemos este visible para darle
  el contexto de qué es lo que relaciona los conceptos

  https://link.excalidraw.com/readonly/aEvBleqpdC5dj5rVlgpv?darkMode=true
*/

// lógica del pipeline de rag
export const chunkMarkdown = (content: string, filePath: string): Chunk[] => {
	const fileName = path.basename(filePath);

	const chunks: Chunk[] = [];

	// función para romper por heading 2
	const sections = content.split(/(?=^##)/m);

	let globalPosition = 0;
	let lastParagraph = "";

	for (const section of sections) {
		if (!section.trim()) continue;

		const lines = section.split("\n");
		const firstLine = lines[0] ?? "";
		const isHeading = firstLine.startsWith("## ");
		const heading = isHeading ? firstLine.trim() : "(intro)";

		// caso de uso 1: cuanod una sección cabe en un chunk
		if (section.length <= MAX_CHUNCK_SIZE) {
			// añades el último párrafo al chunk
			const chunkContent = lastParagraph
				? `${lastParagraph}\n\n${section.trim()}`
				: section.trim();

			// le añadimos un objeto con la firma chunk
			chunks.push({
				id: `${fileName}-${globalPosition}`,
				contet: chunkContent,
				metadata: {
					source: fileName,
					heading,
					position: globalPosition,
					charCount: chunkContent.length,
				},
			});

			// guardas el ultimo párrafo para el siguiente chunk
			// lo vas a buscar a través del doble espacio y el +
			const paragraphs = section.trim().split(/\n\n+/);
			lastParagraph = paragraphs[paragraphs.length - 1] ?? "";
			globalPosition++;
			continue;
		}

		// sección para cuando un paragraph supera el maxchunksize y
		// tienees que subdividr por párrafos manteniendo el overlap entre
		// cada chunk y el heading padre con tal de no perder el contexto
		// pero lo primero que hago es quitar el heading para que en el primer
		// chunck de cada sección no aparezca suplicado este heading
		// ya que estría cogiendo la sección primera + heading y después
		// añadirle el heading en el bucle for de más abajo

		const bodyWithoutHeading = isHeading // esta const hace que el body sea todo lo que está de la línea 1 en adelante, quita el
			? // heading (linea 0) y hace el trim pq el contenido de la linea 1 es un espacio
				lines.slice(1).join("\n").trim()
			: section.trim();

		const paragrphs = bodyWithoutHeading
			.split(/\n\n+/) // buscas por el doble salto y el +
			.filter((p) => p.trim().length > 0); // coges los paragraph con length mayor a cer

		let currentChunk = lastParagraph ? `${lastParagraph}\n\n` : "";

		for (let index = 0; index < paragrphs.length; index++) {
			const paragraph = paragrphs[index] ?? "";

			// el if consigue que los chunks vacios y aquellos que al sumar el currentChunk
			// que ya tenías y le añades el nuevo párrrafo superan el chunk size, se cree
			// un nuevo chunk
			if (
				currentChunk.length > 0 &&
				currentChunk.length + paragraph.length > MAX_CHUNCK_SIZE
			) {
				// aseguras de que incluyes el heading (el primer chunk de cada seccióntendría
				// una duplicidad del heading)
				const chunkContent = isHeading
					? `${heading}\n\n${currentChunk.trim()}`
					: currentChunk.trim();

				// hacemos el push del chunkContent
				chunks.push({
					id: `${fileName}-${globalPosition}`,
					contet: chunkContent,
					metadata: {
						source: fileName,
						heading: heading,
						position: globalPosition,
						charCount: chunkContent.length,
					},
				});

				// cada párrafo está ente doble salto y +
				// aquí haces que el último parrafo del chunk se convierta
				// en el inicio del siguiente
				const chunkParagraph = currentChunk.trim().split(/\n\n+/); // buscas los que tienes
				lastParagraph = chunkParagraph[chunkParagraph.length - 1] ?? ""; // cogues el último
				currentChunk = `${lastParagraph}\n\n`; // añades el que has cogido al último
				globalPosition++;
			}

			currentChunk += paragraph + "\n\n";
		}

		// esto lo que hace es añadir el último chunk residual que querdaría enel currentChunk
		// en el caso de que no haya cabido en los chunk anteriores por el límite de max size
		if (currentChunk.trim().length > 0) {
			const chunkContent = isHeading
				? `${heading}\n\n${currentChunk.trim()}`
				: currentChunk.trim();

			// hacemos el push del chunkContent
			chunks.push({
				id: `${fileName}-${globalPosition}`,
				contet: chunkContent,
				metadata: {
					source: fileName,
					heading: heading,
					position: globalPosition,
					charCount: chunkContent.length,
				},
			});

			const finalParagraph = currentChunk.trim().split(/\n\n+/); // buscas los que tienes
			lastParagraph = finalParagraph[finalParagraph.length - 1] ?? ""; // cogues el último
			globalPosition++;
		}
	}

	return chunks;
};

export async function processDirectory(dirPath: string): Promise<Chunk[]> {
	const allChunks: Chunk[] = [];
	let entries;

	try {
		entries = await fs.readdir(dirPath, { withFileTypes: true });
	} catch (error) {
		throw new Error(`It could not read the directory: ${dirPath}`);
	}

	// obtener SOLO los archivos .md yy ordenarlos alfabé.
	const markdownFiles = entries
		.filter(
			(entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"),
		)
		.sort((a, b) => a.name.localeCompare(b.name));

	for (const file of markdownFiles) {
		const fullPath = path.join(dirPath, file.name);
		let content: string;

		try {
			content = await fs.readFile(fullPath, "utf-8");
		} catch {
			console.warn(`the content could not be read`);
			continue; // este continue es útil para que si no lo encuentra,
			// nos e quede trabado en el push del chunk de abajo ya que no
			// sería un conten válido
		}

		const chunks = chunkMarkdown(content, file.name);
		allChunks.push(...chunks);
		console.log(`Processing ${file.name}... ${chunks.length}`);
	}

	return allChunks;
}
