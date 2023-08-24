const debug = false;

////////////////////////////////////////////
// socket connected to server
////////////////////////////////////////////         
let socketio = io.connect();

////////////////////////////////////////////
// chat server requests and receives
////////////////////////////////////////////

// request login
// login_req -> login_res, waiting_list_res, room_list_res, send_lobby_msg_res
// input: {username}
// return: 
// when succ: 
//   {user} with login_res
//   {users} waiting_list_res
//   {rooms} room_list_res
//   {msg} send_lobby_msg_res
// when fail: no return
function btnLogin(){
var username = document.getElementById("inputUsername").value;
socketio.emit("login_req", {username});
}
socketio.on("login_res",function(data) {
if(debug) console.log('login_res: ' + JSON.stringify(data));
if(data.socketId != '') {
    setUsername(data.user.username);
    setSocketId(data.user.socketId);
    setToken(data.user.token);

    document.getElementById('divLogin').hidden = true;
    document.getElementById('divLogout').hidden = false;
    document.getElementById('divMain').hidden = false;
}
});         

// request logout 
// logout_req -> logout_res, waiting_list_res, send_lobby_msg_res
// input: {socketId}
// return: no value with logout_res
function btnLogout(){
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
socketio.emit("logout_req", {socketId, token});
}
socketio.on("logout_res",function(data) {
if(debug) console.log('logout_res: ' + JSON.stringify(data));

document.getElementById('divLogin').hidden = false;
document.getElementById('divLogout').hidden = true;
document.getElementById('divMain').hidden = true;

// init
document.getElementById('inputSocketId').value = '';
document.getElementById('spanLoggedUsername').textContent = '';
document.getElementById('inputToken').value = '';
document.getElementById('inputUsername').value = '';

clearList(document.getElementById('listWaitingList'));
clearList(document.getElementById('listLobbyMsg'));
clearList(document.getElementById('listRooms'));

setRoomName('');
clearList(document.getElementById('listChatRoomJoinedUsers'));
clearList(document.getElementById('listChatRoomBannedUsers'));
clearList(document.getElementById('listChatRoomMsg'));
});         

// request waiting list
// waiting_list_req -> waiting_list_res
// input: {socketId}
// return: {users} with waiting_list_res
function askWaitingList() {
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
socketio.emit("waiting_list_req", {socketId, token});
}
socketio.on("waiting_list_res",function(data) {
if(debug) console.log('waiting_list_res: ' + JSON.stringify(data));

drawWaitingList(data.users);
});  

// request room list
// room_list_req -> room_list_res
// input: {socketId}
// return: {rooms}, only return to asked user
function askRoomList() {
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
socketio.emit("room_list_req", {socketId, token});
}
socketio.on("room_list_res",function(data) {
if(debug) console.log('room_list_res: ' + JSON.stringify(data));

drawRoomList(data.rooms);
}); 

// request room creation
// create_room_req -> create_room_res
// input: {socketId, roomname, password}
// return: {rooms} when succ, {msg} when fail
function btnCreateRoom() {
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
roomname = document.getElementById('inputRoomName').value;
password = document.getElementById('inputRoomPassword').value;
socketio.emit("create_room_req", {socketId, token, roomname, password});

document.getElementById('inputRoomName').value = '';
}
socketio.on("create_room_res",function(data) {
if(debug) console.log('create_room_res:' + JSON.stringify(data));

if(data.msg) {
    alert(data.msg);
}
else {
    drawRoomList(data.rooms);
}
});  

// request delete a room
// delete_room_req -> leave_room_res, room_list_res, delete_room_res
// input: {socketId, roomname}
// return: 
// when succ: {roomname, type} with leave_room_res, {rooms} with room_list_res
// when fail: {msg} with delete_room_res
function deleteRoom(roomname) {
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
socketio.emit("delete_room_req", {socketId, token, roomname});
}
socketio.on("delete_room_res",function(data) {
if(debug) console.log('delete_room_res:' + JSON.stringify(data));
alert(data.msg);
});  


// receive server's broadcast
// input: {room, msg}
// return: no return
socketio.on("room_broadcast_res",function(data) {
if(debug) console.log('room_broadcast_res:' + JSON.stringify(data));
drawChatRoomJoinedUsers(data.room);
drawChatRoomBannedUsers(data.room);
drawChatRoomSelectReceiver(data.room);
drawChatRoomMsg(data.msg);
});  

// request join a room
// join_room_req -> join_room_res, room_broadcast_res
// input: {socketId, roomname}
// return: {room, msg}
function joinRoom(roomname, passYn) {
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
password = '';
if( passYn == 'Y') {
    password = prompt("Please enter the password", "");
}

socketio.emit("join_room_req", {socketId, token, roomname, password});
}
socketio.on("join_room_res",function(data) {
if(debug) console.log('join_room_res:' + JSON.stringify(data));
if( data.msg != '') {
    alert(data.msg);
}
else {
    setRoomName(data.roomname);
    clearList(document.getElementById('listChatRoomMsg'));

    document.getElementById('divRoomList').hidden = true;
    document.getElementById('divChatRoom').hidden = false;
}
});  


