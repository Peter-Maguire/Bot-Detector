import {Types} from "ably";
import RealtimePromise = Types.RealtimePromise;
import {Realtime} from "ably/promises";


export default class AblyComms {

    ably: RealtimePromise;
    channelName: string = "default";
    encryptionKey: CryptoKey;

    constructor(param: {[key: string]: string}, header: string){
       this.ably = new Realtime({
           authUrl: '/auth',
           authMethod: 'POST',
           authParams: param,
           useBinaryProtocol: true,
           authHeaders: {
            "x-auth": header,
           }
       });

       this.ably.connection.whenState("connected").then(async ()=>{
           const parts = (this.ably.auth as any).tokenDetails.token.split(".");
           let encryptionDetails = JSON.parse(atob(parts[1]));
           let key = await window.crypto.subtle.importKey("raw", this.base64StringToArrayBuffer(encryptionDetails.encryptionKey), {
               name: "AES-GCM",
           }, false, ["encrypt"]);
           this.encryptionKey = key;
           this.channelName = encryptionDetails.channelName;
       })
    }

    waitForConnection(){
        return this.ably.connection.whenState("connected");
    }

    async sendResult(resultType: string, result: {[key: string]: any}){
        let iv = window.crypto.getRandomValues(new Uint8Array(12));
        const data = this.textToArrayBuffer(JSON.stringify(result));
        let encrypted = await window.crypto.subtle.encrypt({name: "AES-GCM", iv}, this.encryptionKey, data).catch((e)=>console.log("Webcrypto error", e));
        if(!encrypted)return;
        let blob = new Blob([encrypted, iv]);
        return this.ably.channels.get(this.channelName).publish(`input_${resultType}`, await blob.arrayBuffer());
    }

    waitForResult(){
        return new Promise((fulfill)=>{
            this.ably.channels.get(this.channelName.substring(1)).subscribe("result", (d)=>fulfill(d.data));
        })
    }

    base64StringToArrayBuffer(b64str: string) {
        let byteStr = atob(b64str)
        let bytes = new Uint8Array(byteStr.length)
        for (let i = 0; i < byteStr.length; i++) {
            bytes[i] = byteStr.charCodeAt(i)
        }
        return bytes.buffer
    }

    textToArrayBuffer(str: string) {
        let buf = unescape(encodeURIComponent(str))
        let bufView = new Uint8Array(buf.length)
        for (let i=0; i < buf.length; i++) {
            bufView[i] = buf.charCodeAt(i)
        }
        return bufView
    }
}