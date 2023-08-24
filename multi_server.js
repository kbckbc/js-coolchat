// Require the packages we will use:
const http = require("http"),
    fs = require("fs"),
    bcrypt = require("bcrypt"),
	url = require('url'),
	mime = require('mime'),
	path = require('path')
    ;

// Including crypto module
const crypto = require('crypto');
  


const port = 3456;
const file = "static/client.html";
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html, on port 3456:
const server = http.createServer(function (req, res) {
    // This callback runs when a new connection is made to our HTTP server.

	var static_filename = path.join(__dirname, "static", url.parse(req.url).pathname);

    if(req.url == '/') {
        fs.readFile(file, function (err, data) {
            // This callback runs when the client.html file has been read from the filesystem.
            if (err) return res.writeHead(500);
            res.writeHead(200);
            res.end(data);
        });
    }
    else {


	(fs.exists || path.exists)(static_filename, function(exists){
		if (exists) {
			fs.readFile(static_filename, function(err, data){
				if (err) {
					// File exists but is not readable (permissions issue?)
					res.writeHead(500, {
						"Content-Type": "text/plain"
					});
					res.write("Internal server error: could not read file");
					res.end();
					return;
				}
				
				// File exists and is readable
				var mimetype = mime.getType(static_filename);
				res.writeHead(200, {
					"Content-Type": mimetype
				});
				res.write(data);
				res.end();
				return;
			});
		}else{
			// File does not exist
			res.writeHead(404, {
				"Content-Type": "text/plain"
			});
			res.write("Requested file not found: "+static_filename);
			res.end();
			return;
		}
	});

    }

    
});
server.listen(port);

// Import Socket.IO and pass our HTTP server object to it.
const socketio = require("socket.io")(http, {
    wsEngine: 'ws'
});

// for log
const debug = false;

// hash salt(for room password)
const saltRounds = 10;

// logged users
// users = [user, user, ...]
// user = {username, socketid, token}
let users = [];

// room list
// roos = [room, room, ...]
// room = {ownername, roomname, password, joinedUsers(only username), bannedUsers(only username)}
let rooms = [];

