import 'fast-text-encoding';
export class Crypto_controller{
  /* gen keys for each chatter comm*/
  private comms: Map<string, Comm_keys>;
  private text_encoder = new TextEncoder();
  private text_decoder = new TextDecoder();
  constructor () {
    this.comms = new Map();
  }
  public unwrap_encrypted_message (msg: Uint8Array ): Unwraped_msg {
    const iv = msg.slice(0, 16);
    const encrypted_msg = msg.slice(16);
    return new Unwraped_msg(encrypted_msg, iv);
  }
  public wrap_encrypted_message (iv: Uint8Array, encrypted_message: Uint8Array): Uint8Array {
    const tmp = new Uint8Array(iv.length + encrypted_message.length);
    tmp.set(iv);
    tmp.set(encrypted_message, 16);
    return tmp;
  }
  public encrypt_message (message: string, dest: string): PromiseLike<number[]> {
    const comm = this.comms.get(dest);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encoded_msg = this.text_encoder.encode(message);
    const encrypted_msg_prom = crypto.subtle.encrypt({
      name: 'AES-GCM',
      iv: iv },
      comm.secret_key,
      encoded_msg);
    return encrypted_msg_prom.then((encrypted_msg: ArrayBuffer): number[] => {
      return Array.from(this.wrap_encrypted_message(iv, new Uint8Array(encrypted_msg)));
    });

  }
  public decrypt_message ( wrapped_msg:number[], comm_uuid: string): PromiseLike<string> {
    const comm = this.comms.get(comm_uuid);
    const unwrapped_msg = this.unwrap_encrypted_message(new Uint8Array(wrapped_msg));

    return crypto.subtle.decrypt({
      name: 'AES-GCM',
      iv: unwrapped_msg.iv},
      comm.secret_key,
      unwrapped_msg.encrypted_message)
      .then((encoded_message: ArrayBuffer): string => {
        return this.text_decoder.decode(new Uint8Array(encoded_message));
       });
    }
  public get_local_pbk(comm_uuid: string): Promise<ArrayBuffer> {
    let comm = this.comms.get(comm_uuid);

    if (comm === undefined) {
      comm = new Comm_keys(comm_uuid);
      this.comms.set(comm_uuid, comm);
    } 
    return comm.gen_key_pair();
  }
  public set_comm_public_key (uuid: string, public_key: number[]) {
    let comm = this.comms.get(uuid);
    if (comm === undefined) {
      comm = new Comm_keys(uuid);
      this.comms.set(uuid, comm);
    } 
    comm.set_comm_pbk(public_key);
  }
  public delete_comm (chatter_uuid) {
    this.comms.delete(chatter_uuid);
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

class Comm_keys {

  public local_key_pair?: CryptoKeyPair;
  public comm_pbk?: CryptoKey;
  public secret_key?: CryptoKey;
  public comm: string; //uuid
  public ready: boolean;
  constructor(comm: string) {
    this.comm = comm;
    this.ready = false;
  }
  /* generates key pair and retruns the pbk to send */
  public gen_key_pair (): Promise<ArrayBuffer> { 
    const key_pair_prom = crypto.subtle.generateKey({
        name: 'ECDH',
        namedCurve: 'P-384' 
      }, 
      true,      
      ['deriveKey']);

    const public_key_prom = key_pair_prom.then((key_pair: CryptoKeyPair) => {
      this.local_key_pair = key_pair;
      if (this.check_ready()) this.derive_key();
      return crypto.subtle.exportKey('raw', key_pair.publicKey);
    });
    return public_key_prom as Promise<Uint8Array>;
  }
  public set_comm_pbk( comm_pbk: number[]): void {
    import_key(comm_pbk)
    .then((comm_pbk: CryptoKey)=> {
      this.comm_pbk = comm_pbk;
      if (this.check_ready()) this.derive_key();
    });
  }
  private derive_key(): void {
    
    derive_key(this.local_key_pair.privateKey, this.comm_pbk).then((secret_key: CryptoKey)=>{
      this.secret_key = secret_key;
      this.ready = true;
    });

  }
  private check_ready(): boolean {
    return !!(this.local_key_pair && this.comm_pbk);
  }
}

function import_key(raw: number[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
      'raw',
      new Uint8Array(raw),
      {name: 'ECDH', namedCurve: 'P-384'},
      false,
    []) as Promise<CryptoKey>;
}

function derive_key (private_key: CryptoKey, public_key: CryptoKey): Promise<CryptoKey> {
   return crypto.subtle.deriveKey(
    {name: 'ECDH', public: public_key}, 
    private_key,
    {name: 'AES-GCM', length: 256},
     true, ['encrypt', 'decrypt']) as Promise<CryptoKey>;
}

