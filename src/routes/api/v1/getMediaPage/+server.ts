import { PAGE_SIZE } from '$lib/utils.js';
import { isMediaType } from '$lib/utils.js';
import type { SortingMethod } from '$lib/types';

const SORTING_METHODS: readonly SortingMethod[] = [
	'date_added_desc',
	'date_added_asc',
	'release_date_desc',
	'release_date_asc',
	'review_score_desc',
	'review_score_asc',
	'title_asc',
	'title_desc'
];

function isSortingMethod(value: unknown): value is SortingMethod {
	return typeof value === 'string' && SORTING_METHODS.includes(value as SortingMethod);
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals: { supabase, safeGetSession } }) {
	const { session } = await safeGetSession();
	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	const req_body = (await request.json()) as {
		current_medium: string;
		user_id: string;
		offset: number;
		backlogged?: number;
		year?: string;
		pageSize?: number;
		search?: string;
		exactTitle?: string;
		sorting_method?: SortingMethod;
	};

	const current_medium = req_body.current_medium;
	const user_id = req_body.user_id;
	const offset = Number(req_body.offset) || 0;
	const requestedPageSize = Number(req_body.pageSize) || PAGE_SIZE;
	const pageSize = Math.min(Math.max(Math.floor(requestedPageSize), 1), 100);
	const backlogged = req_body.backlogged === 1 ? 1 : 0;
	const year = req_body.year;
	const search = typeof req_body.search === 'string' ? req_body.search.trim().slice(0, 120) : '';
	const exactTitle =
		typeof req_body.exactTitle === 'string' ? req_body.exactTitle.trim().slice(0, 500) : '';
	const sorting_method = isSortingMethod(req_body.sorting_method)
		? req_body.sorting_method
		: 'date_added_desc';
	const end = offset + pageSize - 1;

	if (!current_medium || !user_id) {
		return new Response('Missing pagination parameters', { status: 400 });
	}

	if (!isMediaType(current_medium)) {
		return new Response('Invalid media type', { status: 400 });
	}

	try {
		const sortConfig: Record<
			SortingMethod,
			{ column: string; ascending: boolean; nullsFirst: boolean }
		> = {
			date_added_desc: { column: 'added', ascending: false, nullsFirst: false },
			date_added_asc: { column: 'added', ascending: true, nullsFirst: true },
			release_date_desc: { column: 'release', ascending: false, nullsFirst: false },
			release_date_asc: { column: 'release', ascending: true, nullsFirst: true },
			review_score_desc: { column: 'rating', ascending: false, nullsFirst: false },
			review_score_asc: { column: 'rating', ascending: true, nullsFirst: true },
			title_asc: { column: 'title', ascending: true, nullsFirst: true },
			title_desc: { column: 'title', ascending: false, nullsFirst: false }
		};
		const selectedSort = sortConfig[sorting_method];

		let query = supabase
			.from(current_medium)
			.select('*', { count: 'exact' })
			.eq('user_id', user_id)
			.eq('backlogged', backlogged)
			.order(selectedSort.column, {
				ascending: selectedSort.ascending,
				nullsFirst: selectedSort.nullsFirst
			})
			.order('id', { ascending: false });

		if (year && year !== 'Gesamt' && Number.isFinite(Number(year))) {
			const yearNumber = Number(year);
			query = query
				.gte('added', new Date(Date.UTC(yearNumber, 0, 1)).toISOString())
				.lt('added', new Date(Date.UTC(yearNumber + 1, 0, 1)).toISOString());
		}

		if (exactTitle) {
			query = query.eq('title', exactTitle);
		} else if (search) {
			// Escape PostgreSQL ILIKE wildcards so a user's search stays literal.
			const escapedSearch = search.replace(/[\\%_]/g, '\\$&');
			query = query.ilike('title', `%${escapedSearch}%`);
		}

		const { data, count, error } = await query.range(offset, end);

		if (error) {
			return new Response(JSON.stringify({ error: error.message }), { status: 500 });
		}

		const rows = data || [];
		const hasMore =
			typeof count === 'number' ? offset + rows.length < count : rows.length === pageSize;

		return new Response(JSON.stringify({ data: rows, hasMore }));
	} catch (error) {
		console.log(`Error on Endpoint getMediaPage: ${error}`);
		return new Response(String(error), { status: 500 });
	}
}
