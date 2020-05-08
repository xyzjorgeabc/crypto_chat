import { empty_el, center_absolute, get_hhmm } from '../utils/utils';
import { 
  Messenger_controller,  
  Room_invitation, 
  Room_invitation_response,
  Room_join_req,
  Message
} from '../controller/messenger_controller';

export class View_controller {

  public messenger: Messenger_controller;
  private active_room: string;
  constructor () {
    this.active_room = null;
    this.messenger = new Messenger_controller(function(uuid: string){
      const session_id: HTMLInputElement = document.getElementById('session_id') as HTMLInputElement;
      session_id.value = uuid;
    });
    this._set_ui_listeners();
    this._set_messenger_listeners();
  }
  private _set_ui_listeners (): void {
    const create_room_button: HTMLElement = document.getElementById('create_room') as HTMLElement;
    create_room_button.addEventListener('click', this.messenger.create_room.bind(this.messenger));
  
    const join_room_button: HTMLElement = document.getElementById('join_room') as HTMLElement;
    join_room_button.addEventListener('click', this.join_room.bind(this));

    const invite_chatter: HTMLElement = document.getElementById('add-chatter') as HTMLElement;
    invite_chatter.addEventListener('click', this.display_invite_chatter_to_room.bind(this));

    const send_button: HTMLElement = document.getElementById('send-button');
    send_button.addEventListener('click', this.send_message.bind(this));
    
    const add_room_button = document.getElementById('add-room');
    add_room_button.addEventListener('click', this.display_join_room.bind(this));
  }
  private _set_messenger_listeners (): void {
    this.messenger.invited_to_room.add_listener(this.display_invited_to_room.bind(this));
    this.messenger.room_created.add_listener(this._on_room_created.bind(this));
    this.messenger.invite_responded.add_listener(this.display_invite_response.bind(this));
    this.messenger.rooms_update.add_listener(this.update_rooms_nav.bind(this));
    this.messenger.rooms_update.add_listener(this.update_active_room.bind(this));
    this.messenger.chatter_join_request.add_listener(this.display_room_join_request.bind(this));
    this.messenger.chatters_update.add_listener(this.update_room_chatters.bind(this));
    this.messenger.chat_update.add_listener(this.update_chat.bind(this));
  }
  private _switch_to_chat (): void {

    const invite_wrap: HTMLElement = document.getElementById('invite-wrap') as HTMLElement;
    const room_wrap: HTMLElement = document.getElementById('rooms-wrap') as HTMLElement;
     
    invite_wrap.classList.add('hide');
    room_wrap.classList.remove('hide');
    this.update_rooms_nav();   
    this.update_active_room();
  }
  private switch_to_main (): void {
    
    document.getElementById('rooms-wrap').classList.add('hide');
    document.getElementById('invite-wrap').classList.remove('hide');

  }
  private _on_room_created (): void {
    if (!document.getElementById('invite-wrap').classList.contains('hide')) this._switch_to_chat();
    else this.update_rooms_nav();
  }
  private send_message (): void {
    const txt_area = document.getElementById('out-text') as HTMLTextAreaElement;

    this.messenger.send_message(this.active_room, txt_area.value.trim());
    txt_area.value = '';
  }
  private join_room (): void {
    let join_input: HTMLInputElement = document.getElementById('join_room_id_popup') as HTMLInputElement;
    if (join_input === null) join_input = document.getElementById('join_room_id') as HTMLInputElement;
    if (join_input.value.length !== 8) return void 0; 

    this.messenger.req_join_room(join_input.value);

  }
  private display_invited_to_room (invite_info: Room_invitation): void {

    const card_div = document.createElement('DIV');
    const header = document.createElement('header');
    const header_p = document.createElement('P');
    const header_text = document.createTextNode('Room invitation');
    header_p.appendChild(header_text);
    const card_content_div = document.createElement('DIV');
    const content_div = document.createElement('DIV');
    const content_text = document.createTextNode('User ' + invite_info.chatter_uuid + ' invited you to room ' + invite_info.room_uuid);
    content_div.appendChild(content_text);
    const footer = document.createElement('footer');
    const accept_a = document.createElement('a');
    accept_a.appendChild(document.createTextNode('Accept'));
    const reject_a = document.createElement('a');
    reject_a.appendChild(document.createTextNode('Reject'));
  
    accept_a.addEventListener('click', () => {
      this.messenger.respond_room_invitation(invite_info.room_uuid, true);
      card_div.remove();


    }, {once: true});
  
    reject_a.addEventListener('click', () => {
      this.messenger.respond_room_invitation(invite_info.room_uuid, false);
      card_div.remove();
    }, {once: true});
  
  
    card_div.classList.add('mod');
    card_div.classList.add('card');
    header.classList.add('card-header');
    header_p.classList.add('card-header-title');
    card_content_div.classList.add('card-content');
    content_div.classList.add('content');
    footer.classList.add('card-footer');
    accept_a.classList.add('card-footer-item');
    reject_a.classList.add('card-footer-item');
  
    footer.appendChild(accept_a);
    footer.appendChild(reject_a);
    card_content_div.appendChild(content_div);
    header.appendChild(header_p);
  
    card_div.appendChild(header);
    card_div.appendChild(card_content_div);
    card_div.appendChild(footer);
    
    document.body.appendChild(card_div);
    center_absolute(card_div);
  
  }
  private display_invite_chatter_to_room(): void {
    if (document.getElementById('invite_popup')) return void 0; 
    const main_div = document.createElement('DIV');
    const text_input_div = document.createElement('DIV');
    const add_button_div = document.createElement('DIV');
  
    const text_input = document.createElement('INPUT') as HTMLInputElement;
    const add_button = document.createElement('BUTTON');
  
    const add_button_text = document.createTextNode('add');
    main_div.id = 'invite_popup';
    main_div.classList.add('mod');
    main_div.classList.add('box');
    main_div.classList.add('field');
    main_div.classList.add('has-addons');
    text_input.classList.add('input');
    text_input_div.classList.add('control');
    add_button_div.classList.add('control');
    add_button.classList.add('button');
    add_button.classList.add('is-primary');
  
    text_input.setAttribute('type', 'text');
    add_button.setAttribute('type', 'button');
    add_button.setAttribute('type', 'button');
  
    add_button.appendChild(add_button_text);
    
    add_button_div.appendChild(add_button);
    text_input_div.appendChild(text_input);
    main_div.appendChild(text_input_div);
    main_div.appendChild(add_button_div);
    document.body.appendChild(main_div);
    center_absolute(main_div); 
    add_button.addEventListener('click', () => {
      const uuid_to_invite = text_input.value;
      if(uuid_to_invite.length !== 8) return void 0;
      
      main_div.remove();
      this.messenger.invite_to_room( this.active_room , uuid_to_invite);
      
    });

  }
  private display_join_room () {
    if (document.getElementById('')) return void 0;
    const wrap_div = document.createElement('DIV');
    wrap_div.id = 'join_room_pop_up';
    const form = document.createElement('FORM');
    form.setAttribute('action', 'javascript:void(0);')
    const join_label = document.createElement('LABEL');
    join_label.appendChild(document.createTextNode('Join Room'));
    const join_control_div = document.createElement('DIV');
    const join_input = document.createElement('INPUT') as HTMLInputElement;
    join_input.setAttribute('type', 'text');
    join_input.id = 'join_room_uuid';
    const join_butt = document.createElement('BUTTON');
    join_butt.setAttribute('type', 'button');
    join_butt.appendChild(document.createTextNode('Join'));
    const create_room_butt = document.createElement('BUTTON');
    create_room_butt.setAttribute('type', 'button')
    create_room_butt.appendChild(document.createTextNode('Create Room'));
    join_butt.setAttribute('type', 'button');
    wrap_div.classList.add('mod');
    wrap_div.classList.add('box');
    form.classList.add('tile');
    form.classList.add('is-vertical');
    join_label.classList.add('label');
    join_control_div.classList.add('control');
    join_control_div.classList.add('is-expanded');
    join_input.classList.add('input');
    join_butt.classList.add('button');
    join_butt.classList.add('is-primary');
    create_room_butt.classList.add('button');
    create_room_butt.classList.add('is-primary');

    join_control_div.appendChild(join_input);
    form.appendChild(create_room_butt);
    form.appendChild(join_label);
    form.appendChild(join_control_div);
    form.appendChild(join_butt);
    wrap_div.appendChild(form);

    join_butt.addEventListener('click', () => {
      const room_uuid = (document.getElementById('join_room_uuid')as HTMLInputElement).value;
      if (room_uuid.length !== 8) return void 0;
      wrap_div.remove();
      this.messenger.req_join_room(room_uuid);
      
    })
    
    create_room_butt.addEventListener('click', () => {
      wrap_div.remove();
      this.messenger.create_room();
    })

    document.body.appendChild(wrap_div);
    center_absolute(wrap_div);

  }
  private display_invite_response (response: Room_invitation_response): void {

    const popup_text = `
    User ${response.chatter_uuid} ${response.join ? 'accepted': 'declined' } the invitation to join room ${response.room_uuid}.
    `;

    const main_div = document.createElement('DIV') as HTMLElement;
    const text_node = document.createTextNode(popup_text);

    main_div.classList.add('box');
    main_div.classList.add('invi-resp-popup');

    main_div.appendChild(text_node);

    document.body.appendChild(main_div);
    main_div.addEventListener('click', function(){
      main_div.remove();
    });
  }
  private display_room_join_request (req: Room_join_req): void {

    const card_div = document.createElement('DIV');
    const header = document.createElement('HEADER');
    const header_p = document.createElement('P');
    const header_text = document.createTextNode('Room join request');
    header_p.appendChild(header_text);
    const card_content_div = document.createElement('DIV');
    const content_div = document.createElement('DIV');
    const content_text = document.createTextNode(`User ${req.chatter_uuid} requests join room ${req.room_uuid}.`);
    content_div.appendChild(content_text);
    const footer = document.createElement('footer');
    const accept_a = document.createElement('a');
    accept_a.appendChild(document.createTextNode('Accept'));
    const reject_a = document.createElement('a');
    reject_a.appendChild(document.createTextNode('Reject'));

    accept_a.addEventListener('click', () => {
      this.messenger.respond_room_join_request(req, true);
      card_div.remove();
    }, {once: true});

    reject_a.addEventListener('click', () => {
      this.messenger.respond_room_join_request(req, false);
      card_div.remove();
    }, {once: true});
    
    card_div.classList.add('mod');
    card_div.classList.add('card');
    header.classList.add('card-header');
    header_p.classList.add('card-header-title');
    card_content_div.classList.add('card-content');
    content_div.classList.add('content');
    footer.classList.add('card-footer');
    accept_a.classList.add('card-footer-item');
    reject_a.classList.add('card-footer-item');
  
    footer.appendChild(accept_a);
    footer.appendChild(reject_a);
    card_content_div.appendChild(content_div);
    header.appendChild(header_p);
  
    card_div.appendChild(header);
    card_div.appendChild(card_content_div);
    card_div.appendChild(footer);
    
    document.body.appendChild(card_div);
    center_absolute(card_div);
  }
  private update_active_room (): void {
    if (this.messenger.rooms.size === 0) return void 0;
    if ( document.getElementById('rooms-wrap').classList.contains('hide') ) this._switch_to_chat();
    const active_room = this.messenger.rooms.has(this.active_room) ? this.messenger.rooms.get(this.active_room) : this.messenger.rooms.values().next().value;
    this.active_room = active_room.uuid;
    (document.getElementById('out-text') as HTMLTextAreaElement).value = '';
    const rooms_nav = document.getElementById('rooms-nav') as HTMLElement;
    const rooms_el = rooms_nav.getElementsByTagName('LI') as HTMLCollection;
    const is_admin = active_room.room_creator_uuid === this.messenger.uuid;
    for (let i = 0; i < rooms_el.length; i++){ 
      const el = rooms_el[i];
      const room_uuid = el.children[0].textContent.trim();
      if (room_uuid === active_room.uuid) {
        el.classList.add('is-active');
      }
      else el.classList.remove('is-active');
    }
      
    const chatters_list = document.getElementById('chatters-list') as HTMLDivElement;
    let last_chatter_El;
    while (last_chatter_El = chatters_list.lastElementChild){
      chatters_list.removeChild(last_chatter_El);
    }
    chatters_list.appendChild(create_chatter_li(this.messenger.uuid, true, is_admin));

    for (const chatter_uuid of active_room.chatters.values()) {
      chatters_list.appendChild(create_chatter_li(chatter_uuid, false, is_admin));
    }

    this.update_chat(this.active_room);
  }
  private update_room_chatters (room_uuid: string): void {
    
    const wrap = document.getElementById('rooms-wrap');
    if (wrap === undefined || wrap.classList.contains('hidden')) return void 0; 
    const room = this.messenger.rooms.get(room_uuid);
    const chatters_list = document.getElementById('chatters-list') as HTMLDivElement;
    const rooms_nav = document.getElementById('rooms-nav');
    const active_room = rooms_nav.getElementsByClassName('is-active')[0];
    const is_admin = room.room_creator_uuid === this.messenger.uuid;

    if (active_room.getAttribute('data-uuid') !== room.uuid) return void 0;
    let last_li
    while (last_li = chatters_list.lastElementChild) {
      chatters_list.removeChild(last_li);
    }
    
    chatters_list.appendChild(create_chatter_li(this.messenger.uuid, true, is_admin));

    for ( const chatter of room.chatters.values()) {
      chatters_list.appendChild(create_chatter_li(chatter, false, is_admin));
    }

  }
  private update_rooms_nav (): void {
    if (this.messenger.rooms.size === 0) {
      this.switch_to_main();
      return void 0;
    }
    const rooms_nav = document.getElementById('rooms-nav').children[0] as HTMLUListElement;
    let last_uuid_el;
    
    while (last_uuid_el = rooms_nav.lastElementChild) {
      rooms_nav.removeChild(last_uuid_el);
    }
    for (const room of this.messenger.rooms.values()) {
      const close_i = document.createElement('I');
      close_i.className = 'fas fa-times';
      close_i.addEventListener('click', () => {
        this.messenger.leave_room(room.uuid); 
      });

      const room_li = document.createElement('LI');
      const room_a = document.createElement('A');
      const room_text = document.createTextNode(room.uuid);
      room_li.setAttribute('data-uuid', room.uuid);
      room_a.appendChild(room_text);
      room_li.appendChild(room_a);
      room_a.appendChild(close_i);
      rooms_nav.appendChild(room_li);
      
      room_a.addEventListener('click', () => {
        this.active_room = room_li.getAttribute('data-uuid').trim();
        this.update_active_room();
      });

    }
    this.update_active_room();
  }
  private update_chat(room_uuid: string): void {
    const room = this.messenger.rooms.get(this.active_room);
    if (room_uuid !== this.active_room) return void 0;
    empty_el(document.getElementById('chat') as HTMLDivElement);
    if (!room.chat.length) {
      return void 0;
    }

    const form_msgs = format_messages(room.chat, 0,10);

    for ( let i = 0; i < form_msgs.length; i++ ) {
      if (form_msgs[i][0].chatter_uuid === this.messenger.uuid) add_message_out(form_msgs[i]);
      else add_message_in(form_msgs[i]);
    }

  }
}

