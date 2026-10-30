// proveedores disponibles (existe en runtime, el tipo se deriva de aquí)
export const providers = {
	anthropic: "anthropic",
	openai: "openai",
	deepseek: "deepseek",
	moonshot: "moonshot",
	minimax: "minimax",
} as const;

export type ModelProvider = (typeof providers)[keyof typeof providers];

// lista para validar y mostrar en errores
export const MODEL_PROVIDERS = Object.values(providers);

export interface AppConfig {
	provider: ModelProvider;
	apiKey: string;
	model: string;
	docsPath: string;
	dbPath: string;
	ragTopK: number;
}

export interface EmbeddingConfig extends AppConfig {
	embeddingModel: string;
}

export interface AgentResponse {
	text: string;
	toolsUse: string[];
	inputTokens: number;
	outputTokens: number;
}
