const get = require('./docs/modules/get.js');

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
        if (socket.userName) {
            const songs = [{name: "first"}, {name: "2nsd"}]

            // searchSongs(input).then(data => {
            //     console.log("results getSongs:", data)
            //     return data;
            // }).then(data => {
            //     // socketIo.emit('song results', songs);
            // }).catch(error => {
            //     console.log("something went wrong:", error);
            // });
            //
            get.fetchToken().then(data => {
                console.log("results data.responseText:", data.status)
                console.log("results data.responseText:", data.statusText)
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