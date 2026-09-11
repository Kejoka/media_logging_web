export type ReleaseNote = {
	version: string;
	title: string;
	summary: string;
	items: string[];
};

/**
 * Add a new entry when publishing a new version and update package.json's
 * version at the same time. The acknowledgement is stored per user and per
 * version, so old entries do not reappear after a new release.
 */
const releaseNotes: Record<string, ReleaseNote> = {
	'2.2.1': {
		version: '2.2.1',
		title: 'Es gibt jetzt Changelogs!',
		summary:
			'Changelogs werden jetzt beim ersten Besuch nach einem Release angezeigt, damit meine fragwürdigen UX Design-Entscheidungen nicht mehr dafür sorgen, dass es Features gibt, die nur ich kenne :)',
		items: [
			'Changelogs, wow! Den hier siehst du weil du in den Settings gestöbert hast.',
			'Feature Beschreibungen, die weiter zurück liegen beschreibe ich jetzt aber nicht weil zu faul.'
		]
	},
	'2.3.0': {
		version: '2.3.0',
		title: 'Neuer Medientyp: Musik!',
		summary:
			'Musik kann jetzt genauso wie Games, Filme, Serien und Bücher getrackt werden. Außerdem gibt es dazu ein paar weitere kleine Verbesserungen.',
		items: [
			'Musik kann jetzt getrackt werden. Wenn dich das nicht interessiert, kannst du Musik in den Einstellungen einfach deaktivieren.',
			'Alben, EPs und Singles können getrackt werden. Die Musikdaten kommen von MusicBrainz (wenn die Daten Mist sind bin ich also nicht Schuld).',
			'Die Musik Suche funktioniert am besten mit Angabe von Artist + Titel.',
			'Die Settings wurden erweitert: Du kannst jetzt einstellen welche Art von Benachrichtigungen du bekommen willst.',
			'Die verschiedenen Anzeigemöglichkeiten deiner Medien (Filter-Button neben der aufklappbaren Suchleiste und der Medienauswahl) funktioniert jetzt mit der neuen Datenladestrategie.'
		]
	}
};

// Vite injects this from package.json at build time. Keeping package.json out
// of the browser bundle avoids dev-server HTML responses being imported as JS.
const currentVersion = import.meta.env.VITE_APP_VERSION;

export const currentReleaseNote: ReleaseNote = releaseNotes[currentVersion] ?? {
	version: currentVersion,
	title: 'Neu bei Media Logging',
	summary: 'Es gibt neue Änderungen in Media Logging.',
	items: ['Öffne den Changelog, um die neuesten Änderungen zu sehen.']
};

function compareVersions(left: string, right: string) {
	const leftParts = left.split('.').map((part) => Number.parseInt(part, 10) || 0);
	const rightParts = right.split('.').map((part) => Number.parseInt(part, 10) || 0);

	for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++) {
		const difference = (rightParts[index] ?? 0) - (leftParts[index] ?? 0);
		if (difference !== 0) return difference;
	}

	return 0;
}

/** All available releases, newest first, for the account changelog history. */
export const allReleaseNotes = [
	currentReleaseNote,
	...Object.values(releaseNotes).filter((release) => release.version !== currentReleaseNote.version)
].sort((left, right) => compareVersions(left.version, right.version));
