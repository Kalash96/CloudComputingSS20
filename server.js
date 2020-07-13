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
var io = require('socket.io')(http);

const redisAdapter = require('socket.io-redis');

const REDIS_HOST = "redis-10002.c2.eu-west-1-3.ec2.cloud.redislabs.com";
const REDIS_PORT = 10002;
const REDIS_PW = "0EPzzFetOEBL3sfUyoYjiZb9QT1fesNG";
const REDIS_USERNAME = "User";

io.adapter(redisAdapter(`redis://${REDIS_USERNAME}:${REDIS_PW}@${REDIS_HOST}:${REDIS_PORT}`))


var options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    requestCert: false,
    rejectUnauthorized: false
};

var server = https.createServer( options, app );
var ioHttps = require('socket.io')(server);


const port = process.env.PORT || 3000;

const users = {}
const usersHttps = {}

app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/public');
app.set('view engine', 'html');

http.listen(port);

const ibmdb = require('ibm_db');
const cn = "DATABASE=BLUDB;HOSTNAME=dashdb-txn-sbox-yp-lon02-06.services.eu-gb.bluemix.net;PORT=50000;PROTOCOL=TCPIP;UID=bfg85975;PWD=fc7kwr7g+rb8kvcs;"

app.get("/",function(req,res) {
    res.render('login.html')
});

app.get("/signup",function(req,res) {
    res.render('signup.html')
});

// implement the Content Security Policy (CSP) header
app.use(function (req, res, next) {
    res.setHeader("Content-Security-Policy", "script-src 'self' http://group8chatapp-pipeline.eu-gb.mybluemix.net/");
    return next();
});

app.use(express.static(__dirname + '/'));


// implement the X-XSS-Protection header
// and force the header to be set to 1; mode = block
const xss = require('x-xss-protection')
app.use(xss({ setOnOldIE: true }))


/**
* implement the hsts header
* for 180 days the browser should visit only by HTTPS
* this protects against the man-in-the-middle attacks
*/
const hsts = require('hsts')

app.use(hsts({
  maxAge: 15552000  // 180 days in seconds
}))


//FOR TESTNG PURPOSES
app.get('/users',function (req, res){
    ibmdb.open(cn, function(err, conn) {
        if(err){
            console.log(err);
        }else {
            let query = 'SELECT * FROM User';
            conn.query(query, function (err, data) { 
                if(err) {
                    console.log(err)
                    conn.close();
                    return res.status(400).send("And Error occured");
                }
                res.send(data).end();
                conn.close();
            });  
        }
    });
});


app.post("/signup", function (req,res) {
    let username = req.query.username.trim();
    let pwd = req.query.password.trim();

    console.log(username)
    console.log(pwd)

    if(username !== '' && pwd !== '') {
        if(pwd.length < 5){
            return res.status(400).send("Error: Passwort muss mind. 5 Zeichen lang sein");
        }
        var crypto = require('crypto');
        const hash = crypto.createHash('sha256')
                   .update(pwd)
                   .digest('hex');

        ibmdb.open(cn, function(err, conn) {
            if(err){
                console.log(err);
            }else {
                let query1 = 'SELECT * FROM User WHERE username=\''+username+'\'';
                conn.query(query1, function (err, data) { 
                    if(err) {
                        conn.close();
                        console.log(err)
                    }
                    if(data.length != 0){
                        return res.status(400).send("Username already taken");
                    }else {
                        let query = 'INSERT INTO User(username, password) Values(\''+username+'\',\''+hash+'\')';
                        conn.query(query, function (err, data) { 
                            if(err) {
                                console.log(err)
                                conn.close();
                                return res.status(400).send("Username already taken");
                            }
                            res.status(200).end();
                            conn.close();
                        });  
                    }
                }); 
            }
        });

    }else {
        return res.status(400).send("Error: Username and password required");
    }
});

app.get("/chat",function(req,res) {
    res.render('chat.html')
});

app.get("/login", function (req, res) { 
    let username = req.query.username.trim();
    let pwd = req.query.password.trim();
    
    if(username !== '' && pwd !== '') {
        var crypto = require('crypto');
        const hash = crypto.createHash('sha256')
                   .update(pwd)
                   .digest('hex');
        
        ibmdb.open(cn, function(err, conn) {
            if(err){
                conn.close();
                console.log(err);
            }else {
                let query = 'SELECT * FROM User WHERE USERNAME=\''+username+'\' AND PASSWORD=\''+hash+'\'';
                conn.query(query, function (err, data) { 
                    if(err) {
                        conn.close();
                        return res.status(400).send("And Error occured");
                    }
                    if(data.length == 0) { //user does not exist
                        conn.close();
                        return res.status(401).send("Error: Wrong password");
                    }else {
                        //user exists, render the chat page
                        conn.close();
                        res.status(200).end();
                        // return res.render('chat') //NOT WORKING
                    }
                });  
            }
        });
    }else {
        return res.status(400).send("Error: Username and password required");
    }
});


server.listen(3001, function () {
    console.log('Express server listening on port ' + server.address().port);
} );



io.on('connection', socket => {

    if(users[socket.id] == null){
        socket.emit('serverId', process.env.CF_INSTANCE_GUID || 'default server');
    }

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

    if(usersHttps[socket.id] == null){
        socket.emit('serverId', process.env.CF_INSTANCE_GUID || 'default server');
    }

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
