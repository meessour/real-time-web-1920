const fetch = require("node-fetch");
const baseUrl = "https://api.spotify.com/v1/";

class Tracks {
    parseTracks(tracks) {
        const parsedTracks = [];

        // If the item is not an array, put it in an array
        if (!Array.isArray(tracks)){
            tracks = [tracks]
        }

        if (tracks) {
            for (let i = 0; i < tracks.length; i++) {
                // Check if the album has an id
                if (tracks[i] && tracks[i].id) {
                    parsedTracks.push({
                        id: tracks[i].id,
                        name: tracks[i].name,
                        // Selects the lowest resolution album cover
                        album: tracks[i].album && tracks[i].album.images[0] ?
                            tracks[i].album.images[(tracks[i].album.images.length - 1)].url
                            : undefined,
                        duration_ms: this.millisToMinutesAndSeconds(tracks[i].duration_ms)
                    });
                }
            }
        }

        if (parsedTracks && parsedTracks.length)
            return parsedTracks;

        throw "Error while parsing tracks";
    }

    // https://stackoverflow.com/a/21294619/11119707
    millisToMinutesAndSeconds(millis) {
        let minutes = Math.floor(millis / 60000);
        let seconds = ((millis % 60000) / 1000).toFixed(0);
        return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
    }

    async searchTracks(token, input) {
        // Encode special charcter with "percent encoding"
        input = escape(input)

        const requestType = "GET";

        // Search for tracks
        const searchType = "track";

        // Only load the 5 most popular tracks
        const itemsToLoad = 5;

        const finalUrl = `${baseUrl}search?q=${input}&type=${searchType}&limit=${itemsToLoad}`;
        const encodedFinalUrl = encodeURI(finalUrl);

        console.log("encodedFinalUrl", finalUrl)

        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },

        });

        const responseJson = await response.json()

        if (responseJson && responseJson.tracks && responseJson.tracks.items && responseJson.tracks.total)
            return responseJson.tracks.items;

        if (responseJson && responseJson.error)
            throw responseJson.error.message;
    }

    async searchTrackById(token, trackId) {
        const finalUrl = `${baseUrl}tracks/${trackId}`;

        console.log("finalUrl", finalUrl)

        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },

        });

        const responseJson = await response.json()

        if (responseJson && responseJson.id)
            return responseJson;

        if (responseJson && responseJson.error)
            throw responseJson.error.message;
    }
}

module.exports = Tracks;