# Insights a a las preguntas dadas

## Experimento 1

1. En el script, cambiar la pregunta por una abierta, por ejemplo: "Propón un nombre para una cafetería".
2. Ejecutar exactamente la misma petición tres veces.
3. Anotar las tres respuestas y si son idénticas.

### Tipos de datos y funciones y respuestas dadas

#### tipos de datos y funciones

**Tipos de datos**:

```ts
// providers-params.types.ts
import z from "zod";
import { llmModelNames } from "./ai-model-names.types";

const providersParams = z.object({
	model: llmModelNames,
	prompt: z.string("the prompt is required"),
	maxTokens: z.number().min(10).max(1024),
	systemPrompt: z.string().optional(),
});

export type ProvidersParams = z.infer<typeof providersParams>;

export const providers = z.literal(["openai", "anthropic", "vercel"]);
export type Providers = z.infer<typeof providers>;

// ai-model-names.types.ts
import z from "zod";
export const llmModelNames = z.literal([
	"fast",
	"smart",
	"embed",
	"rerank",
	"chaos",
]);

export type LLM_MODEL_NAMES = z.infer<typeof llmModelNames>;
```

**Función para llamar a las funciones de los distintos modelos/LLMs**:

**Prompt proporcionado**:

    ```ts
    const firstQ: ProvidersParams = {
      model: "fast",
      prompt: "Propón un nombre para una cafetería",
      maxTokens: 256,
    };
    ```

```ts
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
	const message = await lab01(firstQ, "openai");

	console.log(message);
} catch (error) {
	console.error("[error]", error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
```

```ts

```

#### respuesta dadas con el mismo prompts y los mismos maxTokens, sin system prompt ni cambiando el modelo

1. Primera respuesta

   ```md
   pnpm lab:01
   $ node --env-file=.env src/labs/01-llm-call.ts

   [fin] stop
   [tokens] entrada=17 | salida=252
   [content] # Nombres para una cafetería

   Aquí te propongo algunos opciones:

   ## Clásicos y acogedores:

   - **La Taza Perfecta**
   - **Café Aroma**
   - **El Refugio del Café**
   - **Granos & Tostados**

   ## Modernos y trendy:

   - **Brew & Co.**
   - **Café Nómada**
   - **The Coffee Lab**
   - **Ritual Café**

   ## Con carácter local:

   - **Café Barrio**
   - **La Espuma**
   - **Torrefacto**
   - **Punto Café**

   ## Más creativos:

   - **Pausa Café**
   - **Entre Tazas**
   - **Nota de Café**
   - **Cafetería en Proceso**

   ¿Te gustaría que profundice en alguno de estos o que ajuste el estilo según la atmósfera que buscas (bohemia, profesional, minimalista, etc.)?
   ```

2. Segunda respuesta

   ```md
   pnpm lab:01
   $ node --env-file=.env src/labs/01/llm-call.ts

   [fin] length
   [tokens] entrada=17 | salida=256
   [content] # Nombres para una cafetería

   Aquí te propongo algunas opciones:

   ## Modernos y desenfadados

   - **Granos & Historias**
   - **La Brújula del Café**
   - **Tostadería Urbana**
   - **Café Contraste**

   ## Cálidos y acogedores

   - **Refugio de Aromas**
   - **Casa Taza**
   - **El Rincón del Café**
   - **Sorbo a Sorbo**

   ## Creativos y únicos

   - **Espresso Crónica**
   - **Café Encuentro**
   - **Nota de Café**
   - **Destello (Espresso Bar)**

   ## Más minimalistas

   - **Café Pausa**
   - **Punto Negro**
   - **Grano Simple**

   ---

   **Mi favorita sería "Granos & Historias"** porque sugiere que cada taza tiene una historia, lo que le da una identidad memorable y acogedora.

   ¿Te gu
   ```

