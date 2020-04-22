const get = require('./docs/modules/get.js');

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const enforce = require('express-sslify');

const app = express();
const http = require('http').Server(app);
const socketIo = require('socket.io')(http);

app.set('view engine', 'ejs')
    .set('views', 'views')
    .use(express.static('docs'))
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({extended: true}))
;

// Enforce https when on Heroku
if (app.get("env") === "production") {
    app.use(enforce.HTTPS({trustProtoHeader: true}));
}

const port = process.env.PORT || 1337;

app.get('/', (req, res) => {
    res.render('index.ejs');
});

http.listen(port, () => {
    console.log("Server is listening on port", port);
});

socketIo.on('connection', (socket) => {
    console.log('A user connected');
    socket.userName = "user1"

    socket.on('search song', function (input) {
        if (socket.userName && input !== undefined && input.length) {
            get.fetchToken().then(token => {
                console.log("token:", token)
                if (token.access_token) return token.access_token;

                throw "No access token was returned"
            }).then(token => {
                return get.searchSongs(token, input)
            }).then(tracks => {
                if (tracks && tracks.tracks && tracks.tracks.items) return tracks.tracks.items;
                if (tracks && tracks.error) throw tracks.error.message;
                console.log("tracks:", tracks.tracks.items);

                throw "No tracks were returned"
            }).then(tracks => {
                const parsedTracks = get.parsedTracks(tracks);
                console.log("parsedTracks:", parsedTracks);

                if (!parsedTracks) throw "Couldn't parse tracks";

                socketIo.emit('track results', parsedTracks);
            }).catch(error => {
                console.log("something went wrong:", error);
            });

        }
    });

    socket.on('disconnect', function () {
        if (socket.userName) {
            console.log(`${socket.userName} disconnected`);
        }
    });
});