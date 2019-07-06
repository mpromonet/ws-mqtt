import { Client, Message, MQTTError, ConnectionOptions, SubscribeOptions, OnSubscribeSuccessParams, ErrorWithInvocationContext } from 'paho-mqtt';
import { EventEmitter } from 'events';

export class MQTTService  extends EventEmitter {
    private mqttClient: Client;
    private timer: any;

    constructor(url: string) {
        super()
        this.mqttClient = new Client(url, "client-" + Math.random());
    }

    subscribe(topic: string): void {
        this.mqttClient.onMessageArrived = (message: Message) => {
            this.emit("message", message)
        };  

        this.mqttClient.onConnectionLost = (error: MQTTError) => {
            this.emit("error", error.errorCode + " " + error.errorMessage)
        };

        let options =  {
            onSuccess: () => this.onConnect(topic),
            onFailure: (error: ErrorWithInvocationContext) => this.onConnectionFailure(error, options),
            keepAliveInterval: 10,
            timeout: 10,
            reconnect: true
        } as ConnectionOptions;

        this.mqttClient.connect(options);               
    }

    unsubscribe() {
        this.close();
    }

    private onConnectionFailure(error: ErrorWithInvocationContext, options: ConnectionOptions): void {
        this.emit("error", error.errorCode + " " + error.errorMessage)
        this.close();
        this.timer = setTimeout( () => this.mqttClient.connect(options), 1000)
    }

    private close(): void {
        try {
            this.mqttClient.disconnect();
        } catch {                   
        }
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }        
    }

    private onConnect(topic: string): void {
        this.emit("state", "connected");
        
        let options =  {
            onSuccess: (success: OnSubscribeSuccessParams) => {
                this.emit("state", "subscribed")
            },
            onFailure: (error: ErrorWithInvocationContext) => {
                this.emit("error", error.errorCode + " " + error.errorMessage)
            }
        } as SubscribeOptions;      

        this.mqttClient.subscribe(topic, options);
    }   
}

(window as any).MQTTService = MQTTService;