var io = require('socket.io')(3000)
const users = {}

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
        console.log(id + " " + message)
        io.to(id).emit('private-chat-message', {message: message, name: users[socket.id]})
    })

    socket.on('create-group', (id, name, users) => {
        socket.join(id);
        for(let userId in users) {
            if(userId != socket.id){
                io.to(userId).emit('new-group', {id: id, name: name})
            }
        }
    })

    socket.on('join-group', id => {
        socket.join(id);
        //maybe send a "Joined group message here"
    })

    socket.on('send-group-message', (groupId, message) => {
        io.to(groupId).emit('group-chat-message', {message: message, name: users[socket.id]});
    })
})

