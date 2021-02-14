import { empty_el } from '../utils/utils';
import { Message } from '../controller/messenger_controller';

export class Chat {

  private chat: HTMLDivElement;
  private last_mgs_uuid: string;
  private chat_scroll: HTMLDivElement;
  constructor () {
    this.chat = document.getElementById('chat') as HTMLDivElement;
    this.chat_scroll = document.getElementById('chat_scroll') as HTMLDivElement;
    this.last_mgs_uuid = null;
  }
  public delete (): void {
    empty_el(document.getElementById('chat') as HTMLDivElement);
  }
  public add_message_in (message: Message): void {

    const message_div: HTMLElement = document.createElement('DIV') as HTMLElement;
    const message_text_div: HTMLElement = document.createElement('DIV') as HTMLElement;   
    const message_p = document.createElement('P');

    if ( this.last_mgs_uuid !== message.chatter_uuid ) {
      const uuid_div: HTMLElement = document.createElement('DIV') as HTMLElement;
      uuid_div.className = 'uuid-in uuid';
      uuid_div.appendChild(document.createTextNode(message.chatter_uuid));
      message_div.appendChild(uuid_div);
      this.last_mgs_uuid = message.chatter_uuid; 
    }
    message_div.className = 'message-in message';
    message_p.appendChild(document.createTextNode(message.message));
    message_text_div.appendChild(message_p);
    message_text_div.className = 'message-text message-body';
    message_div.appendChild(message_text_div);
    this.chat.appendChild(message_div);
    this.scroll_into_new_msg();
  }
  public add_message_out (message: Message): void {

    const message_div: HTMLElement = document.createElement('DIV') as HTMLElement;
    const message_text_div: HTMLElement = document.createElement('DIV') as HTMLElement;   
    const message_p = document.createElement('P');

    if ( this.last_mgs_uuid !== message.chatter_uuid ) {
      const uuid_div: HTMLElement = document.createElement('DIV') as HTMLElement;
      uuid_div.className = 'uuid-out uuid';
      uuid_div.appendChild(document.createTextNode('You'));
      message_div.appendChild(uuid_div);
      this.last_mgs_uuid = message.chatter_uuid;
    }
    message_div.className = 'message-out message';
    message_p.appendChild(document.createTextNode(message.message));
    message_text_div.appendChild(message_p);
    message_text_div.className = 'message-text message-body';
    message_div.appendChild(message_text_div);
    this.chat.appendChild(message_div);
    this.scroll_into_new_msg();
  }
  private scroll_into_new_msg(): void {
    this.chat_scroll.scrollBy(0, parseInt(getComputedStyle(this.chat).height));
  }

}