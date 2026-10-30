/*
  para "creaer" un agente conversacional, al ser cada llamada independiende a la anterior,
  no tiene un contexto por lo que esa conversación la vamos a simular añadiendo dentro de 
  un array (messages) los distintos outputs tanto del user como del agente que tendrá como
  interfaz [{role, content}]
*/

import type Anthropic from "@anthropic-ai/sdk";
import type { Message } from "../types/main.types.ts";
import type { AppConfig } from "../types/provider.types.ts";

const CHARS_PER_TOKEN = 4;

interface InitialConversation {
	message: Message[];
	systemPrompt: string;
	totalInputTokens: number;
	totalOutputTokens: number;
}

const createInitialConersationState = (): InitialConversation => ({
	message: [],
	systemPrompt: "",
	totalInputTokens: 0,
	totalOutputTokens: 0,
});

/*
  una conversación siempre empieza con un state vacio y para no tener que inicializarlo dentro
  de la clase, lo creo fuera y en el constructor le digo que puede haber propiedades que vengan
  o no y que si no vienen, que las complete con el estado inicial por defecto (todo vacio)
  (eso es lo que significa: Partial<InitialConversation>. todo puede venir o no)

  además, también necesito pasarle el anthropicClient y el configLLM portque si las llamo
  dentro de la propia clase serían dependencias ocultas y complijidad a la hora de testeas
*/
export class Conversation {
	private state: InitialConversation;
	private configLLM: AppConfig;
	private anthropicClient: Anthropic;

	constructor(
		configLLM: AppConfig,
		anthropicClient: Anthropic,
		// si lo pongo al final puedo omitirlo al crear una instancia y coger los valores por defecto
		// pero si está al inicio estoy diciendo que teien que pasar por él antes de llegar a los otros
		initial: Partial<InitialConversation> = {},
	) {
		this.state = { ...createInitialConersationState(), ...initial };
		this.configLLM = configLLM;
		this.anthropicClient = anthropicClient;
	}

	addUserMessage(text: string): void {
		this.state.message.push({ role: "user", content: text });
	}
	addAssistantMessage(text: string): void {
		this.state.message.push({ role: "assistant", content: text });
	}

	async send(): Promise<string> {
		// para hacer una conversación se teien que hacer con el create (demalo todo de golpe) y no con stream
		const response = await this.anthropicClient.messages.create({
			model: this.configLLM.model,
			max_tokens: 1024, // por culpa de esto pueden haber respuestas que se corten
			messages: this.state.message,
			// si viene el systemPromopt lo devuelves
			...(this.state.systemPrompt && { system: this.state.systemPrompt }),
		});

		this.state.totalInputTokens += response.usage.input_tokens;
		this.state.totalOutputTokens += response.usage.output_tokens;

		// lo que buscamos en este punto, por ahora, es devolver el texto (la respuesta que nos da claude)
		const textBlock = response.content.find((block) => block.type === "text");
		if (!textBlock || textBlock.type !== "text") {
			throw new Error("Claude could not return a text in response");
		}

		const responseText = textBlock.text;
		this.addAssistantMessage(responseText);

		return responseText;
	}

	getUsage(): { input_usage: number; output_usage: number } {
		return {
			input_usage: this.state.totalInputTokens,
			output_usage: this.state.totalOutputTokens,
		};
	}

	estimateTokens(): number {
		const totalChars = this.state.message.reduce(
			(sum, msg) => sum + msg.content.length,
			0,
		);
		return Math.floor(totalChars / CHARS_PER_TOKEN);
		// también se podría hacer la suma del input_token + output_token
	}

	getTournCount(): number {
		return Math.floor(this.state.message.length / 2);
	}

	getStats(): { inputTokens: number; outputTokens: number; turns: number } {
		return {
			inputTokens: this.getUsage().input_usage,
			outputTokens: this.getUsage().output_usage,
			turns: this.getTournCount(),
		};
	}

	getHistory(): Message[] {
		return [...this.state.message];
	}

	/**
	 * This reset removes the system prompt that was sent to the agent and
	 * resets everything to blank.
	 * ```json
	 * {
	 *  message: [],
	 *  systemPrompt: "",
	 *  totalInputTokens: 0,
	 *  totalOutputTokens: 0,
	 * }
	 * ```
	 */
	hardReset(): void {
		// si quisiera hacer un reset
		this.state = createInitialConersationState();
	}

	/**
	 * This reset preserves the system prompt that was sent to the agent from the beginning.
	 */
	softReset(): void {
		this.state = {
			...createInitialConersationState(),
			systemPrompt: this.state.systemPrompt,
		};
	}
}