export const out_text: HTMLElement = document.getElementById('out-text') as HTMLElement;

export function resize_text_area() {
  out_text.style.height = 'auto';
  out_text.style.height = parseInt(window.getComputedStyle(out_text).height as string) - 16 + 2 + 'px';
  out_text.style.height = out_text.scrollHeight+'px';
}

export function add_message_in(message_group: Message[]) {
  const chat_div: HTMLElement = document.getElementById('chat') as HTMLElement;
  const message_div: HTMLElement = document.createElement('DIV') as HTMLElement;
  const uuid_div: HTMLElement = document.createElement('DIV') as HTMLElement;
  uuid_div.appendChild(document.createTextNode(message_group[0].chatter_uuid));
  const message_text_div: HTMLElement = document.createElement('DIV') as HTMLElement;

  for (let i = 0; i < message_group.length; i++) {
    const message_p = document.createElement('P');
    message_p.appendChild(document.createTextNode(message_group[i].message));
    message_text_div.appendChild(message_p);
  }

  message_div.className = 'message-in message';
  uuid_div.className = 'uuid-in';
  message_text_div.className = 'message-text message-body';

  message_div.appendChild(uuid_div);
  message_div.appendChild(message_text_div);
  chat_div.appendChild(message_div);

}

export function add_message_out(message_group: Message[]): void {
  const chat_div: HTMLElement = document.getElementById('chat') as HTMLElement;
  const message_div: HTMLElement = document.createElement('DIV') as HTMLElement;
  const you_div: HTMLElement = document.createElement('DIV') as HTMLElement;
  you_div.appendChild(document.createTextNode('You'));
  const message_text_div: HTMLElement = document.createElement('DIV') as HTMLElement;

  for (let i = 0; i < message_group.length; i++) {
    const message_p = document.createElement('P');
    message_p.appendChild(document.createTextNode(message_group[i].message));
    message_text_div.appendChild(message_p);
  }

  message_div.className = 'message-out message';
  you_div.className = 'uuid-out';
  message_text_div.className = 'message-text message-body';
  
  message_div.appendChild(you_div);
  message_div.appendChild(message_text_div);
  chat_div.appendChild(message_div);
}

