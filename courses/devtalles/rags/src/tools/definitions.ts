// https://platform.claude.com/docs/es/agents-and-tools/tool-use/define-tools
/*
	esta es la forma por la cual anthropic quiere que se creen las tools
	y se le pasen a claude.

	cuando vas a crear algún tipo de tool en caso de que de un error, haz que
	ese error salga como un string y envíaselo de nuevo a claude para que entienda
	qué es lo que ha pasado y lo corrija
*/

import type { ToolDefinition } from "../types/tool-use.types.ts";

export const TOOL_DEFINITIONS: ToolDefinition[] = [
	{
		name: "list_files",
		description:
			"Lista los archivos de un directorio del proyecto. " +
			"Útil para explorar la estructura del codebase antes de leer archivos específicos. " +
			"Puede filtrar por extensión de archivo.",
		input_schema: {
			type: "object",
			properties: {
				path: {
					type: "string",
					description:
						"Ruta del directorio a listar, relativa al proyecto (ej: './src', './src/llm'). " +
						"Usa '.' para el directorio raíz del proyecto.",
				},
				extension: {
					type: "string",
					description:
						"Extensión de archivo para filtrar resultados (ej: '.ts', '.md', '.json'). " +
						"Si se omite, se listan todos los archivos.",
				},
			},
			required: ["path"],
		},
	},
	{
		name: "read_file",
		description:
			"Lee el contenido completo de un archivo del proyecto. " +
			"Útil para inspeccionar código fuente, configuración, o documentación. " +
			"Limitado a archivos de máximo 50,000 caracteres.",
		input_schema: {
			type: "object",
			properties: {
				file_path: {
					type: "string",
					description:
						"Ruta del archivo a leer, relativa al proyecto (ej: './src/config.ts', './README.md'). " +
						"Debe ser la ruta completa incluyendo nombre y extensión.",
				},
			},
			required: ["file_path"],
		},
	},
	{
		name: "search_code",
		description:
			"Busca un patrón de texto en los archivos del proyecto y retorna las líneas que coinciden " +
			"con contexto de 2 líneas arriba y abajo. " +
			"Útil para encontrar usos de funciones, variables, o patrones específicos en el codebase.",
		input_schema: {
			type: "object",
			properties: {
				pattern: {
					type: "string",
					description:
						"Texto a buscar (búsqueda exacta por substring, sensible a mayúsculas). " +
						"Ejemplo: 'askClaude', 'export default', 'import Anthropic'",
				},
				path: {
					type: "string",
					description:
						"Directorio donde buscar, relativo al proyecto (ej: './src', './src/llm'). " +
						"Si se omite, busca en todo el proyecto.",
				},
				file_extension: {
					type: "string",
					description:
						"Filtrar búsqueda a archivos con esta extensión (ej: '.ts', '.md'). " +
						"Si se omite, busca en todos los tipos de archivo.",
				},
			},
			required: ["pattern"],
		},
	},
];
