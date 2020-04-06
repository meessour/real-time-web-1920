const socket = io();
let username;

$(() => {
    $("#set_username").click(() => {
        const usernameInput = $("#username").val().trim()
        if (usernameInput.length) {
            console.log("ja boy", usernameInput);

            username = usernameInput;

            $(".username-input-container").css("display", "none");
            $(".chat-main-wrapper").css("visibility", "visible");
        }

    });
    $("#send").click(() => {
        const messageContent = $("#message").val().trim();

        if (messageContent && username) {
            $("#message").val("");
            const message = {name: username, message: messageContent};
            postMessage(message)
        }
    });
    getMessages()
});

socket.on('message', addMessage)

function addMessage(message) {
    const html = `
    <div class="message">
        <h4 class="message-name">${message.name}:</h4> 
        <p class="message-message">${message.message}</p>
    </div>
        `;

    $("#messages-container").append(html)
}

function getMessages() {
    $.get(window.location.origin + "/messages", (data) => {
        console.log("load hem boy", data)

        data.forEach(addMessage);
    })
}

function postMessage(message) {
    $.post(window.location.origin + "/message", message)
}