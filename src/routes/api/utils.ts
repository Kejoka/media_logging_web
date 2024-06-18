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
	'sexual humor',
	'fencing',
	'pink film',
	'erotic'
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
				let bannedKeywordCheck: boolean = false;
				keywords.keywords?.forEach((keyword) => {
					if (BANNED_KEYWORDS.indexOf(String(keyword.name).toLowerCase()) > -1) {
						console.log(`Removing ${movie.title} because of keyword ${keyword.name}`);
						bannedKeywordCheck = true;
					}
				});
				if (bannedKeywordCheck) {
					continue;
				}
				filteredMovies.push(movie);
			}
		} catch (error) {
			console.log(`Error on Endpoint getKeywords: ${error}`);
			return undefined;
		}
	}
	return filteredMovies;
}

export async function removeAllNonAdultsAndAddScore(movies: MovieResult[], prefs: { tmdb_id: number, factor: number }[]) {
	let filteredMovies: (MovieResult & { score: number })[] = [];
	const tmdb = new MovieDb(PRIVATE_TMDB_V3_KEY);
	for (let movie of movies) {
		try {
			const keywords = await tmdb.movieKeywords(Number(movie.id));
			if (Number(keywords.keywords?.length) < KEYWORD_MIN || movie.vote_count == 0) {
				console.log(`Removing ${movie.title} because of missing keywords or ratings`);
				continue;
			} else {
				let bannedKeywordCheck: boolean = false;
				let movieScore: number = 0;
				keywords.keywords?.forEach((keyword) => {
					if (BANNED_KEYWORDS.indexOf(String(keyword.name).toLowerCase()) > -1) {
						bannedKeywordCheck = true;
						console.log(`Removing ${movie.title} because of keyword ${keyword.name}`);
					}
					else {
						const keywordIndex = prefs.findIndex(x => x.tmdb_id == keyword.id)
						const matchCount = 0;
						if (keywordIndex != -1) {
							// console.log(`${movie.title} has keyword ${keyword.name} with factor ${prefs[keywordIndex].factor}`)
							movieScore += prefs[keywordIndex].factor;
						}
					}
				});
				if (bannedKeywordCheck) {
					continue;
				}
				// console.log(`${movie.title}: ${movieScore / Number(keywords.keywords?.length)}`);
				if (movieScore >= 0) {
					filteredMovies.push({ ...movie, score: movieScore / Number(keywords.keywords?.length) });
				}
			}
		} catch (error) {
			console.log(`Error on Endpoint getKeywords: ${error}`);
			return undefined;
		}
	}
	return filteredMovies;
}