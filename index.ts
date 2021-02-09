import express from 'express';
import socketio from 'socket.io';
import fs from 'fs';
import https from 'https';
import { Messenger_controller, 
  Key_announcement, 
  Message_distributable, 
  Room_join_req_response,
  room_chatter_uuids
} from './messenger_controller';


const app = express();
const https_server = https.createServer({

  key: fs.readFileSync('cert/server.key'),
  cert: fs.readFileSync('cert/server.cert')
}, app);

https_server.listen('8443',  function() {console.log('listening 8443')});
const socket = socketio(https_server);
const messenger = new Messenger_controller();

socket.on('connection', function(conn: socketio.Socket){
  let chatter_uuid: string;

  conn.on('register', (public_key: Uint8Array)=>{
    chatter_uuid =  messenger.add_chatter(conn, public_key);
  });

  conn.on('create_room', function(){ 
    messenger.create_room(chatter_uuid);
  });
  conn.on('join_room_req', function(room_uuid: string){ messenger.join_room_req(chatter_uuid, room_uuid)});
  conn.on('room_join_request_response', function (resp: Room_join_req_response)  {
    messenger.join_room_req_response(resp);
  });
  conn.on('leave_room', function(room_uuid: string) {
    messenger.leave_room(chatter_uuid, room_uuid);
  });
  conn.on('invite_response', messenger.join_room_reponse.bind(messenger));
  conn.on('invite_to_room', (room_uuid: string, chatter_to_invite_uuid: string) => {
    messenger.invite_chatter_to_room(chatter_uuid, room_uuid, chatter_to_invite_uuid);
  });
  conn.on('key_announcement', function(annment: Key_announcement){
    messenger.announce_key(chatter_uuid, annment)
  });
  conn.on('eject_chatter', function(data: room_chatter_uuids){
    messenger.eject_chatter(data.chatter_uuid, data.room_uuid);
  });
  conn.on('message', function (data: Message_distributable) {
    messenger.message(chatter_uuid, data);
  });
});

app.use('/fontawesome-free', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free'));
app.use('/bulma', express.static(__dirname + '/node_modules/bulma'));

app.use(express.static(__dirname + '/public/dist' ));
