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
		if (section.length >= MAX_CHUNCK_SIZE) {
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
			// lo vas a buscar a través del doble espacio que has puesto en chunkContent
			const paragraphs = section.trim().split(/\n\n/);
			lastParagraph = paragraphs[paragraphs.length - 1] ?? "";
			globalPosition++;
			continue;
		}

		// sección para cuando un paragraph supera el maxchunksize y
		// tienees que subdividr por párrafos manteniendo el overlap entre
		// cada chunk
	}
};
