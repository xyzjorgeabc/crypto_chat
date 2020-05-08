export function get_time(): string {

  const date = new Date();
  return date.getHours() + ':' + date.getMinutes();

}

export function get_hhmm (unix_time: number): string {

  const date = new Date(unix_time);
  return date.getHours() + ':' + date.getMinutes();
}

export class Event_Emitter <T> {
  private _listeners: Set<Function>;
  constructor () {
    this._listeners = new Set();
  }
  public emit( data: T ) {
    this._listeners.forEach(function(func) {
      func(data);
    });
  }
  public add_listener ( func: Function ) {
    this._listeners.add(func);
  }
  public delete_listener ( func: Function ) {
    this._listeners.delete(func);
  }
  public add_once_listener ( func: Function ) {
    const wrapper = (data: T) => {
      func(data);
      this._listeners.delete(wrapper);
    }
    this._listeners.add(wrapper);
  }
}

export function center_absolute (el: HTMLElement): void {

  const comp_st = window.getComputedStyle(el);
  el.style.left = (window.innerWidth / 2 - parseInt(comp_st.width) / 2) + 'px';
  el.style.top = (window.innerHeight/ 2 - parseInt(comp_st.height) / 2) + 'px';

}

export function empty_el (el: HTMLDivElement): void {

  let last_el;

  while (last_el = el.lastElementChild) {
    el.removeChild(last_el);
  }

}
