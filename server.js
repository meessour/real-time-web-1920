const express = require('express');
const bodyParser = require('body-parser');
const enforce = require('express-sslify');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const messages = [
    {name: 'Tim', message: 'Hi'},
    {name: 'Jane', message: 'Hello'}
];

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

io.on('connection', (socket) => {
    console.log('a user connected')
});

http.listen(port, () => {
    console.log("Server is listening on port", port);
});

app.get('/', (req, res) => {
    res.render('index.ejs');
});

app.get('/messages', (req, res) =>{
    console.log("get messages!")
    res.send(messages)
});

app.post('/message', async (req, res) => {
    try {
        const newMessage = req.body;

        io.emit('message', newMessage)

        console.log("new message", req.body)
        res.sendStatus(200);
    } catch (error) {
        res.sendStatus(500)
        return console.error(error)
    }
});