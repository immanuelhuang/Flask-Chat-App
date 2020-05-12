
// Initializes Websocket
var socket = io();

document.addEventListener("DOMContentLoaded", () => {
    // Adds user to active users again when refreshed
    const newRequest = new XMLHttpRequest();
    newRequest.open("POST", "/active_users");
    const data = new FormData();
    data.append("username", sessionStorage.getItem("username"));
    newRequest.send(data);

    // Loads in channels
    const channelRequest = new XMLHttpRequest();
    channelRequest.open("GET", "/channels");
    channelRequest.onload = function() {
        loadChannels(this.responseText);
        document.querySelectorAll(".table-row").forEach(row => {
            row.onclick = function() {
                if (sessionStorage.getItem("active_channel") != null) {
                    const activeChannel = sessionStorage.getItem("active_channel");
                    document.getElementById(activeChannel).classList.remove("table-active");
                }
                this.classList.add("table-active");
                sessionStorage.setItem("active_channel", this.id);
                const userRequest = new XMLHttpRequest();
                userRequest.open("POST", "/user_channels")
                const data = new FormData();
                data.append("username", sessionStorage.getItem("username"));
                data.append("active_channel", sessionStorage.getItem("active_channel"));
                userRequest.send(data);
                const messageRequest = new XMLHttpRequest();
                messageRequest.open("GET", "/message_load");
                messageRequest.onload =  function() {
                    const messages = JSON.parse(this.responseText);
                    loadMessages(JSON.stringify(messages[sessionStorage.getItem("active_channel")]));
                }
                messageRequest.send();
            };
        });
    };
    channelRequest.send()
    
    // Remembers users last channel opened and outputs messages
    const request = new XMLHttpRequest();
    request.open("GET", "/user_channels");
    request.onload = function() {
        const data = JSON.parse(request.responseText);
        const username = sessionStorage.getItem("username");
        if (data[username] != "") {
            document.getElementById(data[username]).classList.add("table-active");
            sessionStorage.setItem("active_channel", data[username]);
        }
        // Loads messages
        if (sessionStorage.getItem("active_channel") != null) {
            const messageRequest = new XMLHttpRequest();
            messageRequest.open("GET", "/message_load");
            messageRequest.onload =  function() {
                const messages = JSON.parse(this.responseText);
                loadMessages(JSON.stringify(messages[sessionStorage.getItem("active_channel")]));
            }
            messageRequest.send();
        } 
    };
    request.send();

    

    // Not letting user submit blank channel
    document.getElementById("message-submit").disabled = true;
    document.getElementById("message-input").onkeyup = function() {
        if (this.value.length > 0) {
            document.getElementById("message-submit").disabled = false;
        } else {
            document.getElementById("message-submit").disabled = true;
        }
    };
    
    // Not letting user submit blank message
    document.getElementById("channel-submit").disabled = true;
    document.getElementById("channel-input").onkeyup = function() {
        if (this.value.length > 0) {
            document.getElementById("channel-submit").disabled = false;
        } else {
            document.getElementById("channel-submit").disabled = true;
        }
    };

    // Outputs the username
    document.getElementById("username-display").innerHTML = sessionStorage.getItem("username");

    socket.on('connect', function() {
        // User submits a channel
        document.getElementById("channel-form").onsubmit = () => {
            const channelName = document.getElementById("channel-input").value;
            document.getElementById("channel-input").value = "";
            if (channelExists(channelName)) {
                alert("Channel Already Exists");
            } else {
                socket.emit("channel send", {channelName: channelName});
            }
            return false;
        };
        
        // User submits a message
        document.getElementById("message-form").onsubmit = () => {
            if (sessionStorage.getItem("active_channel") == null) {
                alert("Please select a channel!")
            } else {
                const channel = sessionStorage.getItem("active_channel");
                const content = document.getElementById("message-input").value;
                const name = sessionStorage.getItem("username");
                const d = new Date();
                let hour = zeroFill(d.getHours(), 2);
                let minute = zeroFill(d.getMinutes(), 2);
                const timestamp = `${hour}:${minute}`;
                socket.emit('message send', {channel: channel, content: content, name: name, timestamp: timestamp});
            }
            document.getElementById("message-input").value = "";
            return false;
        };
    });

    // Created channel is broadcasted
    socket.on("channel receive", data => {
        loadChannels(data.channels);
        document.querySelectorAll(".table-row").forEach(row => {
            row.onclick = function() {
                if (sessionStorage.getItem("active_channel") != null) {
                    const activeChannel = sessionStorage.getItem("active_channel");
                    document.getElementById(activeChannel).classList.remove("table-active");
                }
                this.classList.add("table-active");
                sessionStorage.setItem("active_channel", this.id);
                const userRequest = new XMLHttpRequest();
                userRequest.open("POST", "/user_channels")
                const data = new FormData();
                data.append("username", sessionStorage.getItem("username"));
                data.append("active_channel", sessionStorage.getItem("active_channel"));
                userRequest.send(data);
                const messageRequest = new XMLHttpRequest();
                messageRequest.open("GET", "/message_load");
                messageRequest.onload =  function() {
                    const messages = JSON.parse(this.responseText);
                    loadMessages(JSON.stringify(messages[sessionStorage.getItem("active_channel")]));
                }
                messageRequest.send();
            };
        });
    });
    
    // Sent message is broadcasted
    socket.on('message receive', data => {
        if (sessionStorage.getItem("active_channel") === data.channel) {
            loadMessages(data.messages);
        }   
    }); 
});