// request leave a ChatRoom
// leave_room_req -> room_broadcast_res, leave_room_res
// input: {type(0: default, 1:kicked out, 2:banned out, 3:deleted romm), socketId, roomname}
// return: {}
function btnLeaveChatRoom() {
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
roomname = getRoomName();
socketio.emit("leave_room_req", {type:0, socketId, token, roomname});
}
socketio.on("leave_room_res",function(data) {
if(debug) console.log('leave_room_res:' + JSON.stringify(data));

setRoomName('');
clearList(document.getElementById('listChatRoomJoinedUsers'));
clearList(document.getElementById('listChatRoomBannedUsers'));
clearList(document.getElementById('listChatRoomMsg'));
document.getElementById('selectChatRoomReceiver').innerHTML = "";

if(data.type == 1) {
    alert("You've been kicked out");
}
else if(data.type == 2) {
    alert("You've been banned from the chat!");
}
else if(data.type == 3) {
    alert(`${data.roomname} has been deleted!`);
}

document.getElementById('divRoomList').hidden = false;
document.getElementById('divChatRoom').hidden = true;
});  

// request kick user out
// kick_user_req -> kick_user_res
// input: socketId(requestor), roomname, username(target user)
// return: {kickedUsername, kickedRoomname}
function kickUser(username) {
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
roomname = getRoomName();

socketio.emit("kick_user_req", {socketId, token, roomname, username});
}
socketio.on("kick_user_res",function(data) {
if(debug) console.log('kick_user_res:' + JSON.stringify(data));

if(data.kickedUsername == '') return;
if(data.kickedRoomname == '') return;
if( getUsername() == data.kickedUsername) {
    if(debug) console.log('kick_user_res - Yes I am out');               
    socketio.emit("leave_room_req", {type:1, socketId:getSocketId(), token:getToken(), roomname:data.kickedRoomname});
}
else {
    if(debug) console.log('kick_user_res - Not me');
}
});  

// request bann user out
// bann_user_req -> bann_user_res
// input: socketId(requestor), roomname, username(target user)
// return: {bannedUsername, bannedRoomname}
function bannUser(username) {
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
roomname = getRoomName();

socketio.emit("bann_user_req", {socketId, token, roomname, username});
}
socketio.on("bann_user_res",function(data) {
if(debug) console.log('kick_user_res:' + JSON.stringify(data));

if(data.bannedUsername == '') return;
if(data.bannedRoomname == '') return;
if( getUsername() == data.bannedUsername) {
    if(debug) console.log('bann_user_res - Yes I am out');               
    socketio.emit("leave_room_req", {type:2, socketId:getSocketId(), token:getToken(), roomname:data.bannedRoomname});
}
else {
    if(debug) console.log('bann_user_res - Not me');
}
});  

// input: socketId(requestor), roomname, username(target user)
// bann_user_cancel_req-> room_broadcast_res
// return: no return, but there is a broadcast about cancel bann
function cancelBannUser(username) {
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
roomname = getRoomName();

socketio.emit("bann_user_cancel_req", {socketId, token, roomname, username});
}


// send a msg inside a Lobby
// send_lobby_msg_req -> send_lobby_msg_res
// input: {sockketId, roomname, msg} when send to all
// input: {sockketId, targetUsername, msg} when send to a private
// return: {msg}
function btnSendLobbyMsg() {
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
roomname = getRoomName();
msg = document.getElementById('inputLobbyMsg').value;

socketio.emit("send_lobby_msg_req", {socketId, token, msg});
document.getElementById('inputLobbyMsg').value = '';
}
socketio.on("send_lobby_msg_res",function(data) {
if(debug) console.log('send_lobby_msg_res:' + JSON.stringify(data));
drawLobbyMsg(data.msg);
}); 

// send a msg inside a ChatRoom
// send_msg_req -> send_msg_res
// input: {sockketId, roomname, msg} when send to all
// input: {sockketId, targetUsername, msg} when send to a private
// return: {msg}
function btnSendChatRoomMsg() {
// check for socket id before request
if(!haveSocketId()) return;

socketId = getSocketId();
token = getToken();
roomname = getRoomName();
select = document.getElementById('selectChatRoomReceiver');
targetUsername = select.options[select.selectedIndex].value;
msg = document.getElementById('inputChatRoomMsg').value;

// if send to all
if( targetUsername == "toall" ){
    socketio.emit("send_msg_req", {socketId, token, roomname, msg});
}
// if send to a private
else {
    socketio.emit("send_private_msg_req", {socketId, token, targetUsername, msg});
}
document.getElementById('inputChatRoomMsg').value = '';
}
socketio.on("send_msg_res",function(data) {
if(debug) console.log('send_msg_res:' + JSON.stringify(data));
drawChatRoomMsg(data.msg);
});  
socketio.on("send_private_msg_res",function(data) {
if(debug) console.log('send_private_msg_res:' + JSON.stringify(data));
drawChatRoomMsg(data.msg);
});  



