import { empty_el } from '../utils/utils';
import { Message } from '../controller/messenger_controller';

export class Chat {

  private chat: HTMLDivElement;
  private last_mgs_sender_uuid: string;
  private chat_scroll: HTMLDivElement;
  constructor (chatter_uuid: string, messages: Message[]) {
    this.chat = document.getElementById('chat') as HTMLDivElement;
    this.chat_scroll = document.getElementById('chat_scroll') as HTMLDivElement;
    this.last_mgs_sender_uuid = null;

    for (let i = 0; i < messages.length; i++) {
      if (messages[i].chatter_uuid === chatter_uuid)
        this.add_message_out(messages[i], true);
      else
        this.add_message_in(messages[i], true);
    }
    this.scroll_into_new_msg();
  }
  public delete (): void {
    empty_el(document.getElementById('chat') as HTMLDivElement);
  }
  public add_message_in (message: Message, batch_add = false): void {

    const message_div: HTMLElement = document.createElement('DIV') as HTMLElement;
    const message_text_div: HTMLElement = document.createElement('DIV') as HTMLElement;   
    const message_p = document.createElement('P');

    if ( this.last_mgs_sender_uuid !== message.chatter_uuid ) {
      const uuid_div: HTMLElement = document.createElement('DIV') as HTMLElement;
      uuid_div.className = 'uuid-in uuid';
      uuid_div.appendChild(document.createTextNode(message.chatter_uuid));
      message_div.appendChild(uuid_div);
      this.last_mgs_sender_uuid = message.chatter_uuid; 
    }
    message_div.className = 'message-in message';
    message_p.appendChild(document.createTextNode(message.message));
    message_text_div.appendChild(message_p);
    message_text_div.className = 'message-text message-body';
    message_div.appendChild(message_text_div);
    this.chat.appendChild(message_div);
    if (!batch_add) {
      this.scroll_into_new_msg();
      this.mark_last_msg_as_new(message_text_div);
    }
  }
  public add_message_out (message: Message, batch_add = false): void {

    const message_div: HTMLElement = document.createElement('DIV') as HTMLElement;
    const message_text_div: HTMLElement = document.createElement('DIV') as HTMLElement;   
    const message_p = document.createElement('P');

    if ( this.last_mgs_sender_uuid !== message.chatter_uuid ) {
      const uuid_div: HTMLElement = document.createElement('DIV') as HTMLElement;
      uuid_div.className = 'uuid-out uuid';
      uuid_div.appendChild(document.createTextNode('You'));
      message_div.appendChild(uuid_div);
      this.last_mgs_sender_uuid = message.chatter_uuid;
    }
    message_div.className = 'message-out message';
    message_p.appendChild(document.createTextNode(message.message));
    message_text_div.appendChild(message_p);
    message_text_div.className = 'message-text message-body';
    message_div.appendChild(message_text_div);
    this.chat.appendChild(message_div);
    if (!batch_add) {
      this.scroll_into_new_msg();
      this.mark_last_msg_as_new(message_text_div);
    }
  }
  private scroll_into_new_msg(): void {
    this.chat_scroll.scrollBy(0, parseInt(getComputedStyle(this.chat).height));
  }
  private mark_last_msg_as_new (message_text_div: HTMLElement): void {
    const last_text = document.getElementsByClassName('last')[0];
    if (last_text) last_text.classList.remove('last');
    message_text_div.classList.add('last');
  }
}
