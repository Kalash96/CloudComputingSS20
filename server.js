/**Group 8
 * Lars Maronde (764420)
 * Mariam Lang (764532)
 * Patrik Keppeler (765058)
 * Mohammed Kalash (765256)
 * */

var express = require("express");
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

const users = {}

app.use(express.static(__dirname + '/public'));
app.set("views", __dirname + "/public");
app.engine("html",require("ejs").renderFile);
app.set("view engine","html");

app.get("/",function(req,res) {
    res.render(__dirname + '/index.html')
});

http.listen(3000);

io.on('connection', socket => {

    socket.on('new-user', name => {
        users[socket.id] = name
        socket.emit('connected', users)
        socket.broadcast.emit('user-connected', {username: name, userlist: users})
    })

    socket.on('send-chat-message', message => {
        socket.broadcast.emit('chat-message', {message: message, name: users[socket.id]})
    })

    socket.on('disconnect', () => {
        let name = users[socket.id]
        delete users[socket.id]
        socket.broadcast.emit('user-disconnected', {username: name, userlist: users})
        
    })

    socket.on('send-private-chat-message', (id, message) => {
        io.to(id).emit('private-chat-message', { message: message, name: users[socket.id], senderId: socket.id})
    })

    socket.on('create-group', (id, name, users) => {
        socket.join(id);
        for(let userId in users) {
            if (userId != socket.id) {
                io.to(userId).emit('new-group', { id: id, name: name, users: users })
            }
        }
    })

    socket.on('join-group', id => {
        socket.join(id);
        //maybe send a static "Joined group message here"
    })

    socket.on('send-group-message', (groupId, message) => {
        socket.broadcast.to(groupId).emit('group-chat-message', {message: message, groupId:groupId, name: users[socket.id]});
    })

    socket.on('leave-group', id => {
        socket.leave(id);
        socket.broadcast.to(id).emit('user-left-group', { groupId: id, name: users[socket.id] });
    })
})

