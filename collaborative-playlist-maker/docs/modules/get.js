const fetch = require("node-fetch");

async function searchSongs(input) {
    // return new Promise(async function (resolve, reject) {
    //     try {
    //         const token = "Mjc3OWY3YmYwOTAzNDMxZWE2MTJkODFhNDM3YzY5MWI6Yjc2ZGEyODMxODM5NDU3ZGI4N2Q0NzJmNmI2MDdiYzY=";
    //
    //         // Only load 5 songs
    //         const itemsToLoad = 5;
    //
    //         const finalUrl = `https://api.spotify.com/v1/search?q=${input}&type=track&limit=${itemsToLoad}`;
    //         const encodedFinalUrl = encodeURI(finalUrl);
    //
    //         const response = await fetch(encodedFinalUrl, {
    //             method: 'GET',
    //             headers: {
    //                 'Accept': 'application/json',
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${token}`
    //             },
    //         });
    //
    //         resolve(response.json());
    //     } catch (error) {
    //         console.log("something went wrong", error)
    //         reject(error);
    //     }
    // });
}

async function fetchToken() {
    try {
        console.log("get fetchtoken")
        const id = "7223c22e92144ecf8389b563143cf60c";
        const secret = "5f0d9e7c491a47e4b867aaff981a8d69";

        const token = "NzIyM2MyMmU5MjE0NGVjZjgzODliNTYzMTQzY2Y2MGM6NWYwZDllN2M0OTFhNDdlNGI4NjdhYWZmOTgxYThkNjk="

        const url = 'https://accounts.spotify.com/api/token';
        const encodedUrl = encodeURI(url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${token}`
            },
            body: {
                'grant_type': 'client_credentials'
            }
        });

        return response;
    } catch (error) {
        console.log("something went wrong", error)
    }
}

module.exports = {searchSongs, fetchToken}