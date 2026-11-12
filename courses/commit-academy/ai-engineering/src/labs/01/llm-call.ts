/*
  ENUNCIADO:

  Como AI Engineer, el modelo es un componente que consumes desde tu código. 
  Antes de construir nada sobre él, es fundamental saber:

  - Configurar el acceso al servicio de inferencia sin escribir la clave en el código.
  - Hacer una llamada a un modelo y leer lo que devuelve: el texto, el motivo de fin 
  y el consumo de tokens.
  - Observar dos comportamientos que marcan todo lo que construirás después: 
  las respuestas cambian entre llamadas y todo se mide en tokens.
  - Una llamada a un modelo es una petición a un servicio web: envías el modelo, 
  los mensajes y un límite de longitud; recibes el texto y el consumo.

  pasos a seguir:
    1. Preparación del entorno
      1.1. Instalar el lenguaje (python o ts)
      1.2. Crear el proyecto e instalar las dependencias
      1.3. Crear el archivo .env
    2. Primera llamada
      Ejemplo:
        import "dotenv/config"; // carga la clave y la dirección del servicio desde .env
        import OpenAI from "openai";

        const client = new OpenAI(); // lee OPENAI_API_KEY y OPENAI_BASE_URL del entorno
        const MODELO = process.env.MODELO ?? "fast";

        const response = await client.chat.completions.create({
          model: MODELO,
          max_completion_tokens: 256, // límite de la respuesta, en tokens
          messages: [
            { role: "user", content: "Explica qué es un LLM en una sola frase." },
          ],
        });

        La respuesta llega dentro de una lista de opciones (choices); usamos la primera.
        const eleccion = response.choices[0];
        console.log(eleccion.message.content || "(respuesta vacía)");

        Por qué terminó: "stop" = de forma natural; "length" = se cortó por el límite.
        console.log(`\n[fin] ${eleccion.finish_reason}`);
        console.log(
          `[tokens] entrada=${response.usage?.prompt_tokens} salida=${response.usage?.completion_tokens}`,
        );
    3. Experimento: ¿la misma pregunta da la misma respuesta?
        3.1. En el script, cambiar la pregunta por una abierta, por ejemplo: 
        "Propón un nombre para una cafetería".
        3.2. Ejecutar exactamente la misma petición tres veces.
        3.3. Anotar las tres respuestas y si son idénticas.
    4. Experimento: tokens frente a palabras
        4.1. Cambiar la pregunta por un texto mucho más largo, de al menos 100 palabras.
        4.2. Ejecutar y anotar los tokens de entrada.
        4.3. Contar las palabras del texto y compararlas con los tokens de entrada.
    5. Experimento: forzar un corte
        5.1. En el script, bajar el límite de longitud de la respuesta (max_completion_tokens) de 256 a 10.
        5.2. Pedir algo que necesite una respuesta larga, por ejemplo: "Explica qué es un LLM en 
        tres párrafos".
        5.3. Verificar que el motivo de fin es length y que la respuesta está cortada o vacía.
        5.4. Devolver el límite a 256.
*/

import { useAnthropic } from "../../models/anthropic.ts";
import { useOpenai } from "../../models/openai.ts";
import { useVercel } from "../../models/vercel.ts";
import type {
	Providers,
	ProvidersParams,
} from "../../types/providers-params.types.ts";

const firstQ: ProvidersParams = {
	model: "fast",
	prompt: "Propón un nombre para una cafetería",
	maxTokens: 256,
};

const secondQ: ProvidersParams = {
	model: "fast",
	prompt:
		" Quiero entender a fondo cómo un modelo de lenguaje grande genera texto. " +
		"Primero, explícame qué es exactamente un token, en qué se diferencia de una " +
		"palabra o de un carácter, y por qué una misma palabra puede dividirse en varios " +
		"tokens según el idioma o el tokenizador que se use. Después, describe paso a paso " +
		"cómo el modelo calcula una distribución de probabilidad sobre todo su vocabulario para " +
		"decidir cuál es el siguiente token, incluyendo el papel de los logits y de la función softmax." +
		"Por último, explica cómo influyen parámetros como temperature, top-k y top-p en la elección final" +
		"entre una palabra muy probable y otra menos probable, y da un ejemplo concreto con números para " +
		"que pueda visualizar el proceso completo.",
	maxTokens: 256,
};

const thirdQ: ProvidersParams = {
	model: "fast",
	prompt: "Explica qué es un LLM en tres párrafos",
	maxTokens: 256,
};

export async function lab01(
	params: ProvidersParams,
	provider: Providers,
): Promise<string> {
	switch (provider) {
		case "openai": {
			const openaiResponse = await useOpenai(params);

			const content = openaiResponse.choices[0].message.content;
			const stopReason = openaiResponse.choices[0].finish_reason;

			const message =
				`\n[fin] ${stopReason}` +
				`\n[tokens] entrada=${openaiResponse.usage?.prompt_tokens} | salida=${openaiResponse.usage?.completion_tokens}` +
				`\n[content] ${content || "(respuesta vacía)"}`;

			return message;
		}
		case "anthropic": {
			const anthropicResponse = await useAnthropic(params);

			const message = anthropicResponse.content
				.filter((msg) => msg.type === "text")
				.map((content) => content.text)
				.join("");

			return (
				`\n[fin] ${anthropicResponse.stop_reason}` +
				`\n[tokens] entrada=${anthropicResponse.usage.input_tokens} | salida=[${anthropicResponse.usage.output_tokens}]` +
				`\n[content] ${message}`
			);
		}

		case "vercel": {
			const vercelResponse = await useVercel(params);
			const { text, finishReason, usage } = vercelResponse;

			return (
				`\n[fin] ${finishReason}` +
				`\n[tokens] entrada=${usage.inputTokens} | salida=${usage.outputTokens}` +
				`\n[content] ${text || "(respuesta vacía)"}`
			);
		}

		default: {
			const unknownProvider: never = provider;
			throw new Error(
				`Provider desconocido: "${unknownProvider}". Usa: openai | anthropic | vercel`,
			);
		}
	}
}

try {
	const message = await lab01(thirdQ, "openai");

	console.log(message);
} catch (error) {
	console.error("[error]", error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
