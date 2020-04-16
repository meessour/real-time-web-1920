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

    socket.on('disconnect', function () {
        if (socket.userName) {
            console.log(`${socket.userName} disconnected`);
        }
    });
});