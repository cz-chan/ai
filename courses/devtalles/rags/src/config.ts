import { MODEL_PROVIDERS, type ModelProvider } from "./types/provider.types.ts";
// fución para validar que las envs existen
function getRequiredEnvVar(name: string, defaultValue?: string): string {
	const value = process.env[name] ?? defaultValue;

	if (value === undefined) {
		throw new Error(`Env variable ${name} is required`);
	}

	return value;
}

// validación del proveedor
function isModelProvider(value: string): value is ModelProvider {
	return (MODEL_PROVIDERS as readonly string[]).includes(value);
}

function validateProvider(provider: string): ModelProvider {
	if (!isModelProvider(provider)) {
		throw new Error(
			`Invalid provider "${provider}". Must be one of: ${MODEL_PROVIDERS.join(", ")}`,
		);
	}

	return provider;
}