//////////////////////////////
// usefool functions
//////////////////////////////

// delete all itmes in a list object
function clearList(list) {
while(list.firstChild) {
        list.removeChild(list.firstChild);
}
}
// it is call to print out a msg
function drawServerMsg(msg) {
document.getElementById('divServerMsg').innerHTML = msg;
}
// to display users in the Main Lobby 
function drawWaitingList(data) {
list = document.getElementById('listWaitingList');
clearList(list);
for(item of data) {
    list.innerHTML += `<li>${item.username}</li>`;
}
list.scrollTop = list.scrollHeight;
}
// to display rooms created by the uesrs
function drawRoomList(data) {
list = document.getElementById('listRooms');
clearList(list);
for(item of data) {
    let passYn = 'N';
    let passText = '';
    if(item.password != '') {
        passYn = 'Y';
        passText = '<sup>with Password </sup>';
    }
    if(getUsername() == item.ownername) {
        list.innerHTML += `<li><strong>${item.roomname}</strong> <i>by ${item.ownername}</i> ${passText}<a href='javascript:joinRoom("${item.roomname}","${passYn}")'>Join</a> <a href='javascript:deleteRoom("${item.roomname}")'>Delete</a></li>`;

    }
    else {
        list.innerHTML += `<li><strong>${item.roomname}</strong> <i>by ${item.ownername}</i> ${passText}<a href='javascript:joinRoom("${item.roomname}","${passYn}")'>Join</a></li>`;
    }
}
list.scrollTop = list.scrollHeight;
}

// to print out a msg in a ChatRoom
function drawChatRoomJoinedUsers(data) {
list = document.getElementById('listChatRoomJoinedUsers');
clearList(list);
console.log('listChatRoomJoinedUsers:' + JSON.stringify(data));
console.log('listChatRoomJoinedUsers:' + item.ownername+ ','+ data.ownername);
for(item of data.joinedUsers) {
    if(getUsername() == data.ownername && getUsername() != item.username) {
        list.innerHTML += `<li>${item.username} <a href='javascript:kickUser("${item.username}")'>kick out</a> <a href='javascript:bannUser("${item.username}")'>bann</a></li>`;
    }
    else if(item.username == data.ownername) {
        list.innerHTML += `<li>${item.username}(Owner)</li>`;
    }
    else {
        list.innerHTML += `<li>${item.username}</li>`;
    }
}
list.scrollTop = list.scrollHeight;
}
// to print out a msg in a ChatRoom
function drawChatRoomBannedUsers(data) {
list = document.getElementById('listChatRoomBannedUsers');
console.log('drawChatRoomBannedUsers list:' + list);
clearList(list);
for(item of data.bannedUsers) {
    if(getUsername() == data.ownername && getUsername() != item.username) {
        list.innerHTML += `<li>${item.username} <a href='javascript:cancelBannUser("${item.username}")'>cancel bann</a></li>`;
    }
    else {
        list.innerHTML += `<li>${item.username}</li>`;
    }               
}
list.scrollTop = list.scrollHeight;
}         
// to print out a msg in a ChatRoom
function drawChatRoomMsg(msg) {
if(msg != '') {
    list = document.getElementById('listChatRoomMsg');
    list.innerHTML += `<li>${msg}</li>`;
    list.scrollTop = list.scrollHeight;
}
}

// to print out a msg in a ChatRoom
function drawLobbyMsg(msg) {
if(msg != '') {
    list = document.getElementById('listLobbyMsg');
    list.innerHTML += `<li>${msg}</li>`;
    list.scrollTop = list.scrollHeight;
}
}         

// to fill out select object with users in a room
function drawChatRoomSelectReceiver(data) {
select = document.getElementById('selectChatRoomReceiver');

select.innerHTML = "";            

select.add(new Option("To all", "toall"));
for(user of data.joinedUsers) {
    if( user.username != getUsername()) {
        select.add(new Option(user.username, user.username));
    }
}
}


// to set and get a socketid which the server assign to a client
function setToken(token) {
document.getElementById('inputToken').value = token;
}
function getToken() {
return document.getElementById('inputToken').value;
}         
function setSocketId(id) {
document.getElementById('inputSocketId').value = id;
}
function getSocketId() {
return document.getElementById('inputSocketId').value;
}
function haveSocketId() {
if(document.getElementById('inputSocketId').value != '') {
    return true;
}
return false;
}
function setUsername(username) {
document.getElementById('spanLoggedUsername').textContent = username;

}
function getUsername() {
return document.getElementById('spanLoggedUsername').textContent;
}


// to set and get a roomname to save a ChatRoom name a user joined
function setRoomName(name) {
document.getElementById('spanSelectedChatRoomName').textContent = name;
}
function getRoomName() {
return document.getElementById('spanSelectedChatRoomName').textContent;
}
function haveRoomName() {
if(document.getElementById('spanSelectedChatRoomName').textContent != '') {
    return true;
}
return false;
}         

// when a page loaded
// draw Main Lobby and created Rooms list
onload = (event) => { 
askWaitingList();
askRoomList();
};