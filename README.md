# 2022 Fall, CSE330, Module 6 Group project
+ Byeongchan Gwak, 501026, kbckbc
+ This is done by only me

## Multi-room Chat Server(for a reference)
### I have tested following criteria, thanks for your time.
+ Administration of user created chat rooms (25 Points):
  - [x] Users can create chat rooms with an arbitrary room name(5 points)
  - [x] Users can join an arbitrary chat room (5 points)
  - [x] The chat room displays all users currently in the room (5 points)
  - [x] A private room can be created that is password protected (5 points)
  - [x] Creators of chat rooms can temporarily kick others out of the room (3 points)
  - [x] Creators of chat rooms can permanently ban users from joining that particular room (2 points)
+ Messaging (5 Points):
  - [x] A user's message shows their username and is sent to everyone in the room (1 point)
  - [x] Users can send private messages to another user in the same room (4 points)
+ Best Practices (5 Points):
  - [x] Code is well formatted and easy to read, with proper commenting (2 points)
  - [x] Code passes HTML validation (2 points)
  - [x] node_modules folder is ignored by version control (1 points)
+ Usability (5 Points):
  - [x] Communicating with others and joining rooms is easy and intuitive (4 points)
  - [x] Site is visually appealing (1 point)


## How to run this project
1. Clone this project : git clone ...
2. Install node packages : npm i
3. Run this app : node multi_server.js
4. Connect to a page: http://localhost:3456
5. Enjoy chatting!

## User info
+ No sign up is needed
+ You can name your nick name whatever you want

## Creative Portion (10 Points)
### Can chat in the Main lobby
+ The requirement of this project is making a chat inside a room
+ However, I implement a chat function in the Main lobby.
+ Users can have a chat with each other without making a chat room

### Can delete a room
+ Only the owner of a room can delete the room
+ When deleting a room, all users in the room will be out from the room and receive a msg

### Can recover from a banned user
+ The owner of a room can bann a user
+ After registering a banned user, the owner can also cancel it

## Grading
+2pts for extra css\
great job!
  
