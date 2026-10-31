import * as fs from "fs/promises";
import * as path from "path";

const PROJECT_ROOT = process.cwd(); // con esto sabes dónde está el proyecto en el pc
const MAX_FILE_SIZE = 50_000;
const MAX_SEARCH_RESULT = 20;
const CONTEXT_LINES = 2;

// 1º función: validar la ruta del proyecto para que claude NUNCA se pueda ir a otra ruta o lea otros
// archivos que no están en el proyecto
function resolveSecurePath(targetPath: string): string | null {
	const absolutePath = path.resolve(PROJECT_ROOT, targetPath);

	/*
    esto es para evitar falsos positivos y que posibles carpetas que están nombradas igual
    por ejemplo "algo-dev" y "algo-dev-extra" den como iguales

    con el método sep decimos cuál es el final del archivo para que no busque posibles
    coincidencias de nombre no absolutas. yo estaría buscando el "algo-dev" y como este
    acaba en dev, el sep le podría algo como "/" o "\" para saber que tiene que ser EXACTO eso
    y no que busque más validaciones de archivos o folders
  */
	const projectWithSep = PROJECT_ROOT + path.sep;

	if (!absolutePath.startsWith(projectWithSep) && absolutePath !== PROJECT_ROOT)
		return null;

	return absolutePath;
}

// 2º función: explorador de archivos, sirve para buscar los archivos de manera recursiva y meterlos en un arr
// si hay un dir, busca dentro de este los archivos
async function collectFiles(
	dirPath: string,
	extension?: string, // si viene con extensión se le puede quitar o se le puede decir cuál tiene
): Promise<string[]> {
	const results: string[] = []; // aquí se almacenan todas las rutas absolutas

	// estos son los directorios/archivos que se van a ir recorriendo por eso no tiene un tipo, depende
	// de lo que mire es una cosa u otra
	let entries;

	// trycatch porque siempre puede fallar algo con fs y las promesas
	try {
		entries = await fs.readdir(dirPath, { withFileTypes: true });
	} catch {
		return results; // objeto vacio
	}
	for (const entry of entries) {
		// esta validación es para uqe no mire ni los archivos ocultos ni los node_module.
		// si tienes algún tipo de elemento que tenga este punto, como .claude, y tu quieres
		// que lo mire, no podrá
		if (entry.name === "node_modules" || entry.name.startsWith(".")) {
			continue;
		}

		const fullPath = path.join(dirPath, entry.name);

		// aquí es donde entra la recursividad porque si es un directorio, necesitas esta recursividad
		// para que mire qué es lo que hay dentro de este
		if (entry.isDirectory()) {
			const subFile = await collectFiles(fullPath, extension);
			results.push(...subFile);
		} else if (entry.isFile()) {
			// si tiene extensión lo envias
			if (!extension || entry.name.endsWith(extension)) {
				results.push(fullPath);
			}
		}
	}

	return results;
}

// 3º función: muestra los archivos después de haber validado el lugar y el propio archivo
async function executeListFiles(params: {
	path: string;
	extension?: string;
}): Promise<string> {
	const securePath = resolveSecurePath(params.path);

	if (!securePath) {
		return `Security error in this path: "${params.path}". Please try it by your own.`;
	}

	try {
		const stat = await fs.stat(securePath);
		if (!stat.isDirectory()) {
			return `Error in ${stat}. This directory does not exist`;
		}
	} catch {
		return `Error in directory: "${params.path}". It does not exist.`;
	}

	const files = await collectFiles(securePath, params.extension);

	if (files.length === 0) {
		const filterFile = params.extension
			? `with extension ${params.extension}`
			: "";

		return `There are not find files ${filterFile} in "${params.path}"`;
	}

	// conversión de rutas absolutas a relativas para que sean más legibles
	const relativePaths = files.map((file) => path.relative(PROJECT_ROOT, file));

	return relativePaths.join("\n");
}

/*
  el patron para crear las tools debería ser:

    1º seguridad
    2º validaciones / verificación del contexto
    3º lógica de la tool
*/

// leer un archivo con un llm es más complejo que uno mismo porque requiere
// de guardrails para que no se salga de lo que lee o que tien un contexto
// de tokens limitado -> necesitas ser defensivo y verificar el tamaño
// y ser reactivo ante carácteres especiales

// 4º función: lectura de archivos a través del LLM sin que haya errores de lectura
// o donde se exceda los tokens que usa para ello
async function executeReadFile(params: { file_path: string }): Promise<string> {
	// validación de que lo que intenta leer está dentro del proyecto (similar al executeListFiles)
	const securePath = resolveSecurePath(params.file_path);
	if (!securePath) {
		return `Security Error: the root ${params.file_path} is outside the project dir`;
	}

	try {
		// auqí QUEREMOS leer el ARCHIVO, no el directorio
		const stat = await fs.stat(securePath);
		if (!stat.isDirectory()) {
			return `Error: ${params.file_path} is a directory not a file`;
		}

		// verificación de tamaño
		if (stat.size > MAX_FILE_SIZE) {
			return (
				`This files is to big (${stat.size} bytes)` +
				`Try to read only a specific section`
			);
		}

		// un byte puede ser varios caracteres en utf-8 (ñ por ejemplo)
		const content = await fs.readFile(securePath, "utf-8");
		if (content.length > MAX_FILE_SIZE) {
			return content.slice(0, MAX_FILE_SIZE) + `\n\n [truncate file]`;
		}

		return content;
	} catch (error) {
		// error más común a la hora de leer un archivo es que no lo encuentra por lo que
		// creamos una constante que sea un erropr del tipo "no he encontrado el archivo"
		// y el errror que suele dar es 'ENOENT' y viene de node
		const err = error as NodeJS.ErrnoException;
		if (err.code === "ENOENT") {
			return `Error: the file ${params.file_path} does not exist.`;
		}

		return `Error reading file: ${params.file_path}`;
	}
}

