import { PRIVATE_IGDB_CLIENT, PRIVATE_IGDB_TOKEN, PRIVATE_TMDB_V3_KEY } from '$env/static/private';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, url }) {
    const reqBody = await request.json();
    const title = reqBody['title'];
    const params = {
        adult: false,
        query: title,
        language: 'de-DE',
        page: 1
    }
    try {
        if (reqBody['type'] === "movies") {
            const raw_res = await fetch(`https://api.themoviedb.org/3/search/movie?query=${params.query}&include_adult=${params.adult}&language=${params.language}&page=${params.page}&api_key=${PRIVATE_TMDB_V3_KEY}`);
            const res = await raw_res.json();
            const response = {
                title: res.results?.at(0)?.title,
                id: res.results?.at(0)?.id
            }
            return new Response(JSON.stringify(response));
        }
        else if (reqBody['type'] === "shows") {
            const raw_res = await fetch(`https://api.themoviedb.org/3/search/tv?query=${params.query}&include_adult=${params.adult}&language=${params.language}&page=${params.page}&api_key=${PRIVATE_TMDB_V3_KEY}`)
            const res = await raw_res.json();
            const response = {
                title: res.results?.at(0)?.name,
                id: res.results?.at(0)?.id
            }
            return new Response(JSON.stringify(response));
        }
        else if ((reqBody['type'] === "games")) {
            try {
                const res = await fetch('https://api.igdb.com/v4/games', {
                    method: 'POST',
                    headers: {
                        'Client-ID': PRIVATE_IGDB_CLIENT,
                        'Authorization': `Bearer ${PRIVATE_IGDB_TOKEN}`,
                        'Accept': 'application/json'
                    },
                    body: `fields name, cover.image_id; where (name = \"${title}\" ); sort first_release_date asc; limit 1;`
                })
                const igdb_res = await res.json();
                console.log(`SEARCH: ${title}`)
                console.log(igdb_res)
                const response = {
                    title: igdb_res.at(0)['name'],
                    id: igdb_res.at(0)['id']
                }
                return new Response(JSON.stringify(response));
            } catch (error) {
                console.log(error);
                try {
                    const res = await fetch('https://api.igdb.com/v4/search', {
                        method: 'POST',
                        headers: {
                            'Client-ID': PRIVATE_IGDB_CLIENT,
                            'Authorization': `Bearer ${PRIVATE_IGDB_TOKEN}`,
                            'Accept': 'application/json'
                        },
                        body: `fields name, game; where (name ~ *\"${title}\"* ); sort published_at asc; limit 1;`
                    })
                    const igdb_res = await res.json();
                    console.log(`SEARCH: ${title}`)
                    console.log(igdb_res)
                    const response = {
                        title: igdb_res.at(0)['name'],
                        id: igdb_res.at(0)['game']
                    }
                    return new Response(JSON.stringify(response));
                } catch (error) {
                    console.log(error)
                }
            }
        }
    } catch (error) {
        console.log(`Error on Endpoint getTMDBID for search ${title}: \n ${error}`);
        return new Response(String(error));
    }
}
