import * as fs from "node:fs";
import z from "zod";

import {
	flagsSchema,
	cliArgsSchema,
	type Tools,
} from "../../types/cli-options.types.ts";
import type {
	Providers,
	ProvidersParams,
} from "../../types/providers-params.types.ts";
import { throwErrorMessage, usageCliMessage } from "./how-use-cli.ts";
import { flagToKey } from "./helpers.funct.ts";
import { useAnthropic } from "../../models/anthropic.ts";
import { useOpenai } from "../../models/openai.ts";
import { useVercel } from "../../models/vercel.ts";
import { getSystemPrompt } from "./tools/get-system-prompt.ts";

const args = process.argv.slice(2);

if (args[0] === "--help" || args[0] === "-h") {
	console.info(usageCliMessage());
	process.exit(0);
}

if (args.length === 0) {
	console.error(usageCliMessage());
	process.exit(1);
}

const rawFlags: Record<string, string> = {};

rawFlags["tool"] = flagToKey(args[0]);

let textArg: string | undefined;
let flagStart: number;

if (args[1] && args[1].startsWith("--")) {
	textArg = undefined;
} else {
	textArg = args[1];
}
textArg === undefined ? (flagStart = 1) : (flagStart = 2);

for (let i = flagStart; i < args.length; i++) {
	if (args[i].startsWith("--")) {
		const key = flagToKey(args[i]);

		if (key in flagsSchema.shape) {
			if (args[i + 1] === undefined || args[i + 1].startsWith("--")) {
				const errorMessage = `${args[i]} debe tener un input válido.\n\n${usageCliMessage()}`;

				console.error(errorMessage);

				process.exit(1);
			}
			rawFlags[key] = args[i + 1];

			i++;
		}
	}
}

const result = cliArgsSchema.safeParse(rawFlags);

function readInput(arg: string | undefined): string {
	if (arg === undefined) {
		if (process.stdin.isTTY) {
			throwErrorMessage("Debes introducir un texto o archivo válido.");
		}

		return fs.readFileSync(0, "utf8");
	}

	let stat: fs.Stats;

	try {
		stat = fs.statSync(arg);
	} catch (error) {
		return arg;
	}

	if (stat.isDirectory()) {
		throwErrorMessage(
			"Has pasado el nombre de una carpeta. Solo puedes mandar archivos o texto.",
		);
	}

	const text = fs.readFileSync(arg, "utf8");

	return text;
}

if (!result.success) {
	console.error(z.prettifyError(result.error));
	process.exit(1);
}

let text: string;
try {
	text = readInput(textArg).trim();
} catch (error) {
	const err =
		error instanceof Error ? error.message : "Error al leer el texto.";
	console.error(err);
	process.exit(1);
}

if (text === "") {
	console.error(usageCliMessage("El texto no puede estar vacio."));
	process.exit(1);
}

interface CLI extends ProvidersParams {
	provider: Providers;
	tool: Tools;
}

async function cliResponse(params: CLI): Promise<string> {
	const { provider, tool, ...providerParams } = params;

	const toolSystemPrompt = getSystemPrompt(tool);

	const modelParams: ProvidersParams = {
		...providerParams,
		systemPrompt: toolSystemPrompt,
	};

	switch (provider) {
		case "anthropic": {
			const response = await useAnthropic(modelParams);
			const { content, stop_reason, usage } = response;

			let hint = "";

			const llmMessage = content
				.filter((block) => block.type === "text")
				.map((block) => block.text)
				.join("")
				.trim();

			const messageOuputs =
				`\n\n[fin] ${stop_reason}` +
				`\n[tokens] entrada=${usage.input_tokens} | salida=${usage.output_tokens}`;

			if (stop_reason === "max_tokens") {
				hint = `\nLa respuesta se ha cortado porque era demasiado larga y sobrepasaba los tokens permitidos: ${modelParams.maxTokens} tokens`;
			}

			const message =
				llmMessage.length !== 0
					? llmMessage + messageOuputs
					: "{respuesta vacia}" + messageOuputs;

			return message;
		}

		case "openai": {
			const response = await useOpenai(modelParams);
			const { choices, usage } = response;
			const { finish_reason, message: modelMessage } = choices[0];
			let hint = "";

			const llmMessage = modelMessage.content;

			if (finish_reason === "length") {
				hint = `\nLa respuesta se ha cortado porque era demasiado larga y sobrepasaba los tokens permitidos: ${modelParams.maxTokens} tokens`;
			}

			const messageOutputs =
				`\n\n[fin] ${finish_reason}` +
				`\n[tokens] entrada=${usage?.prompt_tokens} | salida=${usage?.completion_tokens}`;

			const message =
				llmMessage !== null
					? llmMessage + messageOutputs + hint
					: "{respuesta vacia}" + hint + messageOutputs;

			return message;
		}
		case "vercel": {
			const response = await useVercel(modelParams);
			const { finishReason, text, usage } = response;
			let hint = "";

			const messageOutputs =
				`\n\n[fin] ${finishReason}` +
				`\n[tokens] entrada=${usage.inputTokens} | salida=${usage.outputTokens}`;

			if (finishReason === "length") {
				hint = `\nLa respuesta se ha cortado porque era demasiado larga y sobrepasaba los tokens permitidos: ${modelParams.maxTokens} tokens`;
			}

			const message =
				text.length !== 0
					? text + messageOutputs + hint
					: "{respuesta vacia}" + hint + messageOutputs;

			return message;
		}

		default: {
			const unknownProvider: never = provider;
			throw new Error(
				`Provider desconocido: "${unknownProvider}". Puedes usar "openai", "anthropic" o "vercel"`,
			);
		}
	}
}

const { maxTokens, model, provider, tool } = result.data;
try {
	console.log(
		await cliResponse({
			model: model,
			prompt: text,
			provider: provider,
			maxTokens: maxTokens,
			tool: { tool: tool },
		}),
	);
} catch (error) {
	console.error("[error]", error instanceof Error ? error.message : error);
	process.exitCode = 1;
}