// herramienta para que claude pueda buscar cualquier patron de texto y pueda tener
// algún tipo de contexto alrededor de esa línea que está leyendo (parecido al comando GREP)
async function executeSearchCode(params: {
	pattern: string;
	path?: string;
	file_extension?: string;
}): Promise<string> {
	// si no viene el path, tiene que coger en el que se encuentra el archivo
	const searchPath = params.path ?? ".";

	const securePath = resolveSecurePath(searchPath);
	if (!securePath) {
		return `Security Error: the root ${securePath} is outside the project dir`;
	}

	// recolectar los archivos que cumplen con la ruta que buscamos
	const files = await collectFiles(searchPath, params.file_extension);
	const results: string[] = [];
	let totalMatches = 0;

	let content: string;

	for (const file of files) {
		if (totalMatches >= MAX_SEARCH_RESULT) break;

		try {
			content = await fs.readFile(file, "utf-8");
		} catch {
			continue;
		}

		// dividimos el contenido para buscar las coincidencias exactas
		const lines = content.split("\n");

		// ruta relativa para buscar los resultados de manera más clara
		const relativePath = path.relative(PROJECT_ROOT, file);

		// revisión linea por linea buscando el patrón que queremos
		for (let i = 0; i < lines.length; i++) {
			if (totalMatches >= MAX_SEARCH_RESULT) break;

			const line = lines[i] ?? "";

			// ignora la lína si no coincide con el texto buscado
			if (!line.includes(params.pattern)) continue;

			// si pasa todo esto, es que hay match
			totalMatches++;

			// creación de un bloque con las líneas cercanas para hacer agora sí el contexto
			const contextBlock: string[] = [];

			// calculo de la línea desde donde empieza el contexto hasta donde podría acabar
			const startLine = Math.max(0, i - CONTEXT_LINES);
			const endLine = Math.min(lines.length - 1, i + CONTEXT_LINES);

			for (let j = startLine; j <= endLine; j++) {
				const contextLine = lines[j] ?? "";

				// conviertes el número de línea en algo legible para humanos
				const lineNumber = j + 1;

				// defines el prefijo donde hizo el match
				const prefix = j === i ? ">" : " ";

				// añades el contenido al bloque donde se debería añadir de forma que sea legible
				contextBlock.push(
					`${prefix} ${relativePath}: ${lineNumber}: ${contextLine}`,
				);
			}

			results.push(contextBlock.join("\n"));
		}
	}

	if (results.length === 0) {
		return `no matches for: ${params.pattern}`;
	}

	// cabecera para saber qué cantidad se ha encontrado
	const header =
		totalMatches >= MAX_SEARCH_RESULT
			? `Matches: ${MAX_SEARCH_RESULT}`
			: `Matches: ${totalMatches}`;

	return header + results.join("\n\n");
}

/*
  punto de entrada del sistema. esta es la única función exportada y la que recibe la 
  llamada de claude y es la que dirige a cada una de las tools indicadas.

  además aquí se valudad los parámetros en RUN TIME antes de confiar en ellos
  para evitar que claude nos envie cualquier cosa y que TS pete ya que no protege 
  en este punto
*/

export async function executeTool(
	name: string,
	params: Record<string, unknown>,
): Promise<string> {
	// hacemos un switch porque tenemos 3 tipos de comando ESTRICTOS que puede ejecutar, ninguno más

	switch (name) {
		case "list_files": {
			// validamos que el parámetro sea el requerido, del tipo correcto y que existe

			const unknownObj = params as { path?: unknown; extension?: unknown };
			if (typeof unknownObj.path !== "string") {
				return `Error: the param 'path' is required and must be a string`;
			}

			// después de la validación, ejecutamos la tool que usaría claude para listar files
			return executeListFiles({
				path: unknownObj.path,
				extension:
					typeof unknownObj.extension === "string"
						? unknownObj.extension
						: undefined,
			});
		}

		case "read_file": {
			// validamos que el parámetro sea el requerido, del tipo correcto y que existe

			const unknownObj = params as { file_path?: unknown };
			if (typeof unknownObj.file_path !== "string") {
				return `Error: the param 'file_path' is required and must be a string`;
			}

			// después de la validación, ejecutamos la tool que usaría claude para listar files
			return executeReadFile({
				file_path: unknownObj.file_path,
			});
		}

		case "search_code": {
			// validamos que el parámetro sea el requerido, del tipo correcto y que existe

			const unknownObj = params as {
				pattern: unknown;
				path?: unknown;
				file_extension?: unknown;
			};
			if (typeof unknownObj.pattern !== "string") {
				return `Error: the param 'pattern' is required and must be a string`;
			}

			// después de la validación, ejecutamos la tool que usaría claude para listar files
			return executeSearchCode({
				pattern: unknownObj.pattern,
				path: typeof unknownObj.path === "string" ? unknownObj.path : undefined,
				file_extension:
					typeof unknownObj.file_extension === "string"
						? unknownObj.file_extension
						: undefined,
			});
		}

		default:
			return `Error: unknown tool: "${name}". You only can use: 'read_file', 'list_files' or 'search_code'. `;
	}
}
