const fetch = require("node-fetch");

async function fetchToken() {
    try {
        const id = process.env.CLIENT_ID;
        const secret = process.env.CLIENT_SECRET;

        const url = 'https://accounts.spotify.com/api/token';

        const encryptedToken = Buffer.from(`${id}:${secret}`).toString('base64');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${encryptedToken}`
            },
            body: 'grant_type=client_credentials'

        });

        return response.json();
    } catch (error) {
        console.log("Something went wrong", error)
    }
}

async function searchSongs(token, input) {
    try {
        const baseUrl = "https://api.spotify.com/v1/";
        const requestType = "GET";

        // Search for tracks
        const searchType = "track";

        // Only load the 5 most popular tracks
        const itemsToLoad = 5;

        const finalUrl = `${baseUrl}search?q=${input}&type=${searchType}&limit=${itemsToLoad}`;
        const encodedFinalUrl = encodeURI(finalUrl);

        const response = await fetch(encodedFinalUrl, {
            method: 'GET',
            headers: {
                // 'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },

        });

        return response.json();
    } catch (error) {
        console.log("Something went wrong", error)
    }
}

/*
    filters out the unnecessary data received from spotify
 */
function parsedTracks(tracks) {
    const parsedTracks = [];

    for (let i = 0; i < tracks.length; i++) {
        // Check if the album has an id
        if (tracks[i] && tracks[i].id) {
            parsedTracks.push({
                name: tracks[i].name,
                // Selects the lowest resolution album cover
                album: tracks[i].album && tracks[i].album.images[0] ?
                    tracks[i].album.images[(tracks[i].album.images.length - 1)].url
                    : undefined,
                duration_ms: millisToMinutesAndSeconds(tracks[i].duration_ms)
            });
        }
    }

    if (parsedTracks.length < 1)
        throw "Error while filtering id's from albums";

    return parsedTracks;
}

// https://stackoverflow.com/a/21294619/11119707
function millisToMinutesAndSeconds(millis) {
    let minutes = Math.floor(millis / 60000);
    let seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

module.exports = {fetchToken, searchSongs, parsedTracks};