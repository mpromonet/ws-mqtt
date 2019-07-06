import { Client, Message, MQTTError, ConnectionOptions, SubscribeOptions, OnSubscribeSuccessParams, ErrorWithInvocationContext } from 'paho-mqtt';
import { EventEmitter } from 'events';

export class MQTTService  extends EventEmitter {
    private mqttClient: Client;
    private timer: any;
    private topicArray: string [] = [];
    private connecting = false;

    constructor(url: string) {
        super()
        this.mqttClient = new Client(url, "client-" + Math.random());
    }

    subscribe(topic: string): void {
        if (this.mqttClient.isConnected()) {
            this.doSubscribe(topic);
        } else if (this.connecting) {
            this.topicArray.push(topic);
        } else {
            this.connecting = true;
            this.topicArray.push(topic);
            this.mqttClient.onMessageArrived = (message: Message) => {
                this.emit("message", message)
            };  
    
            this.mqttClient.onConnectionLost = (error: MQTTError) => {
                this.emit("error", error.errorCode + " " + error.errorMessage)
            };
    
            let options =  {
                onSuccess: () => this.onConnect(),
                onFailure: (error: ErrorWithInvocationContext) => this.onConnectionFailure(error, options),
                keepAliveInterval: 10,
                timeout: 10,
                reconnect: true
            } as ConnectionOptions;
    
            this.mqttClient.connect(options);                   
        }
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
        this.topicArray.forEach( topic => {
            try {
                this.mqttClient.unsubscribe(topic);
            } catch {}
        })
                    
        try {
            this.mqttClient.disconnect();
        } catch {}

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        } 
        this.topicArray = [];
        this.connecting = false;
    }

    private onConnect(): void {
        this.connecting = false;
        this.emit("state", "connected");
        this.topicArray.forEach( topic => {
            this.doSubscribe(topic);
        })
    }   

    private doSubscribe(topic: string): void {
        
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