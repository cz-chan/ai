// estos types serían el único lugar de verdad

export type Role = "user" | "assistant";

export interface Message {
	role: Role;
	content: string;
}
