// proveedores disponibles (existe en runtime, el tipo se deriva de aquí)
export const llmProviders = {
	anthropic: "anthropic",
	openai: "openai",
	deepseek: "deepseek",
	moonshot: "moonshot",
	minimax: "minimax",
} as const;

export const embeddingProviders = {
	openai: "openai",
	voyage: "voyage",
} as const;

export type LLMProvider = (typeof llmProviders)[keyof typeof llmProviders];
export type EmbeddingProvider =
	(typeof embeddingProviders)[keyof typeof embeddingProviders];

// lista para validar y mostrar en errores
export const MODEL_PROVIDERS = Object.values(llmProviders);
export const EMBEDDING_PROVIDERS = Object.values(embeddingProviders);

export interface AppConfig {
	provider: LLMProvider;
	apiKey: string;
	model: string;
	docsPath: string;
	dbPath: string;
	ragTopK: number;
}

export interface AgentResponse {
	text: string;
	toolsUse: string[];
	inputTokens: number;
	outputTokens: number;
}

export interface EmbeddingConfig {
	provider: EmbeddingProvider;
	apiKey: string;
	model: string;
}
