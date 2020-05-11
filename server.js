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

const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_URL}/test?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {useNewUrlParser: true});
let mongoDBClient;
// checkDBConnection();

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
    console.log("all rooms the socket is in:", socket.rooms);

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

    socket.on('create room', async function (response) {
        console.log("groups", groups)
        console.log("Object.keys(socket.rooms)", Object.keys(socket.rooms))
        // Check if user is already in a group
        if (socket.userName) {
            const pin = generatePin();
            if (await createGroup(pin, socket)) {
                console.log("roomOfUser socket.on('create room'", Object.keys(socket.rooms))
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
                const tracks = getTracksOfGroup(roomPin);

                console.log('join room tracks', tracks)
                console.log("roomOfUser", Object.keys(socket.rooms))

                updatePlaylistOfGroup(roomPin);
                response({roomPin, tracks});
            } else {
                response();
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

                const roomOfUser = getRoomOfUser();
                const allTrackData = getTrackData();

                if (allTrackData.find(trackData => trackData.track.id === trackId)) {
                    console.log("Track is already in playlist", trackId)
                } else {
                    registerRequestTrack(roomOfUser, parsedTrack);
                    updatePlaylistOfGroup();
                    response(true)
                }
            }).catch(error => {
                console.log("something went wrong in :socket.on('add track request')", error);
                response()
            });
        }
    });

    socket.on('track vote yes', function (trackId) {
        try {
            console.log("track vote yes", trackId)

            // Only proceed if user has set their userName and a trackId is present
            if (!socket.userName || !trackId)
                throw "username or elementId is undefined in: track vote yes";

            if (!registerVoteYes(trackId))
                throw "Couldn't register vote YES";

            updatePlaylistOfGroup();
        } catch (e) {
            console.log("something went wrong in :socket.on('track vote yes')", e);
        }
    });

    socket.on('track vote no', function (trackId) {
        try {
            console.log("track vote no", trackId)

            // Only proceed if user has set their userName and a trackId is present
            if (!socket.userName || !trackId)
                throw "username or elementId is undefined in: track vote no";

            if (!registerVoteNo(trackId))
                throw "Couldn't register vote NO";

            updatePlaylistOfGroup();
        } catch (e) {
            console.log("something went wrong in :socket.on('track vote no')", e);
        }
    });

    socket.on('disconnecting', function () {
        // All rooms the user was/is in
        const roomPin = getRoomOfUser();
        const socketId = socket.id;

        console.log(`${socketId} (${socket.userName}) disconnected`);

        // Let the user leave every group he/she was in
        leaveGroup(roomPin, socketId);

        // Reset the user's username
        socket.userName = undefined;

        updatePlaylistOfGroup(roomPin);
    });

    function registerRequestTrack(pin, track) {
        if (Array.isArray(track))
            track = track[0]

        const groupTrack = {
            state: 'pending',
            votedYes: [],
            votedNo: [],
            track: track
        }

        // Add the track to the group
        groups.find(group => group.pin === pin).tracks.push(groupTrack)
    }

    function getTrackData() {
        const roomPin = getRoomOfUser();

        const groupData = groups.find(group => group.pin === roomPin);

        if (!groupData)
            throw "Couldn't find group info of user"

        const trackData = groupData.tracks

        if (!trackData)
            throw "No tracks found"

        return trackData
    }

    function getTracksOfGroup(roomPin) {
        const groupDetails = groups.find(group => group.pin === roomPin)
        if (groupDetails) {
            const allTracks = groupDetails.tracks;
            // Only return the not rejected tracks
            const filteredTracks = allTracks.filter(track => track.state !== 'rejected');

            return filteredTracks;
        }
    }

    // function getTracksByRoomPin(roomPin) {
    //     const groupDetails = groups.find(group => group.pin === roomPin)
    //
    //     return groupDetails && groupDetails.tracks ? groupDetails.tracks : undefined;
    // }

    function getRoomOfUser() {
        const roomsOfUser = Object.keys(socket.rooms);

        if (roomsOfUser.length === 1)
            return roomsOfUser[0];

        throw `User is not in (only one) room. actual amount: ${roomsOfUser.length}`
    }

    async function createGroup(pin) {
        try {
            // if (await mongoAddNew(pin, socket)) {
            // userSocket.join(pin)


            // return true
            // } else {
            //     return false
            // }
            socket.leaveAll()
            socket.join(pin)

            const newGroup = {
                pin: pin,
                users: [{
                    id: socket.id,
                    userName: socket.userName
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

    function joinGroup(pin) {
        try {
            socket.leaveAll()
            socket.join(pin)

            groups.find(group => group.pin === pin).users.push({
                id: socket.id,
                userName: socket.userName
            })

            updateClientUsers(pin);

            return true
        } catch (e) {
            console.log("Something went wrong in createGroup()", e)
            return false
        }
    }

    function registerVoteYes(trackId) {
        const roomPin = getRoomOfUser();

        if (canUserVote(trackId)) {
            groups.find(group => group.pin === roomPin)
                .tracks.find(track => track.track.id === trackId)
                .votedYes.push(socket.id);

            updateTrackState(trackId)

            console.log("vote registered!")
            return true;
        }
    }

    function registerVoteNo(trackId) {
        const roomPin = getRoomOfUser();

        if (canUserVote(trackId)) {
            groups.find(group => group.pin === roomPin)
                .tracks.find(track => track.track.id === trackId)
                .votedNo.push(socket.id);

            updateTrackState(trackId)

            console.log("vote registered!")
            return true;
        }
    }

    function canUserVote(trackId) {
        const trackData = getTrackData();

        const track = trackData.find(track => track.track.id === trackId);

        if (!track)
            throw "Track is not in group";

        const allVotesYes = track.votedYes;
        const allVotesNo = track.votedNo;

        console.log("allVotesYes", allVotesYes)
        console.log("allVotesNo", allVotesNo)

        if (allVotesYes.includes(socket.id) || allVotesNo.includes(socket.id))
            throw "User already voted for this song";

        return true
    }

    function updateTrackState(trackId) {
        const roomPin = getRoomOfUser();
        const trackData = getTrackData();

        // How much percent of votes for it to be accepted. 0.5 = 50%
        const voteThresholdYes = 50;
        // How much percent of votes for it to be rejected. 0.5 = 50%
        const voteThresholdNo = 50;

        const track = trackData.find(track => track.track.id === trackId);

        if (!track)
            throw "Track is not in group";

        const allVotesYes = track.votedYes.length;
        const allVotesNo = track.votedNo.length;

        const allVotes = groups.find(group => group.pin === roomPin).users.length

        console.log("percent yes: ", (allVotesYes / allVotes * 100))
        console.log("percent no: ", (allVotesNo / allVotes * 100))
        console.log("total votes given: ", (allVotesYes + allVotesNo))
        console.log("total votes: ", allVotes)

        // If more than half voted yes, add to playlist.
        if ((allVotesYes / allVotes * 100) > voteThresholdYes) {
            console.log("Track accepted")
            groups.find(group => group.pin === roomPin)
                .tracks.find(track => track.track.id === trackId)
                .state = 'accepted';
        }
        // If more than half voted no, don't add to playlist. Also remove when votes amount are equal
        else if ((allVotesNo / allVotes * 100) > voteThresholdNo || (allVotesYes + allVotesNo) === allVotes) {
            console.log("Track rejected")
            groups.find(group => group.pin === roomPin)
                .tracks.find(track => track.track.id === trackId)
                .state = 'rejected';
        }
    }

    function updatePlaylistOfGroup(roomPin = getRoomOfUser()) {
        const playlist = getTracksOfGroup(roomPin);

        if (Array.isArray(playlist)) {
            // broadcast playlist to room
            socketIo.to(roomPin).emit('update playlist', playlist);
        } else {
            console.log("empty playlist returned in updatePlaylistOfGroup()")
        }
    }

    async function mongoAddNew(pin) {
        if (!checkDBConnection())
            throw "NOOOO!"

        const newGroup = {
            pin: pin,
            users: [{
                id: socket.id,
                userName: socket.userName
            }],
            tracks: []
        }

        console.log("______________")

        mongoDBClient.insertOne(newGroup, insert)

        function insert(err, res) {
            if (err) throw err;
            console.log("1 document inserted");

            return true
        }

        return insert
    }
});

async function checkDBConnection() {
    if (mongoDBClient)
        return mongoDBClient

    await client.connect(function (err, db) {
        if (err) throw err;

        mongoDBClient = db.db("PlaylistMakerDB").collection("PlaylistGroups")

        console.log("success connect!")

        return mongoDBClient
    });

    return undefined
}

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

function leaveGroup(pin, userSocketId) {
    try {
        // Find the index of the group in the groupslist where the user was in
        const indexOfGroup = groups.findIndex(group => group.pin === pin)

        if (indexOfGroup === -1)
            throw "User is in no groups"

        // Find the index of the user in the userlist
        const indexOfUserInUserList = groups[indexOfGroup].users.findIndex(user => user.id === userSocketId)
        console.log("indexOfUserInUserList", indexOfUserInUserList)

        // Remove the disconnecting user from the group's list of users he/she was in
        groups[indexOfGroup].users.splice(indexOfUserInUserList, 1)

        // removeVotes(pin, userSocketId)

        updateClientUsers(pin)
    } catch (e) {
        console.log("Couldnt leave the group", e)
    }
}


// function removeVotes(pin, userSocketId) {
//     const allTracks = groups.find(group => group.pin === pin).tracks;
//
//     for (let i = 0; i < allTracks.length; i++) {
//         const voteYesIndex = allTracks[i].votedYes.findIndex(id => id === userSocketId);
//         const voteNoIndex = allTracks[i].votedNo.findIndex(id => id === userSocketId);
//
//         if (voteYesIndex) {
//             console.log("voteYesIndex splice", groups.find(group => group.pin === pin).tracks[i].votedYes)
//             groups.find(group => group.pin === pin).tracks[i].votedYes.splice(voteYesIndex, 1)
//             console.log("voteYesIndex after", groups.find(group => group.pin === pin).tracks[i].votedYes)
//
//         }
//         if (voteNoIndex) {
//             console.log("voteNoIndex splice", groups.find(group => group.pin === pin).tracks[i].votedNo)
//             groups.find(group => group.pin === pin).tracks[i].votedNo.splice(voteNoIndex, 1)
//             console.log("voteNoIndex after", groups.find(group => group.pin === pin).tracks[i].votedNo)
//         }
//     }
// }

function updateClientUsers(pin) {
    const allUsersInGroups = groups.find(group => group.pin === pin).users;

    console.log("allUsersInGroups", allUsersInGroups)

    const allUserNames = [];
    allUsersInGroups.forEach(group => allUserNames.push(group.userName))

    console.log("allUserNames", allUserNames)

    // broadcast to room that a new user has joined
    socketIo.sockets.in(pin).emit('new user', allUserNames);
}


function registerVote(roomPin, userId) {

}