3. Tercera respuesta

   ```md
   $ node --env-file=.env src/labs/01/llm-call.ts

   [fin] stop
   [tokens] entrada=17 | salida=236
   [content] # Sugerencias de nombres para cafetería

   Aquí te propongo algunas opciones:

   ## Clásicos y acogedores

   - **Café Refugio**
   - **La Moka**
   - **Grano & Taza**
   - **Aromas del Café**

   ## Modernos y dinámicos

   - **Brew House**
   - **The Coffee Lab**
   - **Espresso & Co.**
   - **Café Punto**

   ## Con personalidad

   - **Pausa Perfecta**
   - **Café Bohemio**
   - **La Barra Negra**
   - **Tostadería Local**

   ---

   **¿Te gustaría que profundice en alguno de estos o que te sugiera opciones en otra línea?** Puedo ayudarte considerando:

   - El estilo de tu cafetería
   - Tu ubicación o público objetivo
   - Si prefieres nombres en español, inglés o bilingües
   ```

**Conclusiones**:

    Al ser los LLMs modelos probabilisticos, no deterministas, y sabiendo que los tokens funcionan por proximidad, las respuestas son parecidas, las 3 responden a la pregunta `Propón un nombre para una cafetería` pero no son idénticas. Incluso la segunda pregunta se corta

## Experimento 2

El segundo experimeto tiene como prompt:

```ts
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
```

La respuesta dada:

```md
pnpm lab:01
$ node --env-file=.env src/labs/01/llm-call.ts

[fin] length
[tokens] entrada=197 | salida=256
[content] # Guía Completa: Cómo los LLMs Generan Texto

Te lo explicaré en tres actos, con ejemplos concretos y visualizaciones numéricas.

---

## PARTE 1: ¿Qué es un Token?

### Definición fundamental

Un **token** es la unidad atómica que el modelo procesa. No es necesariamente una palabra: es lo que el tokenizador decide que sea.

Ejemplo simple:
Texto: "Hola, mundo!"

Posibilidades de tokenización:

A) Por carácter (char-level):
['H', 'o', 'l', 'a', ',', ' ', 'm', 'u', 'n', 'd', 'o', '!']
→ 12 tokens

B) Por palabra (word-level):
['Hola', ',', 'mundo', '!']
→ 4 tokens

C) Por subpalabra (subword - lo que usan GPT/Llama):
['
```

**Conclusión**:

    Las palabras de entrada, usando la herramienta [qiip.me](https://qiip.me/word-count) (un mini spam de un "producto" creado por mi) son **123 palabras** y **728 caracteres**.

    Mientras que según la respuesta, los tokens de entra son 197. Hay un aumento de los tokens vs. las palabras pero una disminución vs. los caracteres. Esto se debe a cómo es que un LLM contabiliza los tokens ya que no siempre un token es igual a una palabra o a un caracter. Dependerá tanto del modelo como de la palabra/caracter.

## Experimento 3

La función recibe como parámetros:

```ts
const thirdQ: ProvidersParams = {
	model: "fast",
	prompt: "Explica qué es un LLM en tres párrafos",
	maxTokens: 10,
};
```

Con límete de `maxTokens: 10`:

```md
$ node --env-file=.env src/labs/01/llm-call.ts

[fin] length
[tokens] entrada=22 | salida=10
[content] # ¿Qué es un L
```

Con límite de `maxTokens: 256`:

```md
$ node --env-file=.env src/labs/01/llm-call.ts

[fin] length
[tokens] entrada=22 | salida=256
[content] # ¿Qué es un LLM?

Un **LLM (Large Language Model)** es un modelo de inteligencia artificial entrenado con enormes cantidades de texto para comprender y generar lenguaje natural. Estos modelos utilizan redes neuronales profundas, específicamente la arquitectura de transformers, que les permite procesar y analizar patrones complejos en el lenguaje. Son "grandes" porque contienen millones o miles de millones de parámetros (variables ajustables) que permiten captar matices del idioma.

El funcionamiento de un LLM se basa en predecir la siguiente palabra o token más probable en una secuencia. Durante el entrenamiento, el modelo aprende a asociaciones entre palabras, conceptos y contextos mediante el análisis de textos de internet, libros y otras fuentes. Esta capacidad le permite no solo generar texto coherente, sino también responder preguntas, traducir idiomas, resumir contenidos y realizar diversas tareas lingüísticas sin ser programado específicamente para cada una.

Ejemplos popul
```

**Conclusión**: en ambos casos las respuestas se terminan por `length` pero en una con `output_tokens` de 10 y la otra de 256.
