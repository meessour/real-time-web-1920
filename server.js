require('dotenv').config();

const tokenModule = require('./docs/modules/token.js');
const tracksModule = require('./docs/modules/tracks.js');

const Token = new tokenModule();
const Tracks = new tracksModule();

const express = require('express');
const bodyParser = require('body-parser');
const enforce = require('express-sslify');

const app = express();
const http = require('http').Server(app);
const socketIo = require('socket.io')(http);

// All the groups
const groups = []
// Below here is what a group consists of
// {
//     pin: '00000',
//     // All users in a group
//     users: [{
//         id: '0',
//         userName: 'name'
//     }],
//     // All tracks with different types in playlist of group
//     tracks: [{
//         // A track can be accepted or used for addition or deletion to playlist
//         state: 'accepted | rejected | pending',
//         // People who voted yes on the track
//         votedYes: ['id'],
//         // People who voted no on the track
//         votedNo: ['id'],
//         // track with tracktitle, albumcover image url and duration
//         track: {
//             id: '0'
//             name: 'trackName',
//             album: 'url',
//             duration: 0
//         }
//     }],
// }]

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
    socket.leaveAll();
    console.log("Connection!", socket.id)
    console.log("all rooms the socket is in:", Object.keys(socket.adapter.rooms));

    socket.on('set username', function (name, response) {
        console.log("set user name");

        if (name) {
            console.log(`user with id ${socket.userName} connected`);

            socket.userName = name;
            response(name)
        } else {
            response()
        }
    });

    socket.on('create room', function (response) {
        // Check if user is already in a group
        if (Object.keys(socket.adapter.rooms).length === 0 && socket.userName) {
            const pin = generatePin();
            if (createGroup(pin, socket)) {
                response(pin)
            } else {
                response()
            }

        } else {
            response()
        }

    });

    socket.on('join room', function (roomPin, response) {
        if (groups.find(group => group.pin === roomPin)) {
            if (joinGroup(roomPin, socket)) {
                response(roomPin)
            } else {
                response()
            }
        } else {
            console.log("no room with that pin found")
            response()
        }
    });

    socket.on('search track', function (input, response) {
        if (socket.userName && input !== undefined && input.length) {
            // Get or fetch a token
            Token.getToken().then(token => {
                // Search for the tracks with the token and input
                return Tracks.searchTracks(token, input)
            }).then(tracks => {
                // Filter out unnecessary track data
                const parsedTracks = Tracks.parseTracks(tracks);

                response(parsedTracks)
            }).catch(error => {
                console.log("something went wrong:", error);
                response();
            });
        }
    });

    socket.on('add track request', function (trackId, response) {
        // Only proceed if user has set their userName and a trackId is present
        if (socket.userName && trackId !== undefined && trackId.length) {
            // Get or fetch a token
            Token.getToken().then(token => {
                // Search for the tracks with the token and input
                return Tracks.searchTrackById(token, trackId)
            }).then(tracks => {
                // Filter out unnecessary track data
                const parsedTrack = Tracks.parseTracks(tracks);

                const groupTrack = registerRequestTrack(parsedTrack)

                // TODO: add track to pending

                response(groupTrack)
            }).catch(error => {
                console.log("something went wrong:", error);
                response();
            });
        }
    });

    socket.on('disconnecting', function () {
        // All rooms the user was/is in
        const groupPinList = Object.keys(socket.adapter.rooms);
        const socketId = socket.id

        console.log("disconnecting", groupPinList, socketId)
        console.log(`${socket.id} (${socket.userName}) disconnected`);


        // Let the user leave every group he/she was in
        groupPinList.forEach(groupPin => leaveGroup(groupPin, socketId))

        // Reset the user's username
        socket.userName = undefined
    });
});

function generatePin() {
    let pin

    do {
        pin = Math.random().toString().substr(2, 5);
        console.log("Generated pin:", pin)
    }
        // Check if pin doesn't exist already
    while (groups.includes(pin))

    // Push the new pin to the list of all pins
    groups.push(pin)
    return pin
}

function createGroup(pin, userSocket) {
    try {
        userSocket.join(pin)

        const newGroup = {
            pin: pin,
            users: [{
                id: userSocket.id,
                userName: userSocket.userName
            }],
            tracks: []
        }

        groups.push(newGroup)

        updateClientUsers(pin);

        return true
    } catch (e) {
        console.log("Something went wrong in createGroup()", e)
        return false
    }
}

function joinGroup(pin, userSocket) {
    try {
        userSocket.join(pin);

        groups.find(group => group.pin === pin).users.push({
            id: userSocket.id,
            userName: userSocket.userName
        })

        updateClientUsers(pin);

        return true
    } catch (e) {
        console.log("Something went wrong in createGroup()", e)
        return false
    }
}

function leaveGroup(pin, userSocketId) {
    try {
        // Find the index of the group in the groupslist where the user was in
        const indexOfGroup = groups.findIndex(group => group.pin === pin)
        console.log("indexOfGroup", indexOfGroup)

        // Find the index of the user in the userlist
        const indexOfUserInUserList = groups[indexOfGroup].users.findIndex(user => user.id === userSocketId)
        console.log("indexOfUserInUserList", indexOfUserInUserList)

        // Remove the disconnecting user from the group's list of users he/she was in
        groups[indexOfGroup].users.splice(indexOfUserInUserList, 1)

        updateClientUsers(pin)
    } catch (e) {
        console.log("Couldnt leave the group", e)
    }

}

function updateClientUsers(pin) {
    const allUsersInGroups = groups.find(group => group.pin === pin).users;

    console.log("allUsersInGroups", allUsersInGroups)

    const allUserNames = [];
    allUsersInGroups.forEach(group => allUserNames.push(group.userName))

    console.log("allUserNames", allUserNames)

    // broadcast to room that a new user has joined
    socketIo.sockets.in(pin).emit('new user', allUserNames);
}

function registerRequestTrack(track) {
    if (Array.isArray(track))
        track = track[0]

    groupTrack = {
        state: 'pending',
        votedYes: [],
        votedNo: [],
        track: track
    }

    groups.push(groupTrack)

    return groupTrack
}