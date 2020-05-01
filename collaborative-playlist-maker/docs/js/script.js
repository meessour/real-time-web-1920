$(() => {
    let socket = io();

    init();

    function init() {
        showSetNameContainer();
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
        if (input && input.trim() && navigator.onLine) {
            console.log("emit song query")

            socket.emit('search song', input);
        } else {
            console.log("input was empty")

            // Clear search results list
            appendSongsHtml("")
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
            // If the user is not connected
            if (!socket.connected) {
                console.log("user reconnected!")
                socket.connect();
            }

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

    // On track results response
    socket.on('track results', function (songs) {
        const songListHtml = generateSongListHtml(songs)

        appendSongsHtml(songListHtml)
    });

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

    function appendSongsHtml(songsHtml) {
        document.getElementById("songs-container").innerHTML = songsHtml
    }

    function generateSongListHtml(songs) {
        let html = "";
        console.log("songs", songs);
        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];

            const songName = song.name || "";
            const songAlbumCover = song.album || "/icons/account_box-24px.svg";
            const songDuration = song.duration_ms || "";

            html += `<a class="song-item">
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

    // function addSongRequest(songTitle, songAlbumCover, songDuration) {
    //     console.log("addSongRequest", songTitle, songAlbumCover, songDuration)
    // }

    let elementsArray = document.querySelectorAll("#songs-container");

    elementsArray.forEach(function (elem) {
        elem.addEventListener("click", function () {
            console.log("click", elem)
        });
    });

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