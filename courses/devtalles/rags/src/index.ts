import { startCLI } from "./chat/cli.ts";

startCLI().catch((error: Error) => {
	console.error("Error: ", error.message);
	process.exit(1);
});

// necesitas el catch porqeu algo puede salir mal
