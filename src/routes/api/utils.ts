import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import { MovieDb, type MovieResult } from 'moviedb-promise';

// IMPORTANT: There might be movies that are not pornographic but instead deals with the pornography industry.
// Said movies as well a lesser known movies without keywords will be removed here
const KEYWORD_MIN = 1;
const BANNED_KEYWORDS: string[] = [
	'sex',
	'softcore',
	'hentai',
	'masochism',
	'eroticism',
	'erotic movie',
	'sexploitation',
	'gangbang',
	'pedophilia',
	'sexual violence',
	'threesome',
	'porno',
	'sexual humor'
];

export async function getRandomNonAdult(movies: MovieResult[]) {
	let movie: MovieResult;
	let nonAdultFoundCheck: boolean = false;
	const tmdb = new MovieDb(PRIVATE_TMDB_V3_KEY);
	do {
		movie = movies[Math.floor(Math.random() * movies.length)];
		try {
			const keywords = await tmdb.movieKeywords(Number(movie.id));
			if (Number(keywords.keywords?.length) < KEYWORD_MIN || movie.vote_count == 0) {
				continue;
			} else {
				let bannedKeywordCheck: boolean = false;
				keywords.keywords?.forEach((keyword) => {
					if (BANNED_KEYWORDS.indexOf(String(keyword.name).toLowerCase()) > -1) {
						console.log(`Skipping ${movie.title} because of keyword ${keyword.name}`);
						bannedKeywordCheck = true;
					}
				});
				if (bannedKeywordCheck) {
					continue;
				}
			}
			nonAdultFoundCheck = true;
		} catch (error) {
			console.log(`Error on Endpoint getKeywords: ${error}`);
			return undefined;
		}
	} while (!nonAdultFoundCheck);
	return movie;
}


export async function removeAllNonAdults(movies: MovieResult[]) {
	let filteredMovies: MovieResult[] = [];
	const tmdb = new MovieDb(PRIVATE_TMDB_V3_KEY);
	for (let movie of movies) {
		try {
			const keywords = await tmdb.movieKeywords(Number(movie.id));
			if (Number(keywords.keywords?.length) < KEYWORD_MIN || movie.vote_count == 0) {
				continue;
			} else {
				keywords.keywords?.forEach((keyword) => {
					if (BANNED_KEYWORDS.indexOf(String(keyword.name).toLowerCase()) > -1) {
						console.log(`Removing ${movie.title} because of keyword ${keyword.name}`);
					}
				});
				filteredMovies.push(movie);
			}
		} catch (error) {
			console.log(`Error on Endpoint getKeywords: ${error}`);
			return undefined;
		}
	}
	return filteredMovies;
}
