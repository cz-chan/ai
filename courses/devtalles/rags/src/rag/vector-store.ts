import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import * as path from "path";
import * as fs from "fs";
import type { Chunk, SearchResult } from "../types/rag.types.ts";
/*
  un vectore store es una db donde se guardan los embeddings y para poder hacerla,
  necesitas primero varios elementos:

    1. chunks: necesitas tener aquello que quieres guardar/buscar transformado
    en chunks o pedazos de texto con su metadata asociada
    2. embeddings: es la representación numérica de los chunks guardada en la db
    3. búsqueda KNN: es una técnica de recuperación de información usada para encontrar
    vectores similares en un espacio matemático

  el flujo de cómo sería la app sería:

    1. tener un documento fuente en .md
    2. dividir el documento en fragmentos de ~500token. Esto es porque cuando más largo
    sea el documento a guardar, más token consume y más difícil es hacer la búsqueda
    exacta. en cada chunk habrá el heading que lo contiene + último párrafo del chunk
    anterior para tener todo el contexto y así poder buscar de una forma más precisa
    3. hacer el proceso de embedding de cada uno de los chunks a 1536 dimensiones (son
    estas dimensiones porque el modelo de openai así lo requiere)
    4. teniedo esos embeddings creados, lo guardas en sqlite con vec0 para poder hacer
    posteriormente la búsqueda
    5. búsqueda de embedding por similitud semántica a través de KNN a través de
    transformar la pregunta o búsqueda en embedding también y hacer la comparación KNN con
    los ventores 


*/

/*
  usamos una db de SQLite para facilitar la vida y que esté en local pero por lo genral, 
  en producción, se usaría una db como postgresql donde en una columna se guardan los
  embeddings en formato número (numbre[][]), necesitarias en vez de
  sqlite-vec a pgvector para la búsqueda de vectores

  de la forma con la que lo hacemos evitamos complejidad de preparación de servidores y 
  escala mu fácilmente ya que todo está en un único archivo. y este tipo de escenarios se
  usan y dan bien en demos y proyectos en producción que no necesitan escalar la complejidad

  y por qué usar float32 y no tal cual viene el embedding?

    porque sqlite no entiende de arrays de js como sería este caso los embeddings: number[][]
    por eso necesitas pasarlo a un lenguaje que esta db entienda (bytes) y de esto se encarga
    la función serializeEmbedding pasándo el embedding a un float32.

    Se necesita float32 porque así escribe cada número en 4 bytes y no pierde decimales:
              [0.12, 0.5]
                  ↓ Float32Array
      [8F C2 F5 3D] [00 00 00 3F]
        0.12           0.5
    y se neccesitan 4bytes porque sqlite-vec le de 4 en 4. cada 4 lo interpreta como un único numero

  y por qué hacer falta un buffer?

    

*/

interface ChunkRow {
	id: string;
	content: string;
	source: string;
	heading: string;
	position: number;
	char_count: number;
}

interface SearchRow extends ChunkRow {
	distance: number;
}

// función para serializar un array de rows a buffers
// un buffer es espacio temporal en la memoria (RAM) que
// se utiliza para almacenar datos mientras se trasladan de un lugar a otro

function serializeEmbedding(embedding: number[]): Buffer {
	const float32 = new Float32Array(embedding);

	return Buffer.from(float32.buffer);
}

// esta clase está basada en lo qeu necesita sqlite y sqlite-vec: donde almacena
// chunks de recomendación con sus embedding permitiendo la búsqueda semántica
// por similutud de coseno
export class VectorStore {
	private db: Database.Database;

	// lo que hace un constructor es crear las cosas que necesita en este caso sqlite y sqlite-vec
	// para funcionar: 1º el dir y 2º la db (localmente)
	constructor(dbPath: string) {
		const dir = path.dirname(dbPath);
		if (!fs.existsSync(dir)) {
			// creas el directorio si no existe nada más instanciar la clase
			fs.mkdirSync(dir, { recursive: true });
		}

		// creación de db
		this.db = new Database(dbPath);

		// carga de las tables de sqlite-vec para que puedan funcionar la vectorización
		sqliteVec.load(this.db);

		// optimizaciones de rendimiento para sqlite
		this.db.pragma("journal_mode = WAL"); // wal = write ahead loading -> mejora rendimiento y concurrencia
		this.db.pragma("synchronous = NORMAL"); // equilibra la velocidad y seguridad y soncroniza los datos en el disco con menos frecuencia vs. el valor predeterminado (que es full)

		this.createTables();
	}

