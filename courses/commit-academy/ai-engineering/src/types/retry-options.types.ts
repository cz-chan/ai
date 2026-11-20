import z from "zod";

/*
	requestOpt y retryOpt aun pudiendo ir junto y tener timeoutMs en retryOpt, decido no hacerlo 
	porqeu cada uno va en un sitio distinto y no hay interferencias entre ellos. Además, uno
	entra como input y el otro puede entrar tanto como input como output
*/

export const requestOpt = z
	.object({
		timeoutMs: z
			.number()
			.int()
			.positive()
			.describe("Maximum duration of an attempt. The default is 3 s (3000 ms).")
			.default(3000), // con 1s nunca se lanza
	})
	.prefault({});

export type RequestOpt = z.input<typeof requestOpt>;

export const retryOpt = z
	.object({
		maxAttempts: z
			.number()
			.int()
			.positive()
			.describe("attempt retries before close the conection. by default is 4.")
			.default(4),
		baseMs: z
			.number()
			.int()
			.positive()
			.describe(
				"Time base (in milliseconds) at which retries will begin. The default is 1 second. This value will then be multiplied by a random number and by the number of attempts until it reaches a maximum time (30 seconds) before the connection is closed.",
			)
			.default(1000),
		capMs: z
			.number()
			.int()
			.positive()
			.describe(
				"Maximum amount of time (in milliseconds) that the call will be retried until it stops. The default is 30s.",
			)
			.default(30_000),
	})
	// al usar .prefault({}) lo que zod hace es qeu si en la función no se le pasa ningún objeto (undefined)
	// el mimso lo construye con los valores váludos y por defecto. docs: https://zod.dev/api#prefaults
	.prefault({});

/* 
	podría usar un .input porque son los valores que entran a la función pueden ser opcionales pero al
	salir de esta, al hacer el .parse en ella, le digo que el output de estos retryopt son obligatorios
	y tienen unos valores por defecto concretos (nunca pueden ser undefined)
	- Lo que entra antes de parse → z.input -> InputRetryOpt
	- Lo que circula después de parse → z.output / z.infer -> OutputRetryOpt

	otro caso sería hacer un Partial<> en el parámetro de la función

	el problema de no hacer el .input y .output/.infer sería que  si mañana añades un campo 
	sin default (obligatorio), z.input lo marcará como obligatorio y Partial no
*/
export type RetryOpt = z.infer<typeof retryOpt>;
