import Papa from 'papaparse';
import { supabase } from './supabaseClient';

export function getYears(db_data: {}[]) {
    const currentYear = new Date().getFullYear()
    let uniqueYears = [...new Set(db_data.map(obj => obj.addedin))].sort()
    if (uniqueYears.indexOf(currentYear) == -1) {
        uniqueYears.push(currentYear)
    }
    const newYearObjects = uniqueYears.map(value => ({
        year: value,
        active: false
    }));
    newYearObjects[newYearObjects.findIndex(obj => obj.year == currentYear)].active = true;
    return newYearObjects
}

export function indexToMedium(index: number) {
    return ["games", "movies", "shows", "books"][index]
}

export async function readCSV(table: string) {
    let data: object[] = [];
    const response = await fetch(`/${table}.csv`);
    const csv = await response.text();

    Papa.parse(csv, {
        header: true,
        complete: function (results) {
            data = results.data as object[];
        }
    });

    return data
}

export async function DEBUG_csvToSupabase(user_id: string) {
    let TABLE: string = 'games';
    let csv = await readCSV(TABLE);
    csv.forEach(async (line) => {
        console.log(line);
        let res, imageLink;
        switch (TABLE) {
            case 'games':
                imageLink = line['image'].split('cover_big');
                res = await supabase.from('games').insert({
                    user_id: user_id,
                    title: line['title'],
                    image: imageLink[0] + 'logo_med' + imageLink[1],
                    release: line['release'],
                    genres: line['genres'],
                    averagerating: line['averageRating'],
                    addedin: line['addedIn'],
                    rating: line['rating'],
                    backlogged: line['backlogged'],
                    platforms: line['platforms'],
                    trophy: line['trophy']
                });
                break;
            case 'movies':
                imageLink = line['image'].split('original');
                res = await supabase.from('movies').insert({
                    user_id: user_id,
                    title: line['title'],
                    image: imageLink[0] + 'w154' + imageLink[1],
                    release: line['release'],
                    genres: line['genres'],
                    averagerating: line['averageRating'],
                    addedin: line['addedIn'],
                    rating: line['rating'],
                    backlogged: line['backlogged']
                });
                console.log(res)
                break;
            case 'shows':
                imageLink = line['image'].split('original');
                res = await supabase.from('shows').insert({
                    user_id: user_id,
                    title: line['title'],
                    image: imageLink[0] + 'w154' + imageLink[1],
                    release: line['release'],
                    genres: line['genres'],
                    seasons: line['seasons'],
                    episode: line['episode'],
                    averagerating: line['averageRating'],
                    addedin: line['addedIn'],
                    rating: line['rating'],
                    backlogged: line['backlogged']
                });
                break;
            case 'books':
                res = await supabase.from('books').insert({
                    user_id: user_id,
                    title: line['title'],
                    subtitle: line['subtitle'],
                    pagecount: line['pageCount'],
                    image: line['image'],
                    author: line['author'],
                    release: line['release'],
                    genres: line['genres'],
                    averagerating: line['averageRating'],
                    addedin: line['addedIn'],
                    rating: line['rating'],
                    backlogged: line['backlogged']
                });
                break;
            default:
                console.log('invalid table');
        }
    });
}