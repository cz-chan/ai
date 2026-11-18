# Funcionamiento del lab 02

Para poder usar este proyecto primero necesitas configurar el proyecto siguiendo estos pasos:

1. Haz una copia de `.env.template` y renómbrala a `.env`.
2. Añade los valores correspondientes de las variables de entorno (te las proporciona el curso en commitacademy.io). Acuérdate que la versión de `PRACTICE_API_URL_ANTHROPIC=` no lleva al final el `/v1`. Si lo colocas no te funcionará.
3. Colócate en la carpeta del proyecto e instala las dependencias con `pnpm install`.
4. Asegúrate de tener instalado `NodeJS` en tu ordenador (sin este, el programa no funciona)

## Funcionamiento de la app

Esta herramienta es una CLI rudimentaria que solo escucha un único comando a la vez y que necesita unas flags obligatorias y otras opcionales para modular la respuesta del agente.

El comando para utilizarla se compone de las siguientes partes:

**Flags obligatorias** (siempre deben seguir este orden, en caso contrario dará error):

1. `pnpm lab:02`: esto hace que se ejecute el cli.ts con las variables de entorno que has instalado antes. Por debajo lo que hay es: _"node --env-file=.env src/labs/02/cli.ts"_
2. `tool`: es la "herramienta" que el agente tiene que usar. Hay 3 disponibles: summary, category y extract donde cada una le pasa al modelo una descripción (system prompt) de qué es lo que tiene que hacer
3. `text o ruta absoluta del archivo`: el último flag obligatorio sería el texto que quieres que revise el agente. Está permitido pasarle un texto desde la terminal, **siempre entrecomillado**, o una **ruta absoluta** o **ruta relativa desde donde se encuentra el script (package.json)** del archivo sin comillas.

**Flags opcionales**:

- `model`: serán los modelos que el usuario tiene disponibles para usar que en este caso son: fast, chaos y smart ya que embed y rerank para esta tool no tendrían sentido (hay un .extract con zod para filtrarlos)
- `max-tokens`: es la cantidad de tokens que el modelo puede devolver. Por defecto está configurado en 256 pero el usuario puede mandarle más o menos hasta un límite de 2056 tokens.
- `provider`: son los proveedores disponibles que tengo configurados. Por defecto es anthropic pero además está vercel y openai.

**Flag extra** y muy recomendado para saber cómo funciona:

- `--help o -h`: Esta flag va solo y te permite ver la explicación completa de cómo funciona la app

### Uso de comandos

Para poder usar el cli como mínimo se deben proporcionar los comandos obligatorios en el orden indicado, por ejemplo:

```shell
pnpm lab:02 --summary /Users/unuser/Desktop/projects/.../ai-engineering/src/labs/02/analisis.md
```

En caso de querer usar los comandos opcionales, no existe un orden concreto pero sí una forma de llamarlos: el flag siempre debe ir precedido por '--' (un doble menos) y consecutivamente (con un espacio entre medias) el valor válido para ese flag. En caso de no ser correcto, saltará un error con el porqué y un mensaje de cómo usarlo.

Algunos ejemplos de estos comandos serían:

```shell
pnpm lab:02 --category src/labs/02/analisis.md --model chaos --max-tokens 1024 --provider openai
```

```shell
pnpm lab:02 --category src/labs/02/analisis.md  --provider vercel --max-tokens 100
```

Y por último, el comando extra que te proporciona la ayuda sería:

```shell
pnpm lab:02 --help
```

o

```shell
pnpm lab:02 -h
```
