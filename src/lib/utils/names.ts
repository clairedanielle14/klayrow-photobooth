const MAX_NAMES = 2;

function toTitleCase(value: string): string {
	return value
		.toLowerCase()
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export function parseNames(input: string, maxNames = MAX_NAMES): string[] {
	if (!input.trim()) {
		return [];
	}

	const uniqueNames = new Set<string>();

	for (const rawName of input.split(',')) {
		const cleaned = rawName.trim();

		if (!cleaned) {
			continue;
		}

		const normalized = toTitleCase(cleaned);

		if (!uniqueNames.has(normalized)) {
			uniqueNames.add(normalized);
		}

		if (uniqueNames.size === maxNames) {
			break;
		}
	}

	return [...uniqueNames];
}

export function formatNames(names: string[]): string {
	return names.join(' x ');
}
