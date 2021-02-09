import * as socketio from 'socket.io-client';
import { Event_Emitter } from '../utils/utils';
import { Crypto_controller } from './crypto_controller';
import * as md5 from 'md5';

export class Messenger_controller {

  public uuid: string;
  public invited_to_room: Event_Emitter<Room_invitation>;
  public chat_update: Event_Emitter<string>;
  public room_created: Event_Emitter<string>;
  public invite_responded: Event_Emitter<Room_invitation_response>;
  public rooms_update: Event_Emitter<void>; 
  public chatter_join_request: Event_Emitter<Room_join_req>;
  public chatters_update: Event_Emitter<string>;
  public join_request_responded: Event_Emitter<Room_join_req_response>;
  public rooms: Map<string,Room_as_admin>;
  private room_join_requests_pending: Set<string>;
  private room_invitations: Array<Room_invitation>;
  private socket: SocketIOClient.Socket;
 
  constructor (cb: (chatter_uuid: string) => void) {
    this.socket = socketio.connect('localhost:8443');

    this.rooms = new Map();
    this.room_invitations = [];
    this.room_join_requests_pending = new Set();
    this.socket.once('registered', (uuid: string) => {
      this.uuid = uuid;
      cb(uuid);
    });
    this.socket.on('room_created', this._on_room_created.bind(this));
    this.socket.on('invited', this._on_invited_to_room.bind(this));
    this.socket.on('invite_responded', this._on_invite_responded.bind(this));
    this.socket.on('key_announcement', this._on_key_announcement.bind(this));
    this.socket.on('message', this._on_message.bind(this));
    this.socket.on('joined_room', this._on_joined_room.bind(this));
    this.socket.on('chatter_joined_room', this._on_chatter_joined_room.bind(this));
    this.socket.on('chatter_join_request', this._on_chatter_join_request.bind(this));
    this.socket.on('join_request_responded', this._on_join_request_response.bind(this));
    this.socket.on('chatter_left', this._on_chatter_left.bind(this));
    this.socket.on('left_room', this._on_left_room.bind(this));
    this.chatter_join_request = new Event_Emitter();
    this.chat_update = new Event_Emitter();
    this.invited_to_room = new Event_Emitter();
    this.room_created = new Event_Emitter();
    this.invite_responded = new Event_Emitter();
    this.join_request_responded = new Event_Emitter();
    this.chatters_update = new Event_Emitter();
    this.rooms_update = new Event_Emitter();

    this.register();
  }
  private register (): void {
    this.socket.emit('register');
  } 
  private _on_room_created (room_uuid: string): void {
    const room = new Room_as_admin(this.uuid, room_uuid);
    this.rooms.set(room_uuid, room);
    this.room_created.emit(room_uuid);
  }
  private _on_invited_to_room(invite_data: Room_invitation) {

    this.room_invitations.push(invite_data);
    this.invited_to_room.emit(invite_data);
  }
  private _on_invite_responded (response: Room_invitation_response): void {
    /* reacciona al input del ususario invitado*/

    const room = this.rooms.get(response.room_uuid);
    room.join_invites.delete(response.chatter_uuid);
    this.invite_responded.emit(response);
  }
  private _on_key_announcement (key_ann: Key_announcement): void {
    const room = this.rooms.get(key_ann.room_uuid);
   room.crypto.set_comm_public_key(key_ann.uuid, key_ann.public_key);
  }
  private _on_message(msg: MessageI): void {
    const room = this.rooms.get(msg.room_uuid);
    room.add_msg_recieved(msg).then(()=>{
      this.chat_update.emit(room.uuid);
    })
  }
  private _on_joined_room (room_joined: Room_distributable): void {

    const room = new Room_as_admin(room_joined.creator_uuid, room_joined.uuid);
    this.rooms.set(room.uuid, room)
    for (let i = 0; i < room_joined.chatters.length; i++) {
      room.chatters.add(room_joined.chatters[i]);
      this.announce_key(room_joined.chatters[i], room_joined.uuid);
    }

    this.rooms_update.emit();
  }
  private _on_chatter_joined_room (join_not: Join_notification): void {
    const room = this.rooms.get(join_not.room_uuid);
    if (room === undefined) return void 0;
    room.chatters.add(join_not.chatter_uuid);
    this.announce_key(join_not.chatter_uuid, room.uuid);
    this.chatters_update.emit(room.uuid);
  }
  private _on_chatter_join_request (req: Room_join_req): void {
    this.chatter_join_request.emit(req); 
  }
  private _on_chatter_left (leave_not: Leave_notification): void {
    const room = this.rooms.get(leave_not.room_uuid);
    room.chatters.delete(leave_not.chatter_uuid);
    this.chatters_update.emit(room.uuid);
  }
  private _on_left_room (room_uuid: string): void {
    this.rooms.delete(room_uuid);
    this.rooms_update.emit();
  }
  private _on_join_request_response (resp: Room_join_req_response): void {
    this.room_join_requests_pending.delete(resp.room_uuid);
    this.join_request_responded.emit(resp);
  }
  private announce_key(chatter_uuid: string, room_uuid: string): void {
    const room = this.rooms.get(room_uuid);
    const local_pbk_prom = room.crypto.get_local_pbk(chatter_uuid);
    local_pbk_prom.then((local_pbk: ArrayBuffer) => {

      this.socket.emit('key_announcement', {
        room_uuid: room_uuid,
        uuid: chatter_uuid,
        public_key: Array.from(new Uint8Array(local_pbk))
      } as Key_announcement);

    });

  }
  public eject_chatter (room_uuid: string, chatter_uuid: string) {
    const room = this.rooms.get(room_uuid);
    if (room === undefined || !room.chatters.has(chatter_uuid)) return void 0;
    this.socket.emit('eject_chatter', {room_uuid: room_uuid, chatter_uuid: chatter_uuid} as room_chatter_uuids);
  }
  public send_message (room_uuid: string, msg:string): void {
    
    const room = this.rooms.get(room_uuid);
    if (room === undefined) return void 0;

    room.add_own_message(new Message(msg, this.uuid, Date.now()));
    this.chat_update.emit(room_uuid);
    room.encrypt_message(msg).then((dist_msgs: Message_distrutable[]) => {
      this.socket.emit('message', {room_uuid: room_uuid, message: dist_msgs});
    });
  }
  public respond_room_invitation (room_uuid: string, join: boolean) {
    this.socket.emit('invite_response', {room_uuid: room_uuid, chatter_uuid: this.uuid , join: join} as Room_invitation_response);

    if (join) {
      // get room data from room invitations.
      const invi_info = this.room_invitations.find(function(invi: Room_invitation){
        return invi.room_uuid === room_uuid;
      });
      const room = new Room_as_admin(invi_info.chatter_uuid, invi_info.room_uuid);
      this.rooms.set(room.uuid, room);
      this.rooms_update.emit();
    }
    this.room_invitations = this.room_invitations.filter(function(invi: Room_invitation){

      return !(invi.room_uuid === room_uuid);

    });

  }
  public invite_to_room (room_uuid: string, chattter_uuid: string) {
    const room = this.rooms.get(room_uuid);
    if (room.join_invites.has(chattter_uuid)) return void 0;
    room.join_invites.add(chattter_uuid);
    this.socket.emit('invite_to_room', room_uuid, chattter_uuid);
  }
  public create_room (): void {
    this.socket.emit('create_room');
  }
  public leave_room (room_uuid: string): void {
    if (!this.rooms.has(room_uuid)) return void 0;
    this.socket.emit('leave_room', room_uuid);
  }
  public req_join_room (room_uuid: string): void {
    if (this.rooms.has(room_uuid)) return void 0;

    if (this.room_join_requests_pending.has(room_uuid)) return void 0;
    this.room_join_requests_pending.add(room_uuid);
    this.socket.emit('join_room_req', room_uuid);
  }
  public respond_room_join_request (req: Room_join_req, can_join: boolean): void {
    this.socket.emit('room_join_request_response', 
      { room_uuid: req.room_uuid, 
        chatter_uuid: req.chatter_uuid, 
        can_join: can_join
      } as Room_join_req_response);
  }
}
class Unwraped_msg {

