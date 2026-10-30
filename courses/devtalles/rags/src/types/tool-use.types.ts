//https://link.excalidraw.com/readonly/9q7zdfFAGrYRoXCTtRCV?darkMode=true
export interface ToolDefinition {
	name: string;
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