function create_chatter_li (chatter_uuid:  string,  self: boolean, is_admin: boolean): HTMLLIElement {

  const chatter_li = document.createElement('LI') as HTMLLIElement;
  chatter_li.setAttribute('data-uuid', chatter_uuid);
  const a = document.createElement('A');
  a.className = 'chatter';
  const uuid_node = document.createTextNode(self ? chatter_uuid + " (You)" : chatter_uuid );

  //delete icon 
  if (!self && is_admin) {
    var del_a = document.createElement('A') as HTMLAnchorElement;
    del_a.className = 'delete-chatter';
    var del_i = document.createElement('I') as HTMLElement;
    del_i.className = 'far fa-trash-alt';
    del_a.appendChild(del_i);
  }
  a.appendChild(uuid_node)
  chatter_li.appendChild(a);
  if (!self && is_admin) chatter_li.appendChild(del_a);

  return chatter_li;
}

function format_messages (msgs: Message[], offset: number, max_groups: number): Message[][]{
  
  const messages = msgs.slice(offset);
  const formatted_msgs: Message[][] = [];
  let curr_mesg_group: Message[] = [];
  curr_mesg_group.push(messages[0]);
  for (let i = 1; i < messages.length; i++) {
  
    const msg = messages[i];
    
    if (msg.chatter_uuid !== messages[i-1].chatter_uuid) {
      formatted_msgs.push(curr_mesg_group);
      curr_mesg_group = [];
      curr_mesg_group.push(msg);
    }
    else curr_mesg_group.push(msg);
  }
  formatted_msgs.push(curr_mesg_group);
  return formatted_msgs;
}

