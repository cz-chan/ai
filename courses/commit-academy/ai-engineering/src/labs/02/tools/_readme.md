# Readme para aclarar cómo se deben crear las interfaces de cada tool

Hay 3 tools distintas: **summarizer**, **classifier** y **extractor**. Las 3 reciben el mismo mismo pero lo que tiene que hacer es distinto (depende de su definición).

En esta práctica, con forme estoy escribiendo esto, me estoy dando cuenta que no son tools verdaderas ya que la tool en sí misma ya está creada, el CLI. Lo único que le paso a los agentes es el texto (si todo ha ido bien) y el system prompt que dependerá de la tool que se le pase. El agente no tiene porqué ver qué está haciendo o qué tool se le ha enviado por lo qeu no haría falta ningún esquema para validar esa tool.

Lo único que tendría que hacer es un switch que dependa de la tool y le pase el system prompt de cada una de ellas para que haga lo que se le indica.

Este switch nace del toolsSchema de `src/types/cli-options.type.ts`:

```ts
export const toolsSchema = z.object({
	tool: z.union(
		[
			z
				.literal("summary")
				.describe(
					"El agente te va a devolver los 3 puntos clave del texto que le has proporcionado.",
				),
			z
				.literal("category")
				.describe(
					"El agente te va a etiquetar el mensaje que le has enviado con una categoría a la que él considere que puede pertenecer",
				),
			z
				.literal("extract")
				.describe(
					"El agente te va a devolver un dato concreto sobre el texto que le hayas pasado (por ejemplo: un nombre, una fecha o un importe). Si no le dices que quieres que te de en el propio mensaje, te devolverá un dato aleatorio que él elija de ese texto.",
				),
		],
		'unknown tool. only accept: "--summary", "--category" or "--extract" for now.',
	),
});
```

## Pensamientos

Lo que me chirría de esta tool es la tool 'extract' ya que si no tengo una forma de decirle al agente qué es lo que quiero que me de, me dará un dato random de ese texto. Pero si quiero algo en concreto, necesito que en el texto que le pase el usuario, vaya incluido qué es lo que quiere que le de.

En otro caso lo haría de otra manera: haciendo una tool (esquema) distinta para 'extractor' donde pueda aceptar también una condición quedando algo como:

```shell
node cli.ts --extract 'quiero que me digas cuántos "Marianos" hay en el texto que te paso' 'texto' --model fast --max-tokens 50
```
