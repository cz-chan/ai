import {
	EMBEDDING_PROVIDERS,
	MODEL_PROVIDERS,
	embeddingProviders,
	llmProviders,
	type AppConfig,
	type EmbeddingConfig,
	type EmbeddingProvider,
	type LLMProvider,
} from "./types/provider.types.ts";

// fución para validar que las envs existen
function getRequiredEnvVar(name: string, defaultValue?: string): string {
	const value = process.env[name] ?? defaultValue;

	if (value === undefined || value.trim() === "") {
		throw new Error(`Env variable ${name} is required`);
	}

	return value;
}

// valida el proveedor y sus envs al momento de elegirlo
// prefijo de las envs del proveedor: "moonshot" -> "MOONSHOT"
function createConfig(provider: LLMProvider): AppConfig {
	if (!(MODEL_PROVIDERS as readonly string[]).includes(provider)) {
		throw new Error(
			`Invalid provider "${provider}". Must be one of: ${MODEL_PROVIDERS.join(", ")}`,
		);
	}

	const prefix = provider.toUpperCase();
	const apiKey = getRequiredEnvVar(`${prefix}_API_KEY`);

	// placeholder del .env.template ("sk-xxxx...")
	if (apiKey.includes("sk-xxxx")) {
		throw new Error(`${prefix}_API_KEY is still the template placeholder`);
	}

	return {
		provider,
		apiKey,
		model: getRequiredEnvVar(`${prefix}_MODEL`),
		docsPath: getRequiredEnvVar("DOCS_PATH", "./docs/sample-project"),
		dbPath: getRequiredEnvVar("DB_PATH", "./data/vectors.db"),
		ragTopK: Number(getRequiredEnvVar("RAG_TOP_K", "5")),
	};
}

// valida el embedding provider
function createEmbeddingConfig(provider: EmbeddingProvider): EmbeddingConfig {
	if (!(EMBEDDING_PROVIDERS as readonly string[]).includes(provider)) {
		throw new Error(
			`Invalid embedding provider "${provider}". Must be one of: ${EMBEDDING_PROVIDERS.join(", ")}`,
		);
	}

	const prefix = provider.toUpperCase();

	return {
		provider,
		apiKey: getRequiredEnvVar(`${prefix}_API_KEY`),
		model: getRequiredEnvVar(`${prefix}_EMBEDDING_MODEL`),
	};
}

// cambia aquí el proveedor activo
export const configLLM = createConfig(llmProviders.anthropic);
export const configEmbedding = createEmbeddingConfig(embeddingProviders.openai);
