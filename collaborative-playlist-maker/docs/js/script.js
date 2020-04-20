let socket = io();

// init();

function init() {
    hideAllContainers();
    showSelectGroup();
}

$(() => {
    $("#create-group").click(() => {
        console.log("clicked create group")

        socket = io();
        showSetNameContainer();
    });

    $("#join-group").click(() => {
        console.log("clicked join group")

        showSetNameContainer();
    });

    $("#submit-name").click(() => {
        console.log("clicked submit name")

        const name = $("#set-name-input").val().trim();
        if (name) {
            setUserName(name);
            showMainContent();
        }
    });

    $("#leave-group").click(() => {
        console.log("clicked leave group")

        leaveGroup();
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

    socket.on('song results', function (songs) {
        const songListHtml = generateSongListHtml(songs)

        appendSongsHtml(songListHtml)
    });

    function appendSongsHtml(songsHtml) {
        $('#songs-container').html(songsHtml);
    }

    function generateSongListHtml(songs) {
        let html = ""
        console.log("songs", songs)
        for (let i = 0; i < songs.length; i++) {
            const song = songs[i];

            html += `<div class="song-item">
                           <img class="song-album-cover" 
                           src=${song.album && song.album.images[0] ?
                song.album.images[(song.album.images.length - 1)].url
                : "/icons/account_box-24px.svg"}>
                            <div class="song-info-container">
                                <h4 class="song-name">${song.name || ""}</h4>
                                <div class="song-listens-container">
                                    <img class="song-listens-icon" src="/icons/group-24px.svg">
                                    <p class="song-listens">listen amount</p>
                                </div>
                            </div>
                        </div>`
        }

        console.log("html?", html)

        return html
    }

    function showSelectGroup() {
        hideAllContainers();
        $("#group-buttons-container").css("display", "flex");
    }

    function showSetNameContainer() {
        hideAllContainers();
        $("#enter-name-container").css("display", "flex");
    }

    function showMainContent() {
        hideAllContainers();
        $("#main-content-container").css("display", "flex");
    }

    function hideAllContainers() {
        $("#group-buttons-container").css("display", "none");
        $("#enter-name-container").css("display", "none");
        $("#main-content-container").css("display", "none");
    }

    function setUserName(name) {
        console.log("set username", name)
    }

    function leaveGroup() {
        console.log("leave group");
    }
});