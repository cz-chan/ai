import * as fs from "fs/promises";
import * as path from "path";
import type { ToolDefinition, ToolNames } from "../types/tool-use.types.ts";
import { retrieveContext } from "../rag/retriever.ts";
import { TOOL_DEFINITIONS } from "../tools/definitions.ts";
import { executeTool } from "../tools/executor.ts";

// === Definiciones de las 2 tools nuevas ===

const SEARCH_DOCS_TOOL: ToolDefinition = {
	name: "search_docs",
	description:
		"Search for information in the ingested documentation using semantic search." +
		"Use it when a user asks about how to use an API, system concepts, " +
		"or any information that might be found in the project's technical documentation. " +
		"Requires that the documents be uploaded using the /ingest command. " +
		"Returns the most relevant snippets along with their source and section.",
	input_schema: {
		type: "object",
		properties: {
			query: {
				type: "string",
				description: "The question or topic to look for in the documentation.",
			},
			top_k: {
				type: "number",
				description:
					"Number of fragments to recover (default: 5, maximum: 10).",
			},
		},
		required: ["query"],
	},
};
const CREATE_ISSUE_TOOL: ToolDefinition = {
	name: "create_issue",
	description:
		"Create an issue or task in the project's ./issues/ directory." +
		"Use this when a user wants to report a bug, suggest an improvement," +
		"or create a follow-up task." +
		"Issues are saved as automatically numbered Markdown files.",
	input_schema: {
		type: "object",
		properties: {
			title: {
				type: "string",
				description: "Concise title of the issue.",
			},
			description: {
				type: "string",
				description: "Detailed description of the problem or task.",
			},
			labels: {
				type: "array",
				items: { type: "string" },
				description:
					"Etiquetas opcionales (ej: ['bug', 'enhancement', 'documentation']).",
			},
			priority: {
				type: "string",
				enum: ["low", "medium", "high"],
				description: "Prioridad del issue (default: medium).",
			},
		},
		required: ["title", "description"],
	},
};

/*
	función para buscar en la doc ingestada por búsqueda semántica.

	para ello vamos a necesitar: 

		1. parámetros necesarios: la pregunta del usuario (query) y el topK, que es el 
		nº de chunks a devolver. es decir, solo devolverá los K chunks cuyo embedding 
		sea más parecido al embedding de la pregunta
		2. Al ser una función que el resultado lo va a leer claude y con ello responder, 
		lo que se devuelve es un string 
		3. asignar un mín - máx de chunks que va a usar claude. a mas chunks más tokens
		consumidos -> más tiene que leer y procesar
		4. le pasas tanto la pregunta como el topK al retriever (el que obtiene la respuesta)
		para que pueda generar el embedding de la query y que a través del queryVector peuda
		comparar esos embeddings y devolverte RetrievedChunk[]
		5. retornas a claude un conjunto de chunks (los relevantes) diciéndole de dónde se han
		sacado y cual es el score (qué tan cerca está un vector de otro en formato %)
		6. en caso de error o que la query no haga match con ninguno se le muestra un error
		en la búsqueda del contenido y un posible error de que no hay contenido, respectivamente.

*/
async function executeSearchDocs(params: {
	query: string;
	topK?: number;
}): Promise<string> {
	try {
		// queremos el minimo y que no se pase de 10 por lo que es el del params
		// si viene, sino el 5. Y si viene que sea menor que 10, sino 10
		const topK = Math.min(params.topK ?? 5, 10);

		const chunks = await retrieveContext(params.query, topK);

		if (chunks.length === 0) {
			return (
				`There are not relevant files for this query` +
				`make sure you have ingested with "/ingest"`
			);
		}

		const results = chunks
			.map((chunk) => {
				const source = chunk.metadata.source;
				const section = chunk.metadata.heading;
				const score = (chunk.score * 100).toFixed(0); // en % sin decimales
				const content = chunk.content;

				return `[SOURCE: ${source} | SECTION: ${section} | RELEVANCE: ${score}%\n${content}]`;
			})
			.join("\n\n---\n\n");

		return `${chunks.length} relevant fragments were found:\n\n${results}`;
	} catch (error) {
		const messgae = error instanceof Error ? error.message : String(error);
		return `Error searching docs: ${messgae}`;
	}
}

/*
	función para crear las issues y devuelve el éxito/error en string

	necesitas:
		1. unos params con lo necesario para describir el issue
		2. devuelve un string en caso de exito o error dependiendo de si se puede o no
		crear el archivo de issue
		3. lo que hace falta para crear un issue de manera local:
			a. crear el directorio si no existe ( con el recursive comprueba si existe o no)
			b. nombrar el archivo
			c. crear la metadata necesaria que tendrá el issue.md
			d. crear el contenido tipo
		4. añadir el contenido al file
		5. devolver si se creó o no un issue bien
*/
async function executeCreateIssue(params: {
	title: string;
	description: string;
	priority: string;
	labels?: string[];
}): Promise<string> {
	try {
		// directorio donde guardarlo y su posterior guardado
		const issueDir = "./issues";

		await fs.mkdir(issueDir, { recursive: true });

		const existingFiles = await fs.readdir(issueDir);
		const existingIssues = existingFiles.filter((file) => file.endsWith(".md"));

		const issueNum = existingIssues.length + 1;
		const formatIssueNum = String(issueNum).padStart(3, "0"); // rellena con ceros por delante del num

		const fileName = `${formatIssueNum}-issue`;
		const fullPath = path.join(issueDir, fileName);

		// coges los 10 primeros dígitos de la fecha (YYYY-MM-DD) sino sería (YYYY-MM-DD-MM-SS)
		const issueDate = new Date().toISOString().substring(0, 10);

		const labelsString = params.labels?.join(", ") ?? "Without labels";
		const priority = params.priority ?? "medium";

		const content = `# Issue #${formatIssueNum}: ${params.title}
		## Metadata
		- **Fecha:** ${issueDate}
		- **Prioridad:** ${priority}
		- **Etiquetas:** ${labelsString}
		- **Estado:** abierto
		## Descripción
		${params.description}
		---
		*Issue creado automáticamente por DevAssistant*
		`;

		await fs.writeFile(fullPath, content, "utf-8");

		return `Issue created: ${fullPath}\n Title: ${params.title}`;
	} catch (error) {
		const messgae = error instanceof Error ? error.message : String(error);
		return `Error creating issue: ${messgae}`;
	}
}

// creamos un export de todas las tools disponibles
export const ALL_TOOLS_DEFINITION: ToolDefinition[] = [
	...TOOL_DEFINITIONS,
	SEARCH_DOCS_TOOL,
	CREATE_ISSUE_TOOL,
];

/*
	función para ejecutar cualquier tool
*/

export async function executeTools(
	name: ToolNames,
	params: Record<string, unknown>,
) {
	const availableTools: ToolNames[] = [
		"create_issue",
		"list_files",
		"read_files",
		"search_code",
		"search_docs",
	];

	switch (name) {
		case "list_files":
		case "read_files":
		case "search_code": {
			return executeTool(name, params);
		}
		case "search_docs": {
			return executeSearchDocs(params as { query: string; top_k?: number });
		}
		case "create_issue": {
			return executeCreateIssue(
				params as {
					title: string;
					description: string;
					priority: string;
					labels?: string[];
				},
			);
		}

		default:
			return `Error: unknown tool "${name}". Available tools ${availableTools.join(", ")}`;
	}
}
