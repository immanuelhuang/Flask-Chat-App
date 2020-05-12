import os

from flask import Flask, render_template, jsonify, request, redirect, url_for
from flask_socketio import SocketIO, emit

import json

app = Flask(__name__)
socketio = SocketIO(app)

# Channels dictionary --> messages list
channels = {}
# Users dictionary --> last active channel
users = {}
# Current active users list
active_users = []

# Login page
@app.route("/")
def login():
    return render_template("login.html")

# Main page
@app.route("/messages")
def index():
    socketio.emit("channel receive", {"channels": json.dumps(channels)}, broadcast=True)
    return render_template("index.html")

# Loads channels
@app.route("/channels")
def channels_load():
    return json.dumps(channels)

# Keeps track of users' last chat room
@app.route("/user_channels", methods=["GET", "POST"])
def user_channels():
    if request.method == "POST":
        username = request.form.get("username")
        active_channel = request.form.get("active_channel")
        users[username] = active_channel
        return "Success"
    else:
        return jsonify(users)

# Keeps track active users
@app.route("/active_users", methods=["POST"])
def users_active():
    username = request.form.get("username")
    if username in active_users:
        return jsonify({"success": False})
    else:
        if username not in users:
            users[username] = ""
        active_users.append(username)
        return jsonify({"success": True})
    
# Returns messages
@app.route("/message_load")
def message_load():
    return jsonify(channels)

# Removes user from active users when tab closes
@app.route("/user_exit", methods=["POST"])
def user_exit():
    username = request.form.get("username")
    active_users.remove(username)
    return "Success"

# Receiving a message
@socketio.on("message send")
def handle_message(data):
    channel = data["channel"]
    name = data["name"]
    content = data["content"]
    timestamp = data["timestamp"]
    channels[channel].append({"name": name, "content": content, "timestamp": timestamp})
    if (len(channels[channel]) > 100):
        channels[channel].pop(0)
    emit("message receive", {"channel": channel, "messages": json.dumps(channels[channel])}, broadcast=True)

# Receiving a channel
@socketio.on("channel send")
def handle_channel(data):
    channelName = data["channelName"]
    channels[channelName] = []
    emit("channel receive", {"channels": json.dumps(channels)}, broadcast=True)

# Receiving a messsage deletion
@socketio.on("message delete")
def handle_delete(data):
    channel = data["channel"]
    index = int(data["index"])
    channels[channel].pop(index)
    emit("message receive", {"channel": channel, "messages": json.dumps(channels[channel])}, broadcast=True)