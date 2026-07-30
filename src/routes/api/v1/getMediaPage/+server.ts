import { PAGE_SIZE } from '$lib/utils.js';
import { isMediaType } from '$lib/utils.js';

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
	};

	const current_medium = req_body.current_medium;
	const user_id = req_body.user_id;
	const offset = Number(req_body.offset) || 0;
	const requestedPageSize = Number(req_body.pageSize) || PAGE_SIZE;
	const pageSize = Math.min(Math.max(Math.floor(requestedPageSize), 1), 100);
	const backlogged = req_body.backlogged === 1 ? 1 : 0;
	const year = req_body.year;
	const search = typeof req_body.search === 'string' ? req_body.search.trim().slice(0, 120) : '';
	const end = offset + pageSize - 1;

	if (!current_medium || !user_id) {
		return new Response('Missing pagination parameters', { status: 400 });
	}

	if (!isMediaType(current_medium)) {
		return new Response('Invalid media type', { status: 400 });
	}

	try {
		let query = supabase
			.from(current_medium)
			.select('*', { count: 'exact' })
			.eq('user_id', user_id)
			.eq('backlogged', backlogged)
			.order('added', { ascending: false })
			.order('id', { ascending: false });

		if (year && year !== 'Gesamt' && Number.isFinite(Number(year))) {
			const yearNumber = Number(year);
			query = query
				.gte('added', new Date(Date.UTC(yearNumber, 0, 1)).toISOString())
				.lt('added', new Date(Date.UTC(yearNumber + 1, 0, 1)).toISOString());
		}

		if (search) {
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
