import {
    MatrixClient
} from "matrix-bot-sdk";
import Schema from "./schema";
const userId = require("./config/config.json").userId;

export class Pet {
    roomId: string;
    pet: object;
    client: MatrixClient;

    constructor(client: MatrixClient, roomId: string) {
        this.roomId = roomId;
        this.client = client;
    }

    async refresh() {
        const state = await this.client.getRoomState(this.roomId);
        let status = state.find(s =>
            s.type === "org.bpulse.petrix.status"
            && s.state_key === userId);
        this.pet = status.content ? status.content : null;
        console.log(this.pet);
    }

    async sendStatus() {
        await this.refresh();
        await this.client.sendNotice(this.roomId, JSON.stringify(this.pet))
    }

    async setName(name: string) {
        try {
            await this.client.sendStateEvent(this.roomId, "m.room.member", userId, {
                "membership": "join",
                "displayname": name});
        }
        catch (ex) {
            console.log(ex);
        }

    }

    async init() {
        const status = {  };
        for (let attribute of Object.keys(Schema.attributes)) {
            status[attribute] = Schema.attributes[attribute].initValue;
        }
        try {
            await this.client.sendStateEvent(this.roomId, "org.bpulse.petrix.status", userId, status);
        }
        catch(ex) {
            console.log(ex);
        }
        
    }
}