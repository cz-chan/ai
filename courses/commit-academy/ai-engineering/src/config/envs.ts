function getString(key: string): string {
	const value = import.meta.env?.[key] ?? process.env[key];

	if (value === undefined || value === "")
		throw new Error(`Missing env variable: ${key}`);
	return value;
}

export const envs = {
	PRACTICE_API_URL: getString("PRACTICE_API_URL"),
	PRACTICE_API_KEY: getString("PRACTICE_API_KEY"),
} as const;
