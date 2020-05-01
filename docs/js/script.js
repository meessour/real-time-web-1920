$(() => {
    let socket = io();

    init();
    // initDev();

    function init() {
        showSetNameContainer();
    }

    function initDev() {
        socket.emit('set username', "temp", (response) => {
            console.log("temp name set,", response)
        });
    }

    $("#create-group").click(() => {
        console.log("clicked create group")

        createNewRoom();
    });

    $("#join-group").click(() => {
        console.log("clicked join group")

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
        showSetNameContainer();
    });

    // Search for song via search input field
    $("#search-song-input").on("input", function () {
        const input = $("#search-song-input").val();

        // Check if input is not empty and user is online
        if (input && input.trim()) {
            searchTracks(input)
        } else {
            console.log("input was empty")

            document.getElementById("search-song-input").classList.remove('error-border')
            // Clear search results list
            changeInnerHTML(document.getElementById("songs-container"))
        }
    });

    $("#back-button-set-username").on("click", function () {
        showSetNameContainer();
    });

    $("#back-button-select-group").on("click", function () {
        showSelectGroup();
    });

    function setUserName(name) {
        if (name) {
            checkIfSocketConnected();

            console.log("set username", name);
            socket.emit('set username', name, (response) => {
                console.log("response", response);

                if (response) {
                    document.getElementById("set-name-input").value = ''
                    document.getElementById("set-name-input").classList.remove('error-border')
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
                    console.log('response', response);

                    // The response is the pin
                    if (response) {
                        document.getElementById("set-pin-input").value = ''
                        document.getElementById("set-pin-input").classList.remove('error-border')

                        document.getElementById("group-id-text").innerHTML = `Group Pin: <b>${response}</b>`

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
        socket.emit('search song', input, (response) => {
            // The response are the songs as object
            console.log("response", response);

            if (response) {
                document.getElementById("search-song-input").classList.remove('error-border');

                // Generate the HTML used to show the list
                const songListHtml = generateSongListHtml(response, true);

                changeInnerHTML(document.getElementById("songs-container"), songListHtml);
                setSongItemsListeners();
            } else {
                document.getElementById("search-song-input").classList.add('error-border');

                // Clear search results list
                changeInnerHTML(document.getElementById("songs-container"));
            }
        });
    }

    // On user entering room
    socket.on('new user', function (userNameList) {
        console.log("New user", userNameList)

        if (Array.isArray(userNameList) && userNameList.length) {
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

    function generateSongListHtml(songs, isSearchResult, previousHtml = '') {
        let html = previousHtml;
        console.log("songs", songs);
        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];

            const songId = song.id || undefined;
            const songName = song.name || "";
            const songAlbumCover = song.album || "/icons/account_box-24px.svg";
            const songDuration = song.duration_ms || "";

            html += `<a id="${songId}" class="song-item">
                           <img class="song-album-cover" 
                           src=${songAlbumCover}>
                            <div class="song-info-container">
                                <h4 class="song-name">${songName}</h4>
                                <div class="song-listens-container">
                                    <img class="song-listens-icon" src="/icons/watch_later-black.svg">
                                    <p class="song-listens">${songDuration}</p>
                                </div>
                            </div>
                        </a>`
        }

        return html
    }

    function setSongItemsListeners() {
        // Sets an event listener for every track item in the search result container
        document.getElementById("songs-container").querySelectorAll(".song-item").forEach(function (element) {
            element.addEventListener("click", function () {
                // Check if the element has an id
                if (element && element.id) {
                    requestSongAdd(element.id)
                }
            });
        });
    }

    function requestSongAdd(trackId) {
        trackId = trackId.toString()

        console.log("Request song add", trackId)
        socket.emit('add song request', trackId, (response) => {
            if (response) {
                console.log("Request succesful added!")
                const currentPlaylistHTML = getCurrentPlaylistHTML();
                const playlistSongsHtml = generateSongListHtml(response, false, currentPlaylistHTML)
                changeInnerHTML(document.getElementById("playlist-container"), playlistSongsHtml)
            } else {
                console.log("Something went wrong in requestSongAdd()")
            }
        });
    }

    function getCurrentPlaylistHTML() {
        return document.getElementById("playlist-container").innerHTML
    }

    function showSelectGroup() {
        hideAllContainers();
        $("#group-buttons-container").css("display", "block");
    }

    function showSetPinContainer() {
        hideAllContainers();
        $("#enter-pin-container").css("display", "block");
    }

    function showSetNameContainer() {
        hideAllContainers();
        $("#enter-name-container").css("display", "block");
    }

    function showMainContent() {
        hideAllContainers();
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