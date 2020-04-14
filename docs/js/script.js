const socket = io();

$(() => {
    $("#set_username").click(() => {
        const usernameInput = $("#username").val().trim();
        if (usernameInput) {
            setUserName(usernameInput);
        }
    });

    $("#send").click(() => {
        const message = $("#message").val().trim();

        if (message) {
            sendMessage(message)
        }
    });

    socket.on('user message', function (message) {
        const html = `
    <div class="message">
        <p class="chat-message">${message}</p>
    </div>
        `;

        $("#messages-container").append(html)
    });

    socket.on('server message', function (message) {
        const html = `
    <div class="message">
        <p class="server-message">${message}</p>
    </div>
        `;

        $("#messages-container").append(html)
    });

    function setUserName(userName) {
        socket.emit('set username', userName);

        $(".username-input-container").css("display", "none");
        $(".chat-main-wrapper").css("visibility", "visible");
    }

    function sendMessage(message) {
        socket.emit('user message', message);

        $("#message").val("");
    }
});