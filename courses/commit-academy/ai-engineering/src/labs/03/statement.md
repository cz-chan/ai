# Enunciado

## Actividades a realizar

### Preparación

1. Crear una carpeta `laboratorio-3` e instalar la librería oficial de OpenAI y la que carga el `.env`.
2. Crear el archivo `.env` con tu clave del curso:

```env
OPENAI_API_KEY=<tu clave del curso>
OPENAI_BASE_URL=https://ai.commitacademy.io/v1
MODELO=fast
```

### Lo que tienes que implementar

- Recibe un texto y lo resume en **3 puntos** con el modelo de la variable `MODELO`.
- Tiene un **timeout**: si el servicio no responde a tiempo, la llamada se corta.
- **Reintenta solo los errores pasajeros**: `429`, errores `5xx` y timeouts o errores de conexión. Los demás (`400`, `401`, `403`, `404`) fallan a la primera.
- Espera entre reintentos con **espera exponencial aleatoria**: un tiempo aleatorio entre 0 y un tope que se duplica en cada intento (1 s, 2 s, 4 s…). Como mucho, **4 intentos**.
- Si se agotan los intentos, termina con un **mensaje de error claro, de una línea**.
- Antes de mostrar el resumen, comprueba el **motivo de parada**: si es `length`, avisa de que la respuesta se cortó por el tope de tokens.

### Dos pistas

> [!TIP]
> - Las librerías oficiales ya reintentan por su cuenta. Desactívalo al crear el cliente (`max_retries=0` en Python, `maxRetries: 0` en TypeScript): si no, reintentarás dos veces, unos reintentos dentro de otros.
> - El servicio del curso tiene un modelo de pruebas, `chaos`, que no cuesta nada y falla al azar con errores `429`. Úsalo para ver tus reintentos con errores reales.

### Cómo comprobar que funciona

| Caso | Cómo provocarlo | Resultado esperado |
| --- | --- | --- |
| Error pasajero | Ejecutar 10 veces el resumidor con `MODELO=chaos` | Los fallos se reintentan y casi todas las ejecuciones acaban respondiendo |
| Error permanente | Con `MODELO=fast`, una llamada con la lista de mensajes vacía | Devuelve un `400` real del servicio, que no se reintenta |
| Servicio que no responde | Timeout de `0,001` segundos | El resumidor reintenta, se agota y termina con un error claro |
| Respuesta cortada | Tope de `10` tokens | El resumidor avisa del corte |

## 📦 Entregable

El estudiante deberá enviar un archivo `.zip` que contenga:

- 💻 **El código fuente** y un `README` breve con cómo ejecutarlo.
- 📸 **Una captura de cada comprobación:**
  - Una ejecución con `chaos` en la que se vean los reintentos y la respuesta final.
  - El `400` sin reintentar.
  - El error tras agotar los intentos con el timeout de `0,001` segundos.
  - El aviso de respuesta cortada.
- 📄 **Un archivo `analisis.md`** con:
  - Cuántas de las 10 ejecuciones con `chaos` necesitaron reintentos y si alguna se rindió.
  - Por qué las esperas entre reintentos tienen que ser aleatorias.
  - Por qué has desactivado los reintentos de la librería.

## 🔒 Buenas prácticas

- No incluir el `.env` ni las carpetas de dependencias (`.venv`, `node_modules`) en el `.zip`.
- No mostrar la clave en las capturas.
- Provocar los fallos con `chaos`: las llamadas a `fast` y `smart` consumen presupuesto.
