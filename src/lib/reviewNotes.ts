export const REVIEW_NOTES_PREFIX = 'MLW_NOTES_V1:';

export type ReviewNoteBubble = {
	text: string;
	spoiler: boolean;
};

type ReviewNotesPayload = {
	version: 1;
	bubbles: ReviewNoteBubble[];
};

export type DecodedReviewNotes = {
	bubbles: ReviewNoteBubble[];
	isLegacy: boolean;
	isStructured: boolean;
};

function normalizeBubbles(bubbles: ReviewNoteBubble[]): ReviewNoteBubble[] {
	return bubbles
		.map((bubble) => ({
			text: (bubble.text || '').trim(),
			spoiler: Boolean(bubble.spoiler)
		}))
		.filter((bubble) => bubble.text.length > 0);
}

function decodeLegacyNotes(notes: string): ReviewNoteBubble[] {
	return notes
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => ({ text: line, spoiler: false }));
}

export function isLegacyReviewNotes(notes: string | null | undefined): boolean {
	const value = (notes || '').trim();
	return value.length > 0 && !value.startsWith(REVIEW_NOTES_PREFIX);
}

export function decodeReviewNotes(notes: string | null | undefined): DecodedReviewNotes {
	const value = (notes || '').trim();
	if (value.length === 0) {
		return {
			bubbles: [],
			isLegacy: false,
			isStructured: false
		};
	}

	if (!value.startsWith(REVIEW_NOTES_PREFIX)) {
		return {
			bubbles: decodeLegacyNotes(value),
			isLegacy: true,
			isStructured: false
		};
	}

	const payloadJson = value.slice(REVIEW_NOTES_PREFIX.length);
	try {
		const payload = JSON.parse(payloadJson) as ReviewNotesPayload;
		if (payload.version !== 1 || !Array.isArray(payload.bubbles)) {
			throw new Error('Invalid notes payload format');
		}
		const bubbles = normalizeBubbles(payload.bubbles);
		return {
			bubbles,
			isLegacy: false,
			isStructured: true
		};
	} catch {
		return {
			bubbles: decodeLegacyNotes(value),
			isLegacy: true,
			isStructured: false
		};
	}
}

export function encodeReviewNotes(bubbles: ReviewNoteBubble[]): string {
	const normalizedBubbles = normalizeBubbles(bubbles);
	if (normalizedBubbles.length === 0) {
		return '';
	}
	const payload: ReviewNotesPayload = {
		version: 1,
		bubbles: normalizedBubbles
	};
	return `${REVIEW_NOTES_PREFIX}${JSON.stringify(payload)}`;
}
