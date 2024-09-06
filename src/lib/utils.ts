import { PRIVATE_TMDB_V3_KEY } from '$env/static/private';
import type { MovieResult } from './dbUtils';
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
	'sexual humor',
	'fencing',
	'pink film',
	'erotic',
	'sexual torture',
	'prostitution',
	'older man younger woman relationship'
];

export async function getRandomNonAdult(movies: MovieResult[]) {
	let movie: MovieResult;
	let try_count = 0;
	let non_adult_found_check: boolean = false;
	do {
		movie = movies[Math.floor(Math.random() * movies.length)];
		try {
			const keywords_raw = await fetch(`https://api.themoviedb.org/3/movie/${Number(movie.id)}/keywords&api_key=${PRIVATE_TMDB_V3_KEY}`)
			const keywords = await keywords_raw.json();
			if (Number(keywords.keywords?.length) < KEYWORD_MIN || movie.vote_count == 0) {
				continue;
			} else {
				let banned_keyword_check: boolean = false;
				keywords.keywords?.forEach((keyword: any) => {
					if (BANNED_KEYWORDS.indexOf(String(keyword.name).toLowerCase()) > -1) {
						console.log(`Skipping ${movie.title} because of keyword ${keyword.name}`);
						banned_keyword_check = true;
					}
				});
				if (banned_keyword_check) {
					try_count++;
					continue;
				}
			}
			non_adult_found_check = true;
		} catch (error) {
			console.log(`Error on Endpoint getKeywords for id ${movie.id} : ${error}`);
			return undefined;
		}
	} while (!non_adult_found_check || try_count > 10);
	if (try_count > 10) {
		return undefined;
	}
	return movie;
}

export async function removeAllNonAdults(movies: MovieResult[]) {
	const filtered_movies: MovieResult[] = [];
	for (const movie of movies) {
		try {
			const keywords_raw = await fetch(`https://api.themoviedb.org/3/movie/${Number(movie.id)}/keywords&api_key=${PRIVATE_TMDB_V3_KEY}`)
			const keywords = await keywords_raw.json();
			if (Number(keywords.keywords?.length) < KEYWORD_MIN || movie.vote_count == 0) {
				continue;
			} else {
				let banned_keyword_check: boolean = false;
				keywords.keywords?.forEach((keyword: any) => {
					if (BANNED_KEYWORDS.indexOf(String(keyword.name).toLowerCase()) > -1) {
						console.log(`Removing ${movie.title} because of keyword ${keyword.name}`);
						banned_keyword_check = true;
					}
				});
				if (banned_keyword_check) {
					continue;
				}
				filtered_movies.push(movie);
			}
		} catch (error) {
			console.log(`Error on Endpoint getKeywords for id ${movie.id} : ${error}`);
			return undefined;
		}
	}
	return filtered_movies;
}

export async function removeAllNonAdultsAndAddScore(
	movies: MovieResult[],
	prefs: { tmdb_id: number; factor: number }[]
) {
	const filtered_movies: (MovieResult & { score: number })[] = [];
	for (const movie of movies) {
		try {
			const keywords_raw = await fetch(`https://api.themoviedb.org/3/movie/${Number(movie.id)}/keywords&api_key=${PRIVATE_TMDB_V3_KEY}`)
			const keywords = await keywords_raw.json();
			if (Number(keywords.keywords?.length) < KEYWORD_MIN || movie.vote_count == 0) {
				console.log(`Removing ${movie.title} because of missing keywords or ratings`);
				continue;
			} else {
				let banned_keyword_check: boolean = false;
				let movie_score: number = 0;
				keywords.keywords?.forEach((keyword: any) => {
					if (BANNED_KEYWORDS.indexOf(String(keyword.name).toLowerCase()) > -1) {
						banned_keyword_check = true;
						console.log(`Removing ${movie.title} because of keyword ${keyword.name}`);
					} else {
						const keyword_index = prefs.findIndex((x) => x.tmdb_id == keyword.id);
						if (keyword_index != -1) {
							// console.log(`${movie.title} has keyword ${keyword.name} with factor ${prefs[keyword_index].factor}`)
							movie_score += prefs[keyword_index].factor;
						}
					}
				});
				if (banned_keyword_check) {
					continue;
				}
				// console.log(`${movie.title}: ${movie_score / Number(keywords.keywords?.length)}`);
				if (movie_score >= 0) {
					filtered_movies.push({ ...movie, score: movie_score / Number(keywords.keywords?.length) });
				}
			}
		} catch (error) {
			console.log(`Error on Endpoint getKeywords for id ${movie.id} : ${error}`);
			return undefined;
		}
	}
	return filtered_movies;
}

export function getBiasedRandom(min: number, max: number): number {
	const random = Math.random(); // uniform random number between 0 and 1
	const biased_random = 1 - Math.sqrt(1 - random); // biasing the random number
	return Math.floor(min + biased_random * (max - min + 1));
}

// Function to add delay
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
