//https://link.excalidraw.com/readonly/9q7zdfFAGrYRoXCTtRCV?darkMode=true
export interface ToolDefinition {
	name: ToolNames;
	description: string;
	input_schema: {
		type: "object";
		properties: Record<string, unknown>;
		required?: string[];
	};
}

export interface ToolResult {
	toolName: string;
	toolUdeId: string;
	result: string;
	isError: boolean;
}

// creo un type para el nombre de las tools para tenerlo centralizado en un único lugar
// y no tener magic string flotando por todo el proyecto
export type ToolNames =
	| "list_files"
	| "read_files"
	| "search_code"
	| "search_docs"
	| "create_issue";
