import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
	const id = Number(url.searchParams.get('id') ?? '0');
	if (id == 0) {
		return new Response('No movie id has been passed');
	}
	try {
		const keywords_raw = await fetch(`https://api.themoviedb.org/3/movie/${Number(id)}/keywords?api_key=${PRIVATE_TMDB_V3_KEY}`)
		const keywords = await keywords_raw.json();
		return new Response(JSON.stringify(keywords.keywords !== undefined ? keywords.keywords : []));
	} catch (error) {
		console.log(`Error on Endpoint getKeywords for id ${id}: \n ${error}`);
		return new Response(String(error));
	}
}
