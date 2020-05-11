import  socketio from 'socket.io';
import crypto from 'crypto';

export class Messenger_controller {

  private chatters_registered: Map<string, Chatter>;
  private rooms: Map<string, Room>;
  constructor () {

    this.chatters_registered = new Map();
    this.rooms = new Map();

  }
  public add_chatter (connection: socketio.Socket, public_key: Uint8Array): string {
    const chatter = new Chatter(connection, new Uint8Array(public_key));
    this.chatters_registered.set(chatter.uuid, chatter);
    chatter.connection.emit('registered', chatter.uuid);
    return chatter.uuid;
  }
  public join_room_req (chatter_uuid: string, room_uuid: string) {

    const room = this.rooms.get(room_uuid);
    
    if ( room === undefined) return void 0;
    room.request_join(chatter_uuid);
  }
  public create_room (chatter_uuid: string) {

    const chatter = this.chatters_registered.get(chatter_uuid);

    if (chatter === undefined) return void 0;
    const room = new Room(chatter);
    this.rooms.set(room.uuid, room);
    chatter.connection.emit('room_created', room.uuid);
  }
  public invite_chatter_to_room (chatter_uuid: string, room_uuid: string, uuid_to_invite: string) {
    /* send */
    const room = this.rooms.get(room_uuid);
    const chatter_to_invite = this.chatters_registered.get(uuid_to_invite);
    if (room === undefined || chatter_to_invite === undefined ) return void 0;
    if (room.room_creator.uuid !== chatter_uuid) return void 0; 
    room.invite(chatter_to_invite);
  }
  public join_room_reponse (response: Room_invitation_response) {

    const room = this.rooms.get(response.room_uuid);
    const chatter = this.chatters_registered.get(response.chatter_uuid);

    if (
      room === undefined || chatter === undefined ||
      room.chatters.has(response.chatter_uuid) ||
      !room.join_invites.has(response.chatter_uuid)
      ) return void 0;

    room.handle_invite_response(chatter, response.join);

  }
  public announce_key (anncer_uuid: string, annment: Key_announcement): void {

    const room = this.rooms.get(annment.room_uuid);
    if (room === undefined) return void 0;
    const target_chatter = room.chatters.get(annment.uuid);
    if (target_chatter === undefined) return void 0;  
    target_chatter.connection.emit('key_announcement', {
      room_uuid: annment.room_uuid,
      uuid: anncer_uuid,
      public_key: annment.public_key
    } as Key_announcement);
  }
  public message (chatter_uuid: string, data: Message_distributable): void {

    const room = this.rooms.get(data.room_uuid);
    if (room === undefined ) return void 0;
    room.send_message(data, chatter_uuid);
    
  }
  public join_room_req_response (resp: Room_join_req_response): void {

    const room = this.rooms.get(resp.room_uuid);
    const chatter_requesting = this.chatters_registered.get(resp.chatter_uuid);
    if (room === undefined || chatter_requesting === undefined) return void 0;
    room.handle_join_room_req_response(chatter_requesting, resp.can_join);
  }
  public leave_room (chatter_uuid: string, room_uuid: string): void {

    const room = this.rooms.get(room_uuid);
    if (!this.chatters_registered.has(chatter_uuid) || room === undefined) return void 0;

    const room_destroyed = room.leave_or_destroy(chatter_uuid);
    if (room_destroyed) this.rooms.delete(room.uuid);

  }
}

class Room {

