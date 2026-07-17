import { redirect } from '@sveltejs/kit';
import { PAGE_SIZE } from '$lib/utils';
import type { PageServerLoad } from './$types';

type MediaTable = 'games' | 'movies' | 'shows' | 'books';
type AvailableYearRow = {
	year: number;
};

export const load: PageServerLoad = async ({
	locals: { supabase, safeGetSession },
	fetch,
	url
}) => {
	const { session } = await safeGetSession();
	if (!session) {
		redirect(303, '/');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select()
		.eq('id', session.user.id)
		.single();
	let user_id: string;
	if (url.pathname.slice(1).split('/')[0] !== profile?.username) {
		const res = await supabase
			.from('profiles')
			.select()
			.eq('username', url.pathname.slice(1).split('/')[0])
			.single();
		if (res.status == 200) {
			user_id = res.data.id;
		} else {
			redirect(303, `/${profile?.username}`);
		}
	} else {
		user_id = session.user.id;
	}
	const backlogged_filter = url.searchParams.get('mode') === '1' ? 1 : 0;
	const requested_year = url.searchParams.get('mediaYear') || String(new Date().getFullYear());

	function applyYearFilter(query: any, year: string) {
		if (backlogged_filter === 1 || year === 'Gesamt' || !Number.isFinite(Number(year))) {
			return query;
		}
		const yearNumber = Number(year);
		return query
			.gte('added', new Date(Date.UTC(yearNumber, 0, 1)).toISOString())
			.lt('added', new Date(Date.UTC(yearNumber + 1, 0, 1)).toISOString());
	}

	const games = await applyYearFilter(
		supabase
			.from('games')
			.select()
			.eq('user_id', user_id)
			.eq('backlogged', backlogged_filter)
			.order('added', { ascending: false })
			.order('id', { ascending: false }),
		requested_year
	)
		.range(0, PAGE_SIZE - 1);
	const movies = await applyYearFilter(
		supabase
			.from('movies')
			.select()
			.eq('user_id', user_id)
			.eq('backlogged', backlogged_filter)
			.order('added', { ascending: false })
			.order('id', { ascending: false }),
		requested_year
	)
		.range(0, PAGE_SIZE - 1);
	const shows = await applyYearFilter(
		supabase
			.from('shows')
			.select()
			.eq('user_id', user_id)
			.eq('backlogged', backlogged_filter)
			.order('added', { ascending: false })
			.order('id', { ascending: false }),
		requested_year
	)
		.range(0, PAGE_SIZE - 1);
	const books = await applyYearFilter(
		supabase
			.from('books')
			.select()
			.eq('user_id', user_id)
			.eq('backlogged', backlogged_filter)
			.order('added', { ascending: false })
			.order('id', { ascending: false }),
		requested_year
	)
		.range(0, PAGE_SIZE - 1);
	const challenges = await supabase
		.from('user_challenges')
		.select()
		.eq('user_id', user_id)
		.order('year', { ascending: false });

	async function getAvailableYears(table: MediaTable) {
		const { data, error } = await supabase.rpc('get_available_years', {
			table_name: table,
			p_user_id: user_id,
			p_backlogged: backlogged_filter
		});

		if (!error) {
			return ((data as AvailableYearRow[] | null) ?? []).map((row) => String(row.year));
		}

		const years = new Set<string>();
		let offset = 0;
		const pageSize = 1000;

		while (true) {
			const { data: rows, error: yearsError } = await supabase
				.from(table)
				.select('added')
				.eq('user_id', user_id)
				.eq('backlogged', backlogged_filter)
				.not('added', 'is', null)
				.range(offset, offset + pageSize - 1);

			if (yearsError || !rows?.length) {
				break;
			}

			for (const row of rows as { added?: string | null }[]) {
				const year = row.added ? new Date(row.added).getUTCFullYear() : NaN;
				if (Number.isFinite(year)) {
					years.add(String(year));
				}
			}

			if (rows.length < pageSize) {
				break;
			}
			offset += pageSize;
		}

		return [...years].sort((a, b) => Number(b) - Number(a));
	}

	const [available_game_years, available_movie_years, available_show_years, available_book_years] =
		await Promise.all([
			getAvailableYears('games'),
			getAvailableYears('movies'),
			getAvailableYears('shows'),
			getAvailableYears('books')
		]);

	return {
		session,
		profile,
		user_id,
		games,
		movies,
		shows,
		books,
		availableYears: {
			games: available_game_years,
			movies: available_movie_years,
			shows: available_show_years,
			books: available_book_years
		},
		initialYear: requested_year,
		challenges: challenges.data || [],
		// Query parameters for routing from notifications
		mediaId: url.searchParams.get('mediaId'),
		mediaType: url.searchParams.get('mediaType'),
		mediaYear: url.searchParams.get('mediaYear'),
		mode: url.searchParams.get('mode')
	};
};