	private createTables(): void {
		/*
      este .exec es la forma de sqlite de hacer sentencias sql (teine que ser igual que la ChunkRow)
		  y esta tabla chunks es nuestra tabla principal donde guardamos los contenidos de cada chunk


    */
		this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunks(
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        heading TEXT NOT NULL,
        position INTEGER NOT NULL,
        char_count INTEGER NOT NULL
      )
      `);

		/* 
      esta es la tabla para almacenar los embeddings (tabla virtual) con el tipo de 
      búsqueda de KNN

        KNN es:

      la tabla virtual necesita ser creada con 'VIRTUAL' porque no es una tabla 'normal'
      sino que le estás diciendo qeu esta tabla va a estar gestionada por una. extensión,
      en nuestro caso es sqlite-vec.

        el chunk_id es 'PÀRTITION' porque así te permite filtrar por el chunk_id y el 
        embedding va a tener una dimensión fija concreta 'float[1536]' porque estás usando
        el text-embedding-3-small de OpenAI y esto es lo que requiere usar

        https://developers.openai.com/api/docs/models/text-embedding-3-small
        https://developers.openai.com/api/docs/guides/embeddings
      
      además, necesitas darle el vec0 para decirle qeu va a ser una búsqueda KNN
    */
		this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS chunk_embeddings USING vec0(
        chunk_id TEXT PARTITION KEY,
        embedding float[1536]
      )
      `);
	}

	insert(chunk: Chunk, embedding: number[]): void {
		/*
      sentencia sql para insertar en la db

      vamos a usar insert or replace para hacerlo idempotente y no tener
      datos duplicados (en el caso de ser iguales, los sustituye)

      los valores de las columnas deben ser los mismos que los de la table chunks (es la mimsa)
      y los values lo pasamos como. '?' (son 6, igual que columns) porque los vamos a ir
      rellenando con forme se corre la sentancia (tienen que ser en el mismo orden la inserción
      que como están nombradas las columnas)
    */
		const insertChunk = this.db.prepare(`
        INSERT OR REPLACE INTO chunks(id, content, source, heading, position, char_count)
          VALUES(?,?,?,?,?,?)
      `);

		//! OJO: tienes que correrlos en el mismo orden que los estás nombrando
		insertChunk.run(
			chunk.id,
			chunk.content,
			chunk.metadata.source,
			chunk.metadata.heading,
			chunk.metadata.position,
			chunk.metadata.charCount,
		);

		// inserción el embedding serializado en la tabla vectorial
		const insertEmbedding = this.db.prepare(`
        INSERT OR REPLACE INTO chunk_embeddings
        (chunk_id, embedding)
          VALUES(?,?)
      `);
		// hacemos el run
		insertEmbedding.run(chunk.id, serializeEmbedding(embedding));
	}

	// este es el método que permite devolver los embeddings ordenados por similitud.
	// recibe la consulta del usuario como un enbedding y el topK es el nº de resultados
	// a devolver
	search(queryEmbedding: number[], topK: number): SearchResult[] {
		/*
      esta consulta se basa en el JOIN porque buscas comparar similitud entre 2 dbs
      
      en esta consulta renombro chunk_embedding como e y chunks como c para no tener
      que escribir tanto (eso significa e y c).

      lo que necsitamos de ambbas es: 
        c.id, c.source, c.heading, c.position, c.char_count, e.distance

      usas MATCH porque es lo qeu busca los vectores más cercanos al query y es el resultados
      de k en KNN (ponemos en ambos una interrogación porque los pasamos después igual que 
      en los INSERT) y se ordenan por la distancia entre chunks
    */
		const statement = this.db.prepare(`
      SELECT c.id, c.content, c.source, c.heading, c.position, c.char_count, e.distance
      FROM chunk_embeddings e
      JOIN chunks c ON c.id = e.chunk_id
      WHERE e.embedding MATCH ?
      AND k = ?
      ORDER BY e.distance
      `);

		const rows = statement.all(
			serializeEmbedding(queryEmbedding),
			topK,
		) as SearchRow[];

		// devuelve el arreglo de chunks con más similitud entre ellos
		return rows.map((row) => ({
			chunk: {
				id: row.id,
				content: row.content,
				metadata: {
					source: row.source,
					heading: row.heading,
					position: row.position,
					charCount: row.char_count,
				},
			},
			/*
        el score es qué tan acertado ha sido el match.

        en sqlite-vec el score va de 0 a 2, donde 0 sería algo identico y 2 es opuesto
        pero como en nuestro caso lo queremos de 0 a 1 por lo que el valor lo dividimos entre 2
        y al restarselo a 1, nos dará el valor real entre 0 y 1
      */
			score: 1 - row.distance / 2,
		}));
	}

	// limpias la db COMPLETA con un delete SIN el where
	clear(): void {
		this.db.exec("DELETE FROM chunk_embeddings");
		this.db.exec("DELETE FROM chunks");
	}

	// obtener el tamaño de los chunks almacenados
	get size(): number {
		const row = this.db
			.prepare(`SELECT COUNT(*) as count FROM chunks`)
			.get() as { count: number };

		return row.count;
	}

	// cierra la conexión con la db
	close(): void {
		this.db.close();
	}
}
