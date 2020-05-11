$(() => {
    let socket = io();

    // Keeps track of how many people are in the group
    let allUsersInGroup;

    // initDev();

    function initDev() {
        showSetNameContainer();
        showSetPinContainer();
        showSelectGroup();
        showMainContent();

        socket.emit('set username', "anonymous", (response) => {
            console.log("temp name set,", response)
        });
    }

    $("#create-group").click(() => {
        console.log("clicked create group")

        createNewRoom();
    });

    $("#join-group").click(() => {
        console.log("clicked join group")

        hideAllContainers();
        showSetPinContainer();
    });

    $("#submit-pin").click(() => {
        console.log("clicked submit pin")

        // Get the pin the user gave in the input field
        let roomPin = $("#set-pin-input").val().trim().toString();
        if (roomPin) {
            joinRoom(roomPin);
        } else {
            // If no name is put in the input
            document.getElementById("set-pin-input").classList.add('error-border')
        }
    });

    $("#submit-name").click(() => {
        console.log("clicked submit name")

        const name = $("#set-name-input").val().trim();
        if (name) {
            setUserName(name);
        } else {
            // If no name is put in the input
            document.getElementById("set-name-input").classList.add('error-border')
        }
    });

    $("#leave-group").click(() => {
        console.log("clicked leave group")

        leaveGroup();

        hideAllContainers();
        showSetNameContainer();
    });

    // Search for track via search input field
    $("#search-track-input").on("input", function () {
        const input = $("#search-track-input").val();

        console.log("Search song:", input)

        // Check if input is not empty and user is online
        if (input && input.trim()) {
            searchTracks(input)
        } else {
            console.log("input was empty")

            document.getElementById("search-track-input").classList.remove('error-border')
            // Clear search results list
            changeInnerHTML(document.getElementById("tracks-container"))
        }
    });

    $("#back-button-set-username").on("click", function () {
        hideAllContainers();
        showSetNameContainer();
    });

    $("#back-button-select-group").on("click", function () {
        hideAllContainers();
        showSelectGroup();
    });

    function setUserName(name) {
        if (name) {
            checkIfSocketConnected();

            console.log("set username", name);
            socket.emit('set username', name, (response) => {
                console.log("response setUserName", response);

                if (response) {
                    document.getElementById("set-name-input").value = ''
                    document.getElementById("set-name-input").classList.remove('error-border')

                    hideAllContainers();
                    showSelectGroup();
                } else {
                    document.getElementById("set-name-input").classList.add('error-border')
                }
            });
        }
    }

    function createNewRoom() {
        try {
            checkIfSocketConnected();
            socket.emit('create room', (response) => {
                // The response is the pin
                if (response) {
                    console.log('pin', response);

                    document.getElementById("group-id-text").innerHTML = `Group Pin: <b>${response}</b>`
                    setTracks([])
                    changeInnerHTML(document.getElementById("tracks-container"))

                    hideAllContainers();
                    showMainContent();
                } else {
                    console.log("Couldn't set pin")
                }
            });
        } catch (e) {
            console.log("something went wrong", e)
        }
    }

    function joinRoom(roomPin) {
        try {
            if (roomPin) {
                checkIfSocketConnected();
                console.log("pin emit", roomPin)
                socket.emit('join room', roomPin, (response) => {
                    console.log('response joinRoom', response);
                    const pin = response.roomPin
                    const tracks = response.tracks

                    if (pin) {
                        if (tracks && Array.isArray(tracks) && tracks.length)
                            setTracks(tracks)

                        setPin(pin);
                        changeInnerHTML(document.getElementById("tracks-container"));

                        hideAllContainers();
                        showMainContent();
                    } else {
                        document.getElementById("set-pin-input").classList.add('error-border')
                    }
                });
            }
        } catch (e) {
            console.log("something went wrong", e)
        }
    }

    function setPin(pin) {
        document.getElementById("set-pin-input").value = ''
        document.getElementById("set-pin-input").classList.remove('error-border')

        document.getElementById("group-id-text").innerHTML = `Group Pin: <b>${pin}</b>`
    }

    function setTracks(tracks) {
        // Remove old items from playlist
        changeInnerHTML(document.getElementById("playlist-container"))

        for (const track of tracks) {
            const playlistTrackHtml = generatePlaylistTrackHtml(track);

            appendHtmlToElement(document.getElementById("playlist-container"), playlistTrackHtml)

            if (track.state === 'pending')
                setVoteButtonsListeners(track.track.id)
        }
    }

    // Checks if the socket is connected
    function checkIfSocketConnected() {
        // If the user is not connected
        if (!socket.connected) {
            socket.connect();

            console.log("User reconnected")
        }
    }

    function searchTracks(input) {
        checkIfSocketConnected();
        socket.emit('search track', input, (response) => {
            // The response are the tracks as object
            console.log("response", response);

            if (response) {
                document.getElementById("search-track-input").classList.remove('error-border');

                // Generate the HTML used to show the list
                const trackListHtml = generateTrackListHtml(response);

                changeInnerHTML(document.getElementById("tracks-container"), trackListHtml);
                setTrackItemsListeners();
            } else {
                document.getElementById("search-track-input").classList.add('error-border');

                // Clear search results list
                changeInnerHTML(document.getElementById("tracks-container"));
            }
        });
    }

    // On user entering room
    socket.on('new user', function (userNameList) {
        console.log("New user", userNameList)

        if (Array.isArray(userNameList) && userNameList.length) {
            // Sets all the users in the group
            allUsersInGroup = userNameList

            let peopleListHTML = '';

            userNameList.forEach(userName =>
                peopleListHTML = peopleListHTML + `<p class="person">${userName}</p>`
            )

            document.getElementById("people-list-container").innerHTML = peopleListHTML;
        }
    });

    function changeInnerHTML(element, html = '') {
        element.innerHTML = html
    }

    function appendHtmlToElement(element, html = '') {
        element.insertAdjacentHTML('beforeEnd', html);
    }

    function generateTrackListHtml(tracks, previousHtml = '') {
        let html = previousHtml;
        console.log("tracks", tracks);
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];

            const trackId = track.id || undefined;
            const trackName = track.name || "";
            const trackAlbumCover = track.album || "/icons/account_box-24px.svg";
            const trackDuration = track.duration_ms || "";

            html += `<a id="${trackId}" class="track-item">
                           <img class="track-album-cover" 
                           src=${trackAlbumCover}>
                            <div class="track-info-container">
                                <h4 class="track-name">${trackName}</h4>
                                <div class="track-listens-container">
                                    <img class="track-listens-icon" src="/icons/watch_later-black.svg">
                                    <p class="track-listens">${trackDuration}</p>
                                </div>
                            </div>
                        </a>`
        }

        return html
    }

    function generatePlaylistTrackHtml(track) {
        const trackDetails = track.track;

        console.log("track:", track)

        // General info about track
        const trackId = trackDetails.id || undefined;
        const trackName = trackDetails.name || "";
        const trackAlbumCover = trackDetails.album || "/icons/account_box-24px.svg";
        const trackDuration = trackDetails.duration_ms || "";

        // The state in which the track is in
        const trackState = track.state;

        // The amount of votes
        const trackVoteYesCount = track.votedYes.length || 0;
        const trackVoteNoCount = track.votedNo.length || 0;
        const totalVotesCast = (trackVoteYesCount + trackVoteNoCount) || 0;

        // The total amount of votes left
        const votesLeft = (allUsersInGroup.length - totalVotesCast) || 0

        // A string displayed to the user to show how many votes have been cast
        const trackVoteYesCountString = `Yes (<b>${trackVoteYesCount}</b>)`;
        const trackVoteNoCountString = `No (<b>${trackVoteNoCount}</b>)`;
        const votesLeftString = votesLeft.length === 1 ?
            `<b>${votesLeft}</b> vote left` :
            `<b>${votesLeft}</b> votes left`;

        let html = `<div id="playlist:${trackId}" class="playlist-item">
                        <img class="track-album-cover" src=${trackAlbumCover}>
                        <div class="track-info-container">
                            <h4 class="track-name">${trackName}</h4>
                            <div class="track-listens-container">
                                <img class="track-listens-icon" src="/icons/watch_later-black.svg">
                                <p class="track-listens">${trackDuration}</p>
                            </div>
                    </div>`

        // <!-- Show voting window if pending -->
        if (trackState === 'pending') {
            html += `<div class="track-state-container">
                         <div class="vote-container">
                             <a class="vote-yes">${trackVoteYesCountString}</a>
                             <a class="vote-no">${trackVoteNoCountString}</a>
                         </div>
                         <p class="total-container">${votesLeftString}</p>
                     </div>`}

        html += `</div>`
        return html
    }

    function setTrackItemsListeners() {
        // Sets an event listener for every track item in the search result container
        document.getElementById("tracks-container").querySelectorAll(".track-item").forEach(function (element) {
            element.addEventListener("click", function () {
                // Check if the element has an id
                if (element && element.id) {
                    requestTrackAdd(element.id)
                }
            });
        });
    }

    function setVoteButtonsListeners(elementId) {
        const playlistItemElement = document.getElementById('playlist:' + elementId)

        if (!playlistItemElement)
            return;

        const voteContainerElement = playlistItemElement.querySelector(".track-state-container > .vote-container")

        if (!voteContainerElement)
            return;

        voteContainerElement.querySelector(".vote-yes").addEventListener("click", function () {
            voteYesOntrack(elementId);
        });

        voteContainerElement.querySelector(".vote-no").addEventListener("click", function () {
            voteNoOntrack(elementId);
        });
    }

    function requestTrackAdd(trackId) {
        trackId = trackId.toString()

        console.log("Request track add", trackId)
        socket.emit('add track request', trackId, (response) => {
            if (response) {
                voteYesOntrack(trackId)
            }
        });
    }

    function voteYesOntrack(trackId) {
        trackId = trackId.toString()

        console.log("Vote yes", trackId)
        socket.emit('track vote yes', trackId, (response) => {
            if (response) {
                console.log("Vote registered!", response)
            } else {
                console.log("Vote (Yes) couldn't be registered")
            }
        });
    }

    function voteNoOntrack(trackId) {
        trackId = trackId.toString()

        console.log("Vote no", trackId)
        socket.emit('track vote no', trackId, (response) => {
            if (response) {
                console.log("Vote registered!", response)
            } else {
                console.log("Vote (No) couldn't be registered")
            }
        });
    }

    // On user entering room
    socket.on('update playlist', function (playlist) {
        console.log("update playlist", playlist)

        if (Array.isArray(playlist) && playlist.length) {
            setTracks(playlist)
        } else {
            console.log("something went wrong in socket.on('update playlist',", "playlist was empty")
        }
    });

    function getCurrentPlaylistHTML() {
        return document.getElementById("playlist-container").innerHTML
    }

    function showSelectGroup() {
        $("#group-buttons-container").css("display", "block");
    }

    function showSetPinContainer() {
        $("#enter-pin-container").css("display", "block");
    }

    function showSetNameContainer() {
        $("#enter-name-container").css("display", "block");
    }

    function showMainContent() {
        $("#main-content-container").css("display", "block");
    }

    function hideAllContainers() {
        $("#group-buttons-container").css("display", "none");
        $("#enter-pin-container").css("display", "none");
        $("#enter-name-container").css("display", "none");
        $("#main-content-container").css("display", "none");
    }

    function leaveGroup() {
        console.log("leave group");
        socket.disconnect();
    }
});