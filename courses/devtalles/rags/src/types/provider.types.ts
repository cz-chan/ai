// lista de proveedores disponibles (existe en runtime, el tipo se deriva de aquí)
export const MODEL_PROVIDERS = [
	"anthropic",
	"openai",
	"deepseek",
	"moonshot",
	"minimax",
] as const;

export type ModelProvider = (typeof MODEL_PROVIDERS)[number];

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