  public encrypted_message: Uint8Array;
  public iv: Uint8Array;
  constructor (message: Uint8Array, iv: Uint8Array) {
    this.iv = iv;
    this.encrypted_message = message;
  }
}

export class Message {

  public message: string;
  public hash: string;
  public chatter_uuid: string;
  public time: number;
  constructor (message: string, chatter_uuid: string, time: number) {
    this.message = message;
    this.hash = md5(message);
    this.chatter_uuid = chatter_uuid;
    this.time = time;
  }
}

export class Room {
  public chat: Message[];
  public chatters: Set<string>;
  public room_creator_uuid: string;
  public uuid: string;
  public crypto: Crypto_controller;
  constructor (room_creator_uuid: string, room_uuid: string) {
    this.uuid = room_uuid;
    this.chatters = new Set();
    this.chat = [];
    this.room_creator_uuid = room_creator_uuid;
    this.crypto = new Crypto_controller();
  }
  public add_own_message (msg: Message): void {
    this.chat.push(msg);
  }
  public add_msg_recieved (msg: MessageI): PromiseLike<void> {
    return this.crypto.decrypt_message( msg.encrypted_message, msg.chatter_uuid)
    .then ((msg_decrypted: string) => {
        this.chat.push(new Message(msg_decrypted, msg.chatter_uuid, msg.time));
    });
  }
  public delete_chatter (chatter_uuid: string): void {
    this.chatters.delete(chatter_uuid);
    this.crypto.delete_comm(chatter_uuid);
  }
  public encrypt_message(msg: string): Promise<Message_distrutable[]> {
    let proms:Promise<Message_distrutable>[] = [];
    
    let chatters = this.chatters.values();
    for (const chatter of chatters) {
      const dist_msg_prom: PromiseLike<Message_distrutable> = this.crypto.encrypt_message(msg, chatter)
        .then(function ( msg: number[]) {
          return {target_uuid: chatter, content: msg};
        });
      proms.push(Promise.resolve(dist_msg_prom));
    }
    return Promise.all(proms)
    .then(function(encrypted_msgs: Message_distrutable[]){ 
      return encrypted_msgs.map(function(obj){
        return {
          target_uuid: obj.target_uuid,
          content: Array.from(obj.content)
        };
      });
    });
  }
}