  public chatters: Map<string,Chatter>;
  public room_creator: Chatter;
  public uuid: string;
  public join_requests: Set<string>; //uuid
  public join_invites: Set<string>;
  constructor (room_creator: Chatter) {
    this.uuid = crypto.randomBytes(4).toString('hex');
    this.chatters = new Map();
    this.chatters.set(room_creator.uuid, room_creator);
    this.room_creator = room_creator;
    this.join_requests = new Set();
    this.join_invites = new Set();
    room_creator.connection.on('disconnect', () => {
      this.destroy();
    });
  }
  public invite(chatter_to_invite: Chatter): void {

    if (
      this.chatters.has(chatter_to_invite.uuid) ||
      this.join_invites.has(chatter_to_invite.uuid)
      ) return void 0;
    
    const room_invitation = {room_uuid: this.uuid, chatter_uuid: this.room_creator.uuid}  as Room_invitation;
    chatter_to_invite.connection.emit('invited', room_invitation);
    this.join_invites.add(chatter_to_invite.uuid);
  }
  public handle_invite_response (chatter: Chatter, wants_to_join: boolean) {

    this.join_invites.delete(chatter.uuid);

    if (wants_to_join) this.add_chatter(chatter);

    const response = {room_uuid: this.uuid, chatter_uuid: chatter.uuid, join: wants_to_join} as Room_invitation_response;
    this.room_creator.connection.emit('invite_responded', response);
  }
  public destroy (): void {
    this.chatters.forEach((chatter: Chatter)=> {
      chatter.connection.emit('left_room', this.uuid);
    });
  }
  public add_chatter (chatter_to_add: Chatter): void {
    if (this.chatters.has(chatter_to_add.uuid)) return void 0;

    this.chatters.forEach((chatter: Chatter) => {
      chatter.connection.emit('chatter_joined_room', {room_uuid: this.uuid, chatter_uuid: chatter_to_add.uuid} as Join_notification);
    });
    chatter_to_add.connection.emit('joined_room', get_serializable_room(this));
    this.chatters.set(chatter_to_add.uuid, chatter_to_add);
    chatter_to_add.connection.on('disconnect', ()=>{
      this.delete_chatter(chatter_to_add.uuid);
    });
  }
  public delete_chatter (chatter_uuid: string): void {
    const chatter = this.chatters.get(chatter_uuid);
    if (chatter === undefined) return void 0;
    if (!this.chatters.has(chatter.uuid)) return void 0;
    this.chatters.delete(chatter.uuid);
    this.chatters.forEach((chatter: Chatter) => { 
      chatter.connection.emit('chatter_left', {chatter_uuid: chatter_uuid, room_uuid: this.uuid} as Leave_notification);
    });
    chatter.connection.emit('left_room', this.uuid);
  }
  public send_message(data: Message_distributable, from_uuid: string): void {
    if (!this.chatters.has(from_uuid)) return void 0;

    for (let i = 0; i < data.message.length; i++) {

      const chatter = this.chatters.get(data.message[i].target_uuid);
      if (chatter === undefined) return void 0;  
      chatter.connection.emit('message', {

        room_uuid: data.room_uuid,
        chatter_uuid: from_uuid,
        encrypted_message: data.message[i].content,
        time: Date.now()
      });

    }
  }
  public request_join (chatter_uuid: string): void {
    
    if (this.join_requests.has(chatter_uuid)) return void 0;
    
    this.room_creator.connection.emit( 'chatter_join_request', 
      {chatter_uuid: chatter_uuid, room_uuid: this.uuid}  as Room_join_req);
    this.join_requests.add(chatter_uuid);
  }
  public handle_join_room_req_response (chatter: Chatter, can_join: boolean): void {
    
    if (!this.join_requests.has(chatter.uuid)) return void 0;
    
    if (can_join) this.add_chatter(chatter);
    this.join_requests.delete(chatter.uuid);
  }
  public leave_or_destroy (chatter_uuid: string): boolean {
    
    if (this.room_creator.uuid === chatter_uuid) {
      this.destroy();
      return true;
    }
    else  {
      this.delete_chatter(chatter_uuid);
      return false;
    } 
  }
}

export class Chatter {
  public public_key: Uint8Array;
  public uuid: string;
  public connection: socketio.Socket;

  constructor (connection: socketio.Socket, pb: Uint8Array) {
    this.public_key = pb;
    this.uuid = crypto.randomBytes(4).toString('hex');
    this.connection = connection;
  }
}

export interface Room_invitation {

  room_uuid: string;
  chatter_uuid: string;

}

export interface Room_invitation_response{
  room_uuid: string;
  chatter_uuid: string;
  join: boolean;
}

interface Serializable_room {
  creator_uuid: string;
  uuid: string;
  chatters: string[];

}

function get_serializable_room (room: Room): Serializable_room {
  const chatters = room.chatters.values(); 
  const chatters_ser = [];
  for (const chatter of chatters) {
    chatters_ser.push(chatter.uuid);
  }
  return {
    creator_uuid: room.room_creator.uuid,
    uuid: room.uuid,
    chatters: chatters_ser
  }
}

export interface Key_announcement {
  room_uuid: string;  
  uuid: string;
  public_key: number[];

}

export interface Message_distributable {
  room_uuid: string;
  message: {
    target_uuid: string;
    content: number[];
  }[];
}
interface Room_join_req {
  chatter_uuid: string;
  room_uuid: string;
}
export interface Room_join_req_response {
  chatter_uuid: string;
  room_uuid: string;
  can_join: boolean;
}
interface Room_distributable {
  uuid: string;
  creator_uuid: string;
  chatters: string[];
}

interface Join_notification {
  chatter_uuid: string;
  room_uuid: string;
}

type Leave_notification = Join_notification;
