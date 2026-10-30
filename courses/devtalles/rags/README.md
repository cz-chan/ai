# RAG - DevAssistant

Proyecto del curso de RAGs (DevTalles).

## Plan

1. **Ahora:** seguir el curso usando los SDKs oficiales de cada proveedor (`@anthropic-ai/sdk`, `openai`).
2. **Después:** migrar al [AI SDK](https://ai-sdk.dev/) de Vercel (`ai`).

---

## Cómo conectarse a los LLMs: SDKs, AI SDK y gateways

Se eligen dos cosas por separado: la **librería** que usas en el código y, opcionalmente, un **gateway** que se pone entre tu código y el proveedor.

```
tu código
   │
   ├─ librería:  SDKs oficiales  |  AI SDK (Vercel)  |  openai + baseURL
   │
   ├─ gateway (opcional): Vercel AI Gateway | OpenRouter | LiteLLM | Cloudflare | Portkey
   │
   └─ proveedor: Anthropic, OpenAI, DeepSeek, Moonshot, MiniMax…
```

Combinaciones válidas, por ejemplo:

- SDKs oficiales → directo al proveedor (sin gateway)
- AI SDK → directo al proveedor
- AI SDK → OpenRouter
- `openai` + `baseURL` → Vercel AI Gateway

### "AI de Vercel" son dos productos distintos

|                         | AI SDK (`ai`)                                           | Vercel AI Gateway                                                         |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Qué es                  | Una librería open source que corre en tu código         | Un servicio hosted (proxy)                                                |
| Costo                   | Gratis                                                  | Cobra Vercel (o usas BYOK con tus keys)                                   |
| Keys                    | Las de cada proveedor                                   | Una sola: `AI_GATEWAY_API_KEY`                                            |
| Por dónde va el request | Directo a `api.anthropic.com` / `api.openai.com`        | Por los servidores de Vercel y de ahí al proveedor                        |
| ¿Cambia la plataforma?  | **No**: misma cuenta, misma facturación, mismos modelos | **Sí**: Vercel queda en medio (facturación, datos, funciones disponibles) |

**El AI SDK por sí solo no cambia de plataforma, solo la forma de escribir el código. El AI Gateway sí la cambia, porque mete a Vercel en medio.**

---

## SDKs oficiales vs AI SDK

|                                                                           | SDKs oficiales (`@anthropic-ai/sdk` + `openai` con `baseURL`)                                                                                                    | AI SDK de Vercel                                                                    |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| API                                                                       | 2 formatos distintos: Anthropic usa `messages.create`, OpenAI usa `chat.completions`                                                                             | 1 sola (`generateText`, `streamText`) para todos                                    |
| Tool use                                                                  | Formatos distintos: Anthropic con bloques `tool_use` e `input_schema`, OpenAI con `tool_calls` y `arguments` como string JSON. El loop del agente lo escribes tú | Tools definidas con zod + `execute`. El loop multi-step viene incluido (`stopWhen`) |
| System prompt, usage, stop reason                                         | Cambian según el proveedor (`input_tokens` vs `prompt_tokens`, etc.)                                                                                             | Normalizados                                                                        |
| Streaming                                                                 | Eventos distintos en cada uno                                                                                                                                    | Mismo stream para todos                                                             |
| Structured output                                                         | Lo armas a mano                                                                                                                                                  | Schema zod                                                                          |
| Funciones específicas (prompt caching, thinking, citations, batch, betas) | Disponibles desde el día 1, con control total                                                                                                                    | Varias vía `providerOptions`, pero llegan con retraso y algunas no están            |
| Debug                                                                     | Ves exactamente el request y la respuesta                                                                                                                        | Una capa más de por medio                                                           |
| Dependencias                                                              | 2                                                                                                                                                                | `ai` + 1 por proveedor (livianas, basadas en fetch)                                 |

**Resumen:** con los SDKs oficiales la normalización entre proveedores la escribes tú. Con el AI SDK ya viene hecha.

- **SDKs oficiales:** sirven para aprender cómo funcionan realmente tool use, el loop del agente y el caching. El tipo `AgentResponse` (`text`, `toolsUse`, `inputTokens`, `outputTokens`) es la capa que normaliza las respuestas, con un adapter por formato (`anthropic.ts` y `openai-compatible.ts`).
- **AI SDK:** menos código, y cambias de proveedor solo con config.

### Proveedores compatibles con OpenAI

DeepSeek, Moonshot y MiniMax exponen endpoints compatibles con OpenAI, así que con el SDK `openai` + `baseURL` se cubren todos. Anthropic también tiene un endpoint compatible, pero limitado (sin prompt caching ni varias funciones), así que conviene usarlo con su propio SDK.

---

## Opciones con el AI SDK (para cuando migre)

### 1. Con AI Gateway (cero SDKs de proveedores)

```ts
import { generateText } from "ai";

const { text } = await generateText({
	model: "anthropic/claude-haiku-5-5", // o "openai/gpt-6-luna", "deepseek/..."
	prompt: "hola",
});
```

### 2. Con providers `@ai-sdk/*` y keys propias (recomendado)

```
pnpm add -E ai @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/deepseek @ai-sdk/openai-compatible
```

```ts
// src/llm/model.ts
import type { LanguageModel } from "ai";
import { config } from "../config.ts";

export async function getModel(): Promise<LanguageModel> {
	const { provider, apiKey, model } = config;
	switch (provider) {
		case "anthropic": {
			const { createAnthropic } = await import("@ai-sdk/anthropic");
			return createAnthropic({ apiKey })(model);
		}
		case "openai": {
			const { createOpenAI } = await import("@ai-sdk/openai");
			return createOpenAI({ apiKey })(model);
		}
		case "deepseek": {
			const { createDeepSeek } = await import("@ai-sdk/deepseek");
			return createDeepSeek({ apiKey })(model);
		}
		case "moonshot":
		case "minimax": {
			const { createOpenAICompatible } =
				await import("@ai-sdk/openai-compatible");
			const baseURL = process.env[`${provider.toUpperCase()}_BASE_URL`]!;
			return createOpenAICompatible({ name: provider, apiKey, baseURL })(model);
		}
	}
}
```

Uso: `generateText({ model: await getModel(), prompt })`. Con dynamic import solo se carga el proveedor activo.

**Embeddings:** `embed()` funciona con OpenAI y otros. Voyage (el que se usa con Anthropic) necesita un provider de la comunidad (`voyage-ai-provider`).

---

## Otros AI gateways

> Puede haber cambios recientes: revisar precios y modelos actuales.

**Hosted (SaaS)**

- **Vercel AI Gateway:** la integración más cómoda con el AI SDK.
- **OpenRouter:** el más popular. Una key, API compatible con OpenAI y cientos de modelos. Cobra una comisión sobre los créditos. Provider: `@openrouter/ai-sdk-provider`.
- **Cloudflare AI Gateway:** un proxy delante de tus propias keys con caché, rate limit, logs y analytics. Plan gratis generoso.
- **Portkey:** fallbacks, retries, load balancing y guardrails. Hay versión open source.
- **Helicone:** enfocado en observabilidad (logs, costos), también hace de gateway. Open source.
- **Requesty** y **Martian:** routers que eligen el modelo según costo o calidad.

**Self-hosted / open source**

- **LiteLLM:** proxy en Python con API OpenAI-compatible para más de 100 proveedores, keys virtuales, presupuestos y logs.
- **Kong AI Gateway** y **Envoy AI Gateway:** orientados a infra enterprise.

**Clouds (varios modelos con una cuenta)**

- **AWS Bedrock:** Claude, Llama, Mistral y otros.
- **Google Vertex AI:** Gemini y Claude.
- **Azure AI Foundry:** modelos de OpenAI y otros.

**En qué se diferencian**

- **Facturación:** unos usan tus keys (Cloudflare, LiteLLM, Portkey, Helicone) y otros te cobran ellos (OpenRouter, Vercel).
- **Compatibilidad:** casi todos exponen una API compatible con OpenAI, así que con el SDK `openai` + `baseURL` sirven todos.
- **Funciones de Claude:** caching y thinking a veces se pierden si el gateway traduce a formato OpenAI. LiteLLM, Cloudflare y Portkey dejan pasar el formato nativo de Anthropic.
