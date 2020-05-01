const fetch = require("node-fetch");

class Token {
    async getToken() {
        // Returns the token if it is still valid
        if (this.checkToken())
            return this.token;

        const newAccessToken = await this.fetchToken();

        if (newAccessToken && newAccessToken.access_token && newAccessToken.expires_in) {
            this.setToken(newAccessToken.access_token, newAccessToken.expires_in)
            return this.token;
        }

        throw "couldn't get token";
    }

    setToken(token, expiresIn) {
        if (token && expiresIn) {
            const currentTimeInSeconds = Date.now() / 1000;

            const timeOfExpiration = (currentTimeInSeconds + expiresIn);

            this.token = token;
            this.timeOfExpiration = timeOfExpiration;
        }
    }

    checkToken() {
        const currentTimeInSeconds = Date.now() / 1000;

        // Checks if the token is still valid
        return this.token &&
            this.timeOfExpiration &&
            currentTimeInSeconds < this.timeOfExpiration;
    }

    async fetchToken() {
        const id = process.env.CLIENT_ID;
        const secret = process.env.CLIENT_SECRET;

        const url = 'https://accounts.spotify.com/api/token';

        try {
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
}

module.exports = Token;