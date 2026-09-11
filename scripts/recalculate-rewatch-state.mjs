#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
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
			const value = trimmed
				.slice(separatorIndex + 1)
				.trim()
				.replace(/^['"]|['"]$/g, '');
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
const SUPABASE_URL =
	process.env.EDGE_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY =
	process.env.EDGE_SUPABASE_SERVICE_ROLE_KEY ||
	process.env.PRIVATE_SUPABASE_SERVICE_ROLE_KEY ||
	process.env.SUPABASE_SERVICE_ROLE_KEY;

const CONFIG = {
	games: { select: 'id, user_id, added, igdbid', getKey: (row) => row.igdbid },
	movies: { select: 'id, user_id, added, tmdbid', getKey: (row) => row.tmdbid },
	shows: {
		select: 'id, user_id, added, tmdbid, seasons',
		getKey: (row) => {
			if (row.tmdbid == null) {
				return null;
			}
			const seasonKey = String(row.seasons ?? '')
				.trim()
				.replace(/\s+/g, '')
				.toLowerCase();
			return seasonKey ? `${row.tmdbid}:${seasonKey}` : `${row.tmdbid}:unknown:${row.id}`;
		}
	},
	books: { select: 'id, user_id, added, gbid', getKey: (row) => row.gbid },
	music: { select: 'id, user_id, added, mbid', getKey: (row) => row.mbid }
};

function usage() {
	console.log(`
Usage:
  node scripts/recalculate-rewatch-state.mjs          # dry run
  node scripts/recalculate-rewatch-state.mjs --apply  # rewrite is_rewatch and rewatch_count

Required env:
  PUBLIC_SUPABASE_URL or EDGE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY, PRIVATE_SUPABASE_SERVICE_ROLE_KEY, or EDGE_SUPABASE_SERVICE_ROLE_KEY

Current env:
  Supabase URL: ${SUPABASE_URL ? 'found' : 'missing'}
  Service role key: ${SERVICE_ROLE_KEY ? 'found' : 'missing'}
`);
}

function compareRows(a, b) {
	const left = new Date(a.added ?? 0).getTime();
	const right = new Date(b.added ?? 0).getTime();
	if (left !== right) {
		return left - right;
	}
	return a.id - b.id;
}

async function recalculateTable(supabase, table, config) {
	const { data, error } = await supabase
		.from(table)
		.select(config.select)
		.eq('backlogged', 0)
		.order('user_id')
		.order('added', { ascending: true })
		.order('id', { ascending: true });

	if (error) {
		throw error;
	}

	const groups = new Map();
	const rows = data ?? [];
	for (const row of rows) {
		const keyPart = config.getKey(row);
		if (keyPart == null || keyPart === '') {
			continue;
		}
		const key = `${row.user_id}:${keyPart}`;
		const groupRows = groups.get(key) ?? [];
		groupRows.push(row);
		groups.set(key, groupRows);
	}

	let changedRows = 0;
	let updatedRows = 0;
	for (const groupRows of groups.values()) {
		const sortedRows = [...groupRows].sort(compareRows);
		const count = sortedRows.length;
		for (let index = 0; index < sortedRows.length; index += 1) {
			const update = { is_rewatch: index > 0, rewatch_count: count };
			changedRows += 1;
			if (!APPLY) {
				continue;
			}
			const { data: updated, error: updateError } = await supabase
				.from(table)
				.update(update)
				.eq('id', sortedRows[index].id)
				.select('id');
			if (updateError) {
				throw updateError;
			}
			updatedRows += updated?.length ?? 0;
		}
	}

	return {
		table,
		rows: rows.length,
		groups: groups.size,
		changedRows,
		updatedRows
	};
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

	const results = [];
	for (const [table, config] of Object.entries(CONFIG)) {
		results.push(await recalculateTable(supabase, table, config));
	}

	console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', results }, null, 2));
}

await main();
