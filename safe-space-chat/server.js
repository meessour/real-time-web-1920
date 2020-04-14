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

    socket.on('set username', function (name) {
        if (!socket.userName && name) {
            console.log(`user with id ${socket.userName} connected`);

            socket.userName = name;
            socket.broadcast.emit('server message', `<b>${socket.userName}</b> joined the chat`);
        }
    });

    socket.on('user message', function (message) {
        if (socket.userName) {

            // Reputation is a number between 50 and 100
            // 100 being the best reputation, 50 begin the best reputation
            // This number determines the saturation of the color red of the user's username
            const oldReputation = socket.reputation || 100;
            let newReputation;

            if (containsBadWord(message)) {
                console.log("Bad word found");

                newReputation = (oldReputation - 5);
                if (newReputation < 50) {
                    newReputation = 50
                }
            } else {
                console.log("No bad word found");

                newReputation = (oldReputation + 1);
                if (newReputation > 100) {
                    newReputation = 100
                }
            }

            socket.reputation = newReputation;

            socketIo.emit('user message', `<b style="color: hsl(0, 100%, ${socket.reputation}%);">${socket.userName}:</b> ${message}`);
        }
    });

    socket.on('disconnect', function () {
        if (socket.userName) {
            console.log(`${socket.userName} disconnected`);

            socketIo.emit('server message', `<b>${socket.userName}</b> disconnected`);
        }
    });
});

function containsBadWord(message) {
    // Sets every character to lower case,
    // Because "Fuck" and "fuck" are not equal to each other, but "fuck" and "fuck" are
    message = message.toLowerCase();

    // Source: https://www.freewebheaders.com/full-list-of-bad-words-banned-by-google/
    const badWords = ['anal', 'anus', 'arse', 'ass', 'ass fuck', 'ass hole', 'assfucker', 'asshole', 'assshole',
        'bastard', 'bitch', 'black cock', 'bloody hell', 'boong', 'cock', 'cockfucker', 'cocksuck', 'cocksucker',
        'coon', 'coonnass', 'crap', 'cunt', 'cyberfuck', 'damn', 'darn', 'dick', 'dirty', 'douche', 'dummy', 'erect',
        'erection', 'erotic', 'escort', 'fag', 'faggot', 'fuck', 'Fuck off', 'fuck you', 'fuckass', 'fuckhole',
        'god damn', 'gook', 'hard core', 'hardcore', 'homoerotic', 'hore', 'lesbian', 'lesbians', 'mother fucker',
        'motherfuck', 'motherfucker', 'negro', 'nigger', 'orgasim', 'orgasm', 'penis', 'penisfucker', 'piss',
        'piss off', 'porn', 'porno', 'pornography', 'pussy', 'retard', 'sadist', 'sex', 'sexy', 'shit', 'slut',
        'son of a bitch', 'suck', 'tits', 'viagra', 'whore', 'xxx'];

    // Source: https://stackoverflow.com/a/46337280/11119707
    return badWords.some(badWord => message.includes(badWord));
}