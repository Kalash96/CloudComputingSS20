/**Group 8
 * Lars Maronde (764420)
 * Mariam Lang (764532)
 * Patrik Keppeler (765058)
 * Mohammed Kalash (765256)
 * */

var express = require("express");
var app = express();
var http = require('http').createServer(app);

var https = require('https');
var fs = require('fs');

var options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    requestCert: false,
    rejectUnauthorized: false
};
var server = https.createServer( options, app );

var io = require('socket.io')(http);
var ioHttps = require('socket.io')(server);
let port = process.env.PORT || 3000;

const users = {}
const usersHttps = {}

app.use(express.static(__dirname + '/public'));
app.set("views", __dirname + "/public");
app.engine("html",require("ejs").renderFile);
app.set("view engine","html");

app.get("/",function(req,res) {
    res.render(__dirname + '/index.html')
});


server.listen(3001, function () {
    console.log('Express server listening on port ' + server.address().port);
} );

const ibmdb = require('ibm_db');
const cn = "DATABASE=BLUDB;HOSTNAME=dashdb-txn-sbox-yp-lon02-06.services.eu-gb.bluemix.net;PORT=50000;PROTOCOL=TCPIP;UID=bfg85975;PWD=fc7kwr7g+rb8kvcs;"

app.get('/db', (req, res) => {
    ibmdb.open(cn, function(err, conn){
        if(err){
            console.log(err);
        }else {
            conn.query('SELECT * FROM User;', function (err, data) { 
                if(err) {
                    console.log(err)
                }
                console.log(data);
            });  
        }
    });
    res.end("...")
});


http.listen(port);

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
        socket.broadcast.to(groupId).emit('group-chat-message', { message: message, groupId: groupId, name: users[socket.id]});
    })

    socket.on('leave-group', id => {
        socket.leave(id);
        socket.broadcast.to(id).emit('user-left-group', { groupId: id, name: users[socket.id] });
    })
})


ioHttps.on('connection', socket => {

    socket.on('new-user', name => {
        usersHttps[socket.id] = name
        socket.emit('connected', usersHttps)
        socket.broadcast.emit('user-connected', { username: name, userlist: usersHttps })
    })

    socket.on('send-chat-message', message => {
        socket.broadcast.emit('chat-message', { message: message, name: usersHttps[socket.id] })
    })

    socket.on('disconnect', () => {
        let name = usersHttps[socket.id]
        delete usersHttps[socket.id]
        socket.broadcast.emit('user-disconnected', { username: name, userlist: usersHttps })

    })

    socket.on('send-private-chat-message', (id, message) => {
        ioHttps.to(id).emit('private-chat-message', { message: message, name: usersHttps[socket.id], senderId: socket.id })
    })

    socket.on('create-group', (id, name, httpsUsers) => {
        socket.join(id);
        for (let userId in httpsUsers) {
            if (userId != socket.id) {
                ioHttps.to(userId).emit('new-group', { id: id, name: name, users: httpsUsers })
            }
        }
    })

    socket.on('join-group', id => {
        socket.join(id);
        //maybe send a static "Joined group message here"
    })

    socket.on('send-group-message', (groupId, message) => {
        socket.broadcast.to(groupId).emit('group-chat-message', { message: message, groupId: groupId, name: usersHttps[socket.id] });
    })

    socket.on('leave-group', id => {
        socket.leave(id);
        socket.broadcast.to(id).emit('user-left-group', { groupId: id, name: usersHttps[socket.id] });
    })
})
