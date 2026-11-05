import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import * as path from "path";
import * as fs from "fs";

/*
  usamos una db de SQLite para facilitar la vida y que esté en local pero por lo genral, 
  en producción se usaría una db como postgresql donde en una columna se guardan los
  embeddings en formato número y en producción y con postgres, necesitarias en vez de
  sqlite-vec a pgvector para la búsqueda de vectores

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
		if (fs.existsSync(dir)) {
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
      CREATE TABLE IF NOT EXIST chunks(
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        heading TEXT NOT NULL,
        position INTEGER NOT NULL,
        char_count INTEGER NOT NULL,
      )
      `);

		/* 
      esta es la tabla para almacenar los embeddings (tabla virtual) con el tipo de 
      búsqueda de KNN

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
      CREATE VIRTUAL TABLE IF NOT EXIST chunk_embeddings USING vec0(
        chunk_id TEXT PARTITION KEY,
        embedding float[1536]
      )
      `);
	}
}
