import type { SupabaseClient } from '@supabase/supabase-js';

type MediumType = 'games' | 'movies' | 'shows' | 'books' | 'music';

type RewatchRow = {
	id: number;
	added?: string | null;
	igdbid?: number | null;
	tmdbid?: number | null;
	gbid?: string | null;
	mbid?: string | null;
	seasons?: string | null;
};

const LOOKUP_FIELD: Record<Exclude<MediumType, 'shows'>, 'igdbid' | 'tmdbid' | 'gbid' | 'mbid'> = {
	games: 'igdbid',
	movies: 'tmdbid',
	books: 'gbid',
	music: 'mbid'
};
const SELECT_FIELDS: Record<MediumType, string> = {
	games: 'id, added, igdbid',
	movies: 'id, added, tmdbid',
	shows: 'id, added, tmdbid, seasons',
	books: 'id, added, gbid',
	music: 'id, added, mbid'
};

function normalizeSeasonKey(seasons: unknown) {
	return String(seasons ?? '')
		.trim()
		.replace(/\s+/g, '')
		.toLowerCase();
}

function getRewatchGroupKey(medium: MediumType, row: RewatchRow) {
	if (medium === 'shows') {
		if (!row.tmdbid) {
			return null;
		}
		const seasonKey = normalizeSeasonKey(row.seasons);
		return seasonKey ? `${row.tmdbid}:${seasonKey}` : `${row.tmdbid}:unknown:${row.id}`;
	}

	const field = LOOKUP_FIELD[medium];
	const value = row[field];
	return value == null || value === '' ? null : String(value);
}

async function writeRewatchGroup(
	supabase: SupabaseClient,
	medium: MediumType,
	groupRows: RewatchRow[]
) {
	const sortedRows = [...groupRows].sort((a, b) => {
		const left = new Date(a.added ?? 0).getTime();
		const right = new Date(b.added ?? 0).getTime();
		if (left !== right) {
			return left - right;
		}
		return a.id - b.id;
	});
	const count = sortedRows.length;

	for (let index = 0; index < sortedRows.length; index += 1) {
		await supabase
			.from(medium)
			.update({
				is_rewatch: index > 0,
				rewatch_count: count
			})
			.eq('id', sortedRows[index].id);
	}
}

export async function recalculateRewatchForMedium(
	supabase: SupabaseClient,
	medium: MediumType,
	userId: string,
	changedRow?: Partial<RewatchRow> | null
) {
	let query = supabase.from(medium).select(SELECT_FIELDS[medium]);
	query = query.eq('user_id', userId).eq('backlogged', 0);

	if (changedRow) {
		if (medium === 'shows') {
			if (!changedRow.tmdbid) {
				return;
			}
			query = query.eq('tmdbid', changedRow.tmdbid);
		} else {
			const field = LOOKUP_FIELD[medium];
			const value = changedRow[field];
			if (value == null || value === '') {
				return;
			}
			query = query.eq(field, value);
		}
	}

	const { data, error } = await query.order('added', { ascending: true }).order('id', {
		ascending: true
	});

	if (error) {
		throw error;
	}

	const groups = new Map<string, RewatchRow[]>();
	for (const row of ((data ?? []) as unknown as RewatchRow[])) {
		const key = getRewatchGroupKey(medium, row);
		if (!key) {
			continue;
		}
		const rows = groups.get(key) ?? [];
		rows.push(row);
		groups.set(key, rows);
	}

	for (const groupRows of groups.values()) {
		await writeRewatchGroup(supabase, medium, groupRows);
	}
}
