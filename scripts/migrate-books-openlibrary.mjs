#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function loadDotEnvFile() {
	try {
		const rawEnv = await readFile(path.join(process.cwd(), '.env'), 'utf8');
		for (const line of rawEnv.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) {
				continue;
			}

			const separatorIndex = trimmed.indexOf('=');
			if (separatorIndex === -1) {
				continue;
			}

			const key = trimmed.slice(0, separatorIndex).trim();
			const rawValue = trimmed.slice(separatorIndex + 1).trim();
			const value = rawValue.replace(/^['"]|['"]$/g, '');
			if (key && process.env[key] === undefined) {
				process.env[key] = value;
			}
		}
	} catch (error) {
		if (error?.code !== 'ENOENT') {
			throw error;
		}
	}
}

await loadDotEnvFile();

const APPLY = process.argv.includes('--apply');
const CONTACT_EMAIL = process.env.PRIVATE_OPENLIBRARY_CONTACT_EMAIL;
const SUPABASE_URL =
	process.env.EDGE_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY =
	process.env.EDGE_SUPABASE_SERVICE_ROLE_KEY ||
	process.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_SERVICE_ROLE_KEY;

const OPENLIBRARY_WORK_ID_PATTERN = /^OL\d+W$/;
const REQUEST_INTERVAL_MS = 350;
const BOOK_GENRE_RULES = [
	['Science Fiction', ['science fiction', 'science fantasy', 'sci fi', 'scifi', 'dystopian']],
	['Fantasy', ['fantasy', 'magic', 'magical', 'litrpg', 'sword and sorcery']],
	['Thriller', ['thriller', 'suspense', 'spy stories', 'espionage']],
	['Krimi', ['detective', 'murder', 'crime', 'criminal', 'mystery fiction']],
	['Mystery', ['mystery', 'detective']],
	['Romantik', ['romance', 'love stories']],
	['Historischer Roman', ['historical fiction', 'history fiction']],
	['Biografie', ['biography', 'biographies']],
	['Autobiografie', ['autobiography', 'autobiographies', 'memoir']],
	['Psychologie', ['psychology', 'psychological']],
	['Selbsthilfe', ['self-help', 'self help']],
	['Wirtschaft', ['business', 'economics', 'finance', 'management']],
	['Wissenschaft', ['popular science', 'technology', 'mathematics', 'physics', 'biology']],
	['Geschichte', ['history', 'historical']],
	['Kinderbuch', ['juvenile fiction', 'children', 'children’s', "children's"]],
	['Jugendbuch', ['young adult', 'juvenile literature', 'teen']],
	['Manga/Comic', ['comic', 'comics', 'manga', 'graphic novel']],
	['Lyrik', ['poetry', 'poems']],
	['Sachbuch', ['nonfiction', 'non-fiction', 'non fiction']],
	['Belletristik', ['fiction', 'literature', 'novel']]
];

let lastOpenLibraryRequest = 0;
const searchCache = new Map();