// Removes user from active users when tab is closed
function exit() {
    const exitRequest = new XMLHttpRequest();
    exitRequest.open("POST", "/user_exit")
    const data = new FormData();
    data.append("username", sessionStorage.getItem("username"));
    exitRequest.send(data);
}

// Loads channels
function loadChannels(channels) {
    channels = JSON.parse(channels);
    document.getElementById("channel-display").innerHTML = "";
    for (let key in channels) {
        var source = document.getElementById("channel-template").innerHTML;
        var template = Handlebars.compile(source);
        var context = {name: key};
        var html = template(context);
        document.getElementById("channel-display").innerHTML += html;
    }
    if (sessionStorage.getItem("active_channel") != null) {
        document.getElementById(sessionStorage.getItem("active_channel")).classList.add("table-active");
    }
}

// Returns false is channel already exists, else return false
function channelExists(name) {
    doesExist = false
    document.querySelectorAll(".table-row").forEach(row => {
        if (row.id === name) {
            doesExist = true;
        }
    });
    return doesExist;
}

// Loads messages
function loadMessages(messages) {
    messages = JSON.parse(messages);
    document.getElementById("message-display").innerHTML = "";
    messages.forEach(message => {
        if (sessionStorage.getItem("username") === message.name) {
            var source = document.getElementById("message-user-template").innerHTML;
        } else {
            var source = document.getElementById("message-other-template").innerHTML;
        }
        var template = Handlebars.compile(source);
        var context = {content: message.content, name: message.name, timestamp: message.timestamp};
        var html = template(context);
        document.getElementById("message-display").innerHTML += html;
        updateScroll();
    });
    let message_index = 0;
    document.querySelectorAll(".message").forEach(message => {
        message.dataset.index = message_index;
        message_index++;
    });
    document.querySelectorAll(".message").forEach(message => {
        message.onclick = function() {
            if (message.dataset.name === sessionStorage.getItem("username")) {
                if (window.confirm("Are you sure you want to delete this message?")) {
                    socket.emit("message delete", {index: this.dataset.index, channel: sessionStorage.getItem("active_channel")});
                }
            }
        }
    });
}

// Fills with leading zeros for the date
function zeroFill( number, width )
{
  width -= number.toString().length;
  if ( width > 0 )
  {
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number + ""; 
}

// Causes messages to stay scrolled to the bottom
function updateScroll() {
    const out = document.getElementById("message-scroll")
    const isScrolledToBottom = out.scrollHeight - out.clientHeight >= out.scrollTop + 1;
    if (isScrolledToBottom) {
      out.scrollTop = out.scrollHeight - out.clientHeight;
    }
}