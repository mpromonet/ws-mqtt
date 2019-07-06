import { Client, Message, MQTTError, ConnectionOptions, SubscribeOptions, OnSubscribeSuccessParams, ErrorWithInvocationContext } from 'paho-mqtt';
import { EventEmitter } from 'events';

export class MQTTService  extends EventEmitter {
    private mqttClient: Client;

    constructor(url: string) {
        super()
        this.mqttClient = new Client(url, "clientjs");
    }

    subscribe(topic: string): void {
        this.mqttClient.onMessageArrived = (message: Message) => {
            this.emit("message", message)
        };  

        this.mqttClient.onConnectionLost = (error: MQTTError) => {
            this.emit("error", error.errorCode + " " + error.errorMessage)
        };

        let options =  {
            onSuccess: () => {this.onConnect(topic)},
            onFailure: (error: ErrorWithInvocationContext) => {
                this.emit("error", error.errorCode + " " + error.errorMessage)
                try {
                    this.mqttClient.disconnect();
                } catch {                   
                }
                setTimeout( () => this.mqttClient.connect(options), 1000)
            },
            keepAliveInterval: 10,
            timeout: 10,
            reconnect: true
        } as ConnectionOptions;

        this.mqttClient.connect(options);               
    }

    unsubscribe() {
        this.mqttClient.disconnect();
    }

    private onConnect(topic: string): void {
        this.emit("state", "connected")
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