function usage() {
	console.log(`
Usage:
  node scripts/migrate-books-openlibrary.mjs          # dry run
  node scripts/migrate-books-openlibrary.mjs --apply  # update high-confidence matches

Required env:
  PUBLIC_SUPABASE_URL or EDGE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY, PRIVATE_SUPABASE_SERVICE_ROLE_KEY, or EDGE_SUPABASE_SERVICE_ROLE_KEY

Optional env:
  PRIVATE_OPENLIBRARY_CONTACT_EMAIL

Current env:
  Supabase URL: ${SUPABASE_URL ? 'found' : 'missing'}
  Service role key: ${SERVICE_ROLE_KEY ? 'found' : 'missing'}
`);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttleOpenLibrary() {
	const elapsed = Date.now() - lastOpenLibraryRequest;
	if (elapsed < REQUEST_INTERVAL_MS) {
		await sleep(REQUEST_INTERVAL_MS - elapsed);
	}
	lastOpenLibraryRequest = Date.now();
}

function normalizeOpenLibraryWorkId(key) {
	if (!key) {
		return null;
	}
	return key.match(/OL\d+W/)?.[0] ?? null;
}

function normalizeText(value) {
	return String(value ?? '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\bvol(?:ume)?\b/g, 'volume')
		.replace(/\bone\b/g, '1')
		.replace(/\btwo\b/g, '2')
		.replace(/\bthree\b/g, '3')
		.replace(/\bfour\b/g, '4')
		.replace(/\bfive\b/g, '5')
		.replace(/\bsix\b/g, '6')
		.replace(/\bseven\b/g, '7')
		.replace(/\beight\b/g, '8')
		.replace(/\bnine\b/g, '9')
		.replace(/\bten\b/g, '10')
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}

function tokens(value) {
	return new Set(normalizeText(value).split(' ').filter(Boolean));
}

function tokenOverlap(a, b) {
	const left = tokens(a);
	const right = tokens(b);
	if (!left.size || !right.size) {
		return 0;
	}

	let matches = 0;
	for (const token of left) {
		if (right.has(token)) {
			matches += 1;
		}
	}

	return matches / Math.max(left.size, right.size);
}

function directionalTokenOverlap(needle, haystack) {
	const left = tokens(needle);
	const right = tokens(haystack);
	if (!left.size || !right.size) {
		return 0;
	}

	let matches = 0;
	for (const token of left) {
		if (right.has(token)) {
			matches += 1;
		}
	}

	return matches / left.size;
}

function getEditionTitle(edition) {
	return [edition?.title, edition?.subtitle].filter(Boolean).join(' ');
}

function getEditionTitleVariants(edition) {
	return [...new Set([edition?.title, getEditionTitle(edition)].filter(Boolean))];
}

function getBestEditionMatch(row, doc) {
	let bestEdition = null;
	let bestScore = 0;
	const editions = doc.editions?.docs;

	if (!Array.isArray(editions)) {
		return { edition: null, score: 0 };
	}

	for (const edition of editions) {
		for (const editionTitle of getEditionTitleVariants(edition)) {
			const score = tokenOverlap(row.title, editionTitle);
			if (score > bestScore) {
				bestScore = score;
				bestEdition = edition;
			}
		}
	}

	return { edition: bestEdition, score: bestScore };
}

function getCandidateTitles(doc) {
	const titles = [doc.title];
	const editions = doc.editions?.docs;
	if (Array.isArray(editions)) {
		for (const edition of editions) {
			titles.push(...getEditionTitleVariants(edition));
		}
	}

	return [...new Set(titles.filter(Boolean))];
}

function getBestTitleMatch(row, doc) {
	let bestTitle = doc.title ?? null;
	let bestScore = 0;

	for (const title of getCandidateTitles(doc)) {
		const score = tokenOverlap(row.title, title);
		if (score > bestScore) {
			bestScore = score;
			bestTitle = title;
		}
	}

	return { title: bestTitle, score: bestScore };
}

function getYear(value) {
	if (!value) {
		return null;
	}

	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear();
}

function toOpenLibraryRelease(doc) {
	const publishedDate = doc.first_publish_date?.trim();
	if (publishedDate) {
		const parsed = new Date(publishedDate);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed.toISOString();
		}
	}

	if (typeof doc.first_publish_year === 'number' && Number.isFinite(doc.first_publish_year)) {
		return new Date(Date.UTC(doc.first_publish_year, 0, 1)).toISOString();
	}

	return null;
}

function getOpenLibraryHeaders() {
	const headers = {
		Accept: 'application/json',
		'User-Agent': CONTACT_EMAIL ? `media-logging-web/1.0 (${CONTACT_EMAIL})` : 'media-logging-web/1.0'
	};

	if (CONTACT_EMAIL) {
		headers.From = CONTACT_EMAIL;
	}

	return headers;
}

function normalizeSubject(subject) {
	return String(subject)
		.toLowerCase()
		.replace(/^(?:subject|genre|series|place|person|time):/i, '')
		.replace(/[_-]+/g, ' ')
		.trim();
}

function mapOpenLibrarySubjectsToGenres(subjects) {
	if (!Array.isArray(subjects) || subjects.length === 0) {
		return null;
	}

	const normalizedSubjects = subjects.map(normalizeSubject).filter(Boolean);
	const genres = [];

	for (const [genre, needles] of BOOK_GENRE_RULES) {
		if (normalizedSubjects.some((subject) => needles.some((needle) => subject.includes(needle)))) {
			genres.push(genre);
		}
	}

	return genres.length ? genres.slice(0, 4).join(', ') : null;
}

function scoreCandidate(row, doc) {
	const titleScore = getBestTitleMatch(row, doc).score;
	const authorScore = directionalTokenOverlap(row.author, doc.author_name?.join(' ') ?? '');
	const existingYear = getYear(row.release);
	const candidateYear = doc.first_publish_year ?? getYear(doc.first_publish_date);
	let yearScore = 0.5;

	if (existingYear && candidateYear) {
		const difference = Math.abs(existingYear - candidateYear);
		yearScore = difference === 0 ? 1 : difference <= 1 ? 0.85 : difference <= 5 ? 0.45 : 0;
	}

	const score = titleScore * 0.6 + authorScore * 0.3 + yearScore * 0.1;
	return Number(score.toFixed(3));
}

function candidateToUpdate(doc, row) {
	const bestEditionMatch = getBestEditionMatch(row, doc);
	const matchedEdition = bestEditionMatch.edition;

	return {
		gbid: normalizeOpenLibraryWorkId(doc.key),
		title: matchedEdition?.title ?? doc.title ?? null,
		subtitle: matchedEdition?.subtitle ?? null,
		author: doc.author_name?.join(', ') ?? null,
		release: toOpenLibraryRelease(doc),
		image: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
		pagecount:
			typeof doc.number_of_pages_median === 'number' && Number.isFinite(doc.number_of_pages_median)
				? doc.number_of_pages_median
				: null,
		averagerating:
			typeof doc.ratings_average === 'number' ? Number(doc.ratings_average.toFixed(1)) : null,
		genres: mapOpenLibrarySubjectsToGenres(doc.subject)
	};
}

async function searchOpenLibrary(row) {
	const cacheKey = `${normalizeText(row.title)}|${normalizeText(row.author)}`;
	if (searchCache.has(cacheKey)) {
		return searchCache.get(cacheKey);
	}

	const url = new URL('https://openlibrary.org/search.json');
	if (normalizeText(row.title).length < 3) {
		url.searchParams.set('title', row.title ?? '');
	} else {
		url.searchParams.set('q', row.title ?? '');
	}
	if (row.author) {
		url.searchParams.set('author', row.author);
	}
	url.searchParams.set('limit', '5');
	url.searchParams.set(
		'fields',
		[
			'key',
			'title',
			'author_name',
			'first_publish_year',
			'first_publish_date',
			'cover_i',
			'number_of_pages_median',
			'ratings_average',
			'subject',
			'editions',
			'editions.title',
			'editions.subtitle',
			'editions.language',
			'editions.publish_date'
		].join(',')
	);

	await throttleOpenLibrary();
	const response = await fetch(url, {
		headers: getOpenLibraryHeaders()
	});

	if (!response.ok) {
		throw new Error(`OpenLibrary request failed with status ${response.status}`);
	}

	const payload = await response.json();
	const docs = Array.isArray(payload.docs) ? payload.docs : [];
	searchCache.set(cacheKey, docs);
	return docs;
}

function chooseBestCandidate(row, docs) {
	const candidates = docs
		.map((doc) => {
			const bestTitleMatch = getBestTitleMatch(row, doc);
			return {
				workId: normalizeOpenLibraryWorkId(doc.key),
				title: doc.title,
				matchedTitle: bestTitleMatch.title,
				author: doc.author_name?.join(', ') ?? null,
				score: scoreCandidate(row, doc),
				doc
			};
		})
		.filter((candidate) => candidate.workId)
		.sort((a, b) => b.score - a.score);

	const best = candidates[0] ?? null;
	const accepted = best !== null && best.score >= 0.5;

	return { accepted, best, candidates };
}

async function recalculateBookRewatchState(supabase, userId, gbid) {
	const { data: duplicates, error } = await supabase
		.from('books')
		.select('id, added')
		.eq('user_id', userId)
		.eq('gbid', gbid)
		.eq('backlogged', 0)
		.order('added', { ascending: true });

	if (error) {
		throw error;
	}

	const count = duplicates?.length ?? 0;
	if (count === 0) {
		return;
	}

	const ids = duplicates.map((row) => row.id);
	await supabase
		.from('books')
		.update({ is_rewatch: count > 1, rewatch_count: count })
		.in('id', ids);

	await supabase
		.from('books')
		.update({ is_rewatch: false, rewatch_count: count })
		.eq('id', duplicates[0].id);
}

async function main() {
	if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
		usage();
		process.exitCode = 1;
		return;
	}

	const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	});

	const { data: rows, error } = await supabase
		.from('books')
		.select('id, user_id, gbid, title, author, release')
		.order('id', { ascending: true });

	if (error) {
		throw error;
	}

	const report = {
		mode: APPLY ? 'apply' : 'dry-run',
		createdAt: new Date().toISOString(),
		totalRows: rows?.length ?? 0,
		alreadyOpenLibrary: 0,
		matched: 0,
		updated: 0,
		skipped: 0,
		failed: 0,
		results: []
	};

	for (const row of rows ?? []) {
		if (OPENLIBRARY_WORK_ID_PATTERN.test(row.gbid ?? '')) {
			report.alreadyOpenLibrary += 1;
			continue;
		}

		try {
			const docs = await searchOpenLibrary(row);
			const { accepted, best, candidates } = chooseBestCandidate(row, docs);

			if (!accepted || !best) {
				report.skipped += 1;
				report.results.push({
					id: row.id,
					oldGbid: row.gbid,
					title: row.title,
					author: row.author,
					status: candidates.length ? 'skipped_ambiguous' : 'skipped_no_results',
					candidates: candidates.map(({ workId, title, matchedTitle, author, score }) => ({
						workId,
						title,
						matchedTitle,
						author,
						score
					}))
				});
				continue;
			}

			report.matched += 1;
			const update = candidateToUpdate(best.doc, row);
			report.results.push({
				id: row.id,
				oldGbid: row.gbid,
				title: row.title,
				author: row.author,
				status: APPLY ? 'updated' : 'matched_dry_run',
				confidence: best.score,
				update
			});

			if (APPLY) {
				const { data: updatedRows, error: updateError } = await supabase
					.from('books')
					.update(update)
					.eq('id', row.id)
					.select('id');
				if (updateError) {
					throw updateError;
				}
				if (!updatedRows?.length) {
					throw new Error(
						`No rows updated for books.id=${row.id}. Check that you are using a service role key and the correct Supabase project.`
					);
				}
				await recalculateBookRewatchState(supabase, row.user_id, update.gbid);
				report.updated += 1;
			}
		} catch (rowError) {
			report.failed += 1;
			report.results.push({
				id: row.id,
				oldGbid: row.gbid,
				title: row.title,
				author: row.author,
				status: 'failed',
				error: rowError instanceof Error ? rowError.message : String(rowError)
			});
		}
	}

	const outputDir = path.join(process.cwd(), 'migration-reports');
	await mkdir(outputDir, { recursive: true });
	const outputFile = path.join(outputDir, `books-openlibrary-${report.mode}-${Date.now()}.json`);
	await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

	console.log(
		JSON.stringify(
			{
				mode: report.mode,
				totalRows: report.totalRows,
				alreadyOpenLibrary: report.alreadyOpenLibrary,
				matched: report.matched,
				updated: report.updated,
				skipped: report.skipped,
				failed: report.failed,
				report: outputFile
			},
			null,
			2
		)
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