export class Room_as_admin extends Room {
  public join_requests: Set<string>; //uuid
  public join_invites: Set<string>; //uuid
  constructor (room_creator_uuid: string, room_uuid: string) {
    super(room_creator_uuid, room_uuid);
    this.join_requests = new Set();
    this.join_invites = new Set();
  }
}

export interface Room_invitation {
  room_uuid: string;
  chatter_uuid: string;
}

export interface Room_invitation_response {
  room_uuid: string;
  chatter_uuid: string;
  join: boolean;
}

interface Key_announcement {
  room_uuid: string;
  uuid: string;
  public_key: number[];
}

interface MessageI {
  room_uuid: string;
  chatter_uuid: string;
  encrypted_message: number[];
  time: number;
}
interface Message_distrutable {
  target_uuid: string;
  content: number[]
}

interface Room_distributable {
  uuid: string;
  creator_uuid: string;
  chatters: string[];
}

export interface Room_join_req {
  chatter_uuid: string;
  room_uuid: string;
}

export interface Room_join_req_response {
  chatter_uuid: string;
  room_uuid: string;
  can_join: boolean;
}

export interface Join_notification {
  chatter_uuid: string;
  room_uuid: string;
}

type Leave_notification = Join_notification;
type room_chatter_uuids = Join_notification;