// Attach our Socket.IO server to our HTTP server to listen
const io = socketio.listen(server);
io.sockets.on("connection", function (socket) {
    // This callback runs when a new Socket.IO connection is established.

    // check request socketId is a logged user
    // and check requestor's token
    // to prevent CSRF attack
    function checkToken(socketId, token) {
        let user = users.find((obj) => obj.socketId === socketId);
        if( user.token != token) {
            return false;
        }
        else {
            return true;
        }
    }

    ///////////////////
    // FIEO
    ///////////////////
    // Filtering input, to sanitize user input
    function regTitle(input) {
        let reg = /^[\w\d]+$/;
        return reg.test(input);
    }
    function regContent(input) {
        let reg = /^[,()!_~.?\w\d\s]+$/;
        return reg.test(input);
    }
    // Escape output
    function htmlEntities(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }


    // login request
    // login_req -> login_res, waiting_list_res, room_list_res, send_lobby_msg_res
    socket.on('login_req', function (data) {
        if(debug) console.log(`login_req: data ${JSON.stringify(data)}`);

        // input check
        if(data.username == '') return;
        if(!regTitle(data.username)) return;

        // find the same user
        ret = users.find((obj) => obj.username === data.username);

        // allow user to join a socket room
        socket.join('MainLobby');

        // if there is no user
        if(ret == undefined) {
            if(debug) console.log(`login_req: ${data.username} has joined.`);
        
            // Calling randomBytes method with callback
            crypto.randomBytes(32, (err, buf) => {
                if (err) return;
                let genToken = buf.toString('hex');
                // add the user to the array
                let user = {username:data.username, socketId:socket.id, token:genToken};
                users.push(user);

                // return joined socket id
                socket.emit('login_res', {user});
                
                // broadcast to MainLobby
                io.to('MainLobby').emit('waiting_list_res', {users});
                io.to('MainLobby').emit('room_list_res', {rooms});
                io.to('MainLobby').emit('send_lobby_msg_res', {msg:`${htmlEntities(user.username)} has entered the lobby.`});

                if(debug) console.log(`login_req: return user ${JSON.stringify(users)}`);
            });

            
        }
        // if the username is found, update the socket id in the user object
        else {
            if(debug) console.log(`login_req: the same user alerady logged in`);

            // Calling randomBytes method with callback
            crypto.randomBytes(32, (err, buf) => {
                if (err) return;
                let genToken = buf.toString('hex');

                // update socket id in a uesrs array
                const index = users.findIndex(obj => obj.username === data.username);
                if (index !== -1) {
                    users[index].socketId = socket.id;
                    users[index].token = genToken;
                }

                
                // return new socket id
                let user = {username:data.username, socketId:socket.id, token:genToken};

                socket.emit('login_res', {user});

                // only sent to the requestor
                socket.emit('waiting_list_res', {users});
                socket.emit('room_list_res', {rooms});
                socket.emit('send_lobby_msg_res', {msg:`${htmlEntities(user.username)} has entered the lobby.`});

                if(debug) console.log(`login_req: return user ${JSON.stringify(users)}`);
            });
        }
    });
        
    // logout request
    // logout_req -> logout_res, waiting_list_res, send_lobby_msg_res
    socket.on('logout_req', (data) => {
        if(debug) console.log(`logout_req:data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;

        // find the username of the requestor
        retUser = users.find((obj) => obj.socketId === data.socketId);

        // delete the user from users array
        users = users.filter((obj) => obj.socketId !== data.socketId);

        // broadcast to MainLobby
        socket.join('MainLobby');
        io.to('MainLobby').emit('waiting_list_res', {users});
        io.to('MainLobby').emit('send_lobby_msg_res', {msg:`${htmlEntities(retUser.username)} has left the lobby.`});

        socket.emit('logout_res');
        socket.leaveAll();
        
        if(debug) console.log(`logout_req: return users ${JSON.stringify(users)}, ${JSON.stringify(rooms)}`);
    });    

    // waiting list request
    // waiting_list_req -> waiting_list_res
    socket.on('waiting_list_req', (data) => {
        if(debug) console.log(`waiting_list_req: data ${JSON.stringify(data)}`);
        
        if(!!checkToken(data.socketId, data.token)) return;
        
        socket.emit('waiting_list_res', {users});
        if(debug) console.log(`waiting_list_req: return users ${JSON.stringify(users)}`);
    });

    // room list request
    // room_list_req -> room_list_res
    socket.on('room_list_req', (data) => {
        if(debug) console.log(`room_list_req: data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;

        socket.emit('room_list_res', {rooms});
        if(debug) console.log(`room_list_req: return rooms ${JSON.stringify(rooms)}`);
    });    
    
    // room create request
    // create_room_req -> create_room_res
    socket.on('create_room_req', (data) => {
        if(debug) console.log(`create_room_req: data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;
        if(data.roomname == '') return;
        if(!regTitle(data.msg)) return;

        retUser = users.find((obj) => obj.socketId === data.socketId);
        retRoom = rooms.find((obj) => obj.roomname === data.roomname);
        if(retRoom == undefined) {
            hashedPassword = '';
            // get a salted hash password
            if( data.password != '') {
                bcrypt.hash(data.password, saltRounds, function(err, hash) {
                    hashedPassword = hash;

                    // create a room
                    rooms.push({ownername:retUser.username, roomname:data.roomname, password:hashedPassword, joinedUsers:[], bannedUsers:[]});
                    
                    // broadcast to MainLobby
                    socket.join("MainLobby");
                    io.to('MainLobby').emit('create_room_res', {rooms});
                    
                    if(debug) console.log(`create_room_res: succ, rooms, ${JSON.stringify(rooms)}`);
                });
            }
            else {
                // create a room
                rooms.push({ownername:retUser.username, roomname:data.roomname, password:hashedPassword, joinedUsers:[], bannedUsers:[]});
                
                // broadcast to MainLobby
                socket.join("MainLobby");
                io.to('MainLobby').emit('create_room_res', {rooms});
                
                if(debug) console.log(`create_room_res: succ, rooms, ${JSON.stringify(rooms)}`);
            }
        }
        else {
            socket.emit('create_room_res', {msg:'Room name is in use'});

            if(debug) console.log(`create_room_res: Room name is in use`);
        }
    });
    
    // room delete request
    // delete_room_req -> leave_room_res, room_list_res, delete_room_res
    socket.on('delete_room_req', (data) => {
        if(debug) console.log(`delete_room_req: data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;
        if(data.roomname == '') return;

        retUser = users.find((obj) => obj.socketId === data.socketId);
        retRoom = rooms.find((obj) => obj.roomname === data.roomname);
        // when room creator and requestor are the same
        if(retRoom.ownername == retUser.username) {
            // first, make users out from the chat
            socket.join(data.roomname);
            io.to(data.roomname).emit('leave_room_res', {roomname:retRoom.roomname,type:3});

            // delete the room from rooms array
            rooms = rooms.filter((obj) => obj.roomname !== data.roomname);
    
            // broadcast to MainLobby
            socket.join('MainLobby');
            io.to('MainLobby').emit('room_list_res', {rooms});
            if(debug) console.log(`delete_room_res: succ, rooms ${JSON.stringify(rooms)}`);
        }
        else {
            socket.emit('delete_room_res', {msg:'Only room owner can delete the room'});
            if(debug) console.log(`delete_room_res: fail, rooms ${JSON.stringify(rooms)}`);
        }
    });

    // join room req
    // join a user and return chatroom user list
    socket.on('join_room_req', (data) => {
        if(debug) console.log(`join_room_req: data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;
        if(data.roomname == "") return;

        retUser = users.find((obj) => obj.socketId === data.socketId);
        retRoom = rooms.find((obj) => obj.roomname === data.roomname);

        // check banned user
        bannUser = retRoom.bannedUsers.find(obj => obj.username === retUser.username);
        if(bannUser != null) {
            socket.emit('join_room_res', {roomname:data.roomname, msg:"You have been banned from this room"});
            return;
        }

        // if the same user try to join again
        checkJoinUser = retRoom.joinedUsers.find(obj => obj.username === retUser.username);
        if(checkJoinUser != null) {
            // to set ChatRoom with a roomname in the input text
            socket.emit('join_room_res', {roomname:data.roomname, msg:''});
    
            // send joined users and welcome msg
            socket.join(data.roomname);
            io.to(data.roomname).emit('room_broadcast_res', {room:retRoom, msg:''});
    
            if(debug) console.log(`join_room_req: succ, the same user join again ${JSON.stringify(rooms)}`);
        }
        // if a room has a password
        else if(retRoom.password != '') {
            bcrypt.compare(data.password, retRoom.password, function(err, result) {
                if (result) {
                    // add user into a joined user
                    retRoom.joinedUsers.push({username:retUser.username});
            
                    // to set ChatRoom with a roomname in the input text
                    socket.emit('join_room_res', {roomname:data.roomname, msg:''});
            
                    // send joined users and welcome msg
                    socket.join(data.roomname);
                    io.to(data.roomname).emit('room_broadcast_res', {room:retRoom, msg:`${htmlEntities(retUser.username)} has joined.`});
            
                    if(debug) console.log(`join_room_req: succ, rooms ${JSON.stringify(rooms)}`);                
                }
                else {
                    // to set ChatRoom with a roomname in the input text
                    socket.emit('join_room_res', {roomname:data.roomname, msg:'Password incorrect!'});

                    if(debug) console.log(`join_room_req: fail, rooms ${JSON.stringify(rooms)}`);                    
                }
            });
        }
        // if a room with no password
        else {
            // add user into a joined user
            retRoom.joinedUsers.push({username:retUser.username});
    
            // to set ChatRoom with a roomname in the input text
            socket.emit('join_room_res', {roomname:data.roomname, msg:''});
    
            // send joined users and welcome msg
            socket.join(data.roomname);
            io.to(data.roomname).emit('room_broadcast_res', {room:retRoom, msg:`${htmlEntities(retUser.username)} has joined.`});
    
            if(debug) console.log(`join_room_req: succ, rooms ${JSON.stringify(rooms)}`);
        }
    });

    // leave room req
    // join a user and return chatroom user list
    socket.on('leave_room_req', (data) => {
        if(debug) console.log(`leave_room_req: data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;
        if(data.roomname == "") return;

        retUser = users.find((obj) => obj.socketId === data.socketId);
        retRoom = rooms.find((obj) => obj.roomname === data.roomname);

        if(debug) console.log(`leave_room_res: retUser ${JSON.stringify(retUser)}`);
        if(debug) console.log(`leave_room_res: retRoom ${JSON.stringify(retRoom)}`);

        // delete the user from the joined user
        retRoom.joinedUsers = retRoom.joinedUsers.filter(obj => obj.username !== retUser.username);

        // broadcast to the room about the leaved user
        socket.join(data.roomname);
        if(data.type == 0) {
            io.to(data.roomname).emit('room_broadcast_res', {room:retRoom,msg:`${htmlEntities(retUser.username)} has leaved the chat.`});
        }
        else if(data.type == 1) {
            io.to(data.roomname).emit('room_broadcast_res', {room:retRoom,msg:`${htmlEntities(retUser.username)} has been kicked out.`});
        }
        else if(data.type == 2) {
            io.to(data.roomname).emit('room_broadcast_res', {room:retRoom,msg:`${htmlEntities(retUser.username)} has been banned out.`});
        }        
        
        // leave the socket room
        socket.leave(data.roomname);

        // to reset the CharRoom
        socket.emit('leave_room_res', {type:data.type});
        if(debug) console.log(`leave_room_res: succ, rooms ${JSON.stringify(rooms)}`);
    });

    // kick user out
    socket.on('kick_user_req', (data) => {
        if(debug) console.log(`kick_user_req: data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;
        if(data.roomname == "") return;
        if(data.username == "") return;

        retUser = users.find((obj) => obj.username === data.username);
        retRoom = rooms.find((obj) => obj.roomname === data.roomname);

        if(retUser == null) return;
        if(retRoom == null) return;


        param = {kickedUsername:retUser.username, kickedRoomname:retRoom.roomname};
        socket.join(data.roomname);
        io.to(data.roomname).emit('kick_user_res', param);
               
        if(debug) console.log(`kick_user_res: succ, rooms ${JSON.stringify(rooms)}`);
    });


    // bann user out
    socket.on('bann_user_req', (data) => {
        if(debug) console.log(`bann_user_req: data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;
        if(data.roomname == "") return;
        if(data.username == "") return;

        retUser = users.find((obj) => obj.username === data.username);
        retRoom = rooms.find((obj) => obj.roomname === data.roomname);

        if(retUser == null) return;
        if(retRoom == null) return;

        retRoom.bannedUsers.push({username:retUser.username});

        param = {bannedUsername:retUser.username, bannedRoomname:retRoom.roomname};
        socket.join(data.roomname);
        io.to(data.roomname).emit('bann_user_res', param);
                
        if(debug) console.log(`bann_user_req: succ, rooms ${JSON.stringify(rooms)}`);
    });

    // cancel bann user 
    socket.on('bann_user_cancel_req', (data) => {
        if(debug) console.log(`bann_user_cancel_req: data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;
        if(data.roomname == "") return;
        if(data.username == "") return;

        retUser = users.find((obj) => obj.username === data.username);
        retRoom = rooms.find((obj) => obj.roomname === data.roomname);

        if(retUser == null) return;
        if(retRoom == null) return;

        // remove the user from banned user
        retRoom.bannedUsers = retRoom.bannedUsers.filter((obj) => obj.username !== data.username);

        // send joined users a msg about cancel banned user
        socket.join(data.roomname);
        io.to(data.roomname).emit('room_broadcast_res', {room:retRoom, msg:`${htmlEntities(retUser.username)} has been free from banned user.`});
            
        if(debug) console.log(`bann_user_cancel_req: succ, rooms ${JSON.stringify(rooms)}`);
    });

    // lobby msg req
    socket.on('send_lobby_msg_req', (data) => {
        if(debug) console.log(`send_lobby_msg_req: data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;
        if(data.msg == '') return;
        if(!regContent(data.msg)) return;

        ret = users.find((obj) => obj.socketId === data.socketId);

        
        socket.join('MainLobby');
        io.to('MainLobby').emit('send_lobby_msg_res', {msg:`${htmlEntities(ret.username)}: ${htmlEntities(data.msg)}`});

        if(debug) console.log(`send_lobby_msg_res: succ ${ret.username} ${data.msg}`);
    });   


    // chat room msg req
    socket.on('send_msg_req', (data) => {
        if(debug) console.log(`send_msg_req: data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;
        if(data.roomname == '') return;
        if(data.msg == '') return;
        if(!regContent(data.msg)) return;

        ret = users.find((obj) => obj.socketId === data.socketId);

        socket.join(data.roomname);
        io.to(data.roomname).emit('send_msg_res', {msg:`${htmlEntities(ret.username)}: ${htmlEntities(data.msg)}`});

        if(debug) console.log(`send_msg_res: succ ${ret.username} ${data.msg}`);
    });   

    // chat room private msg req
    socket.on('send_private_msg_req', (data) => {
        if(debug) console.log(`send_private_msg_req: data ${JSON.stringify(data)}`);

        if(!checkToken(data.socketId, data.token)) return;
        if(data.targetUsername == '') return;
        if(data.msg == '') return;
        if(!regContent(data.msg)) return;

        ret = users.find((obj) => obj.socketId === data.socketId);
        retTarget = users.find((obj) => obj.username === data.targetUsername);

        socket.emit('send_private_msg_res', {msg:`[private] to ${htmlEntities(retTarget.username)}: ${htmlEntities(data.msg)}`});
        io.to(retTarget.socketId).emit('send_private_msg_res', {msg:`[private] from ${htmlEntities(ret.username)}: ${htmlEntities(data.msg)}`});

        if(debug) console.log(`send_private_msg_res: succ ${ret.username} ${data.msg}`);
    });   

      
});

