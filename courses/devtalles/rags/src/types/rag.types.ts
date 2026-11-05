// https://link.excalidraw.com/readonly/WO228xv1MCSXZCmP9FQr?darkMode=true
export interface Chunk {
	id: string;
	content: string;
	metadata: {
		source: string;
		position: number;
		heading: string;
		charCount: number;
	};
}

export interface RetrievedChunk extends Chunk {
	score: number;
}

export interface SearchResult {
	chunk: Chunk;
	score: number;
}
