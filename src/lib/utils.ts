// Function to add delay
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getMediaCodeString(current_medium: string): string {
	switch (current_medium) {
		case 'games':
			return 'Game';
		case 'movies':
			return 'Film';
		case 'shows':
			return 'Serie';
		case 'books':
			return 'Buch';
		default:
			return 'Error';
	}
}

export function getModeString(current_mode: number) {
	switch (current_mode) {
		case 0:
			return 'Medien Log';
		case 1:
			return 'Backlog';
		case 2:
			return 'Statistiken';
		default:
			return 'ERROR';
	}
}

export function getMediaCodeIndex(current_medium: string): number {
	switch (current_medium) {
		case 'games':
			return 0;
		case 'movies':
			return 1;
		case 'shows':
			return 2;
		case 'books':
			return 3;
		default:
			return -1;
	}
}
