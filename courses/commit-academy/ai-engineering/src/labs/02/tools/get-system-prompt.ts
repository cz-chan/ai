import { toolsSchema, type Tools } from "../../../types/cli-options.type.ts";

export const getSystemPrompt = (option: Tools): string => {
	// uso el find para devolve la primera coincidencia en ser true (que toolName incluya lo que pasa el usuario)
	const tool = toolsSchema.shape.tool.options
		.find((toolName) =>
			/*
			necesito ponerlo en un array (zod los pone como si fueran sets) para poder saber si está el tool
			que pasa el usuario entre los que existen
			también se podría hacer algo como:

			const toolDesc = (option: Tools): string => {
			
				const desc = toolsSchema.shape.tool.options.find((p) => {
					const existTool: Set<string> = p.values;
					return existTool.has(option.tool); // true o false
				})?.description;
			
				if (!desc) {
					throw new Error(`La tool '${option.tool}' que has pasado no existe.'`);
				}
			
				return desc;
			};

			de esta forma uso la funcionalidad de los sets que es justo la que está trayendo zod y uso .has()
			en vez de pasar a array y usar el .includes() 
		*/
			[...toolName.values].includes(option.tool),
		)
		?.meta();

	const systemPrompt = tool?.systemPrompt;

	if (typeof systemPrompt !== "string") {
		throw new Error(`The tool "${option.tool}" does not exist.`);
	}

	return systemPrompt.trim();
};
