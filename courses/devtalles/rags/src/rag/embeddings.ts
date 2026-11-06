import OpenAI from "openai";
import { configLLM } from "../config.ts";
import { embeddingProviders } from "../types/provider.types.ts";

const openaiClient = new OpenAI({
	apiKey: configLLM.apiKey,
});

// un embedding sería una "traducción" de una palabra o texto a un
// conjunto de números que el ai entienda
// cada modelo de ai tiene su propio sistema de embedding por lo que
// si transformo algo con openai, no podré leerlo con boyage ai y viceversa
export const generateEmbedding = async (text: string): Promise<number[]> => {
	const response = await openaiClient.embeddings.create({
		model: embeddingProviders.openai,
		input: text,
	});

	// SOLO necesitas lo que viene en el primer índice y que sea embedding
	const embedding = response.data[0]?.embedding ?? [];

	return embedding;
};

// esta es para más de una palabra. devuelve un array de arrays:
// devuelve un arrary con los distintos arrays de las distintas palabras
export const generateEmbeddings = async (
	texts: string[],
): Promise<number[][]> => {
	const response = await openaiClient.embeddings.create({
		model: embeddingProviders.openai,
		input: texts,
	});

	return response.data.map((item) => item.embedding);
};
