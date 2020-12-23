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
        this.pet = status && status.content ? status.content : null;
        console.log(this.roomId, this.pet);
        if (!this.pet) {
            let members = await this.client.getJoinedRoomMembers(this.roomId);
            if (members.length === 1) {
                this.client.leaveRoom(this.roomId);
            }
        }
    }

    async sendStatus() {
        await this.refresh();
        await this.client.sendNotice(this.roomId, JSON.stringify(this.pet))
    }

    async setName(name: string) {
        try {
            await this.client.sendStateEvent(this.roomId, "m.room.member", userId, {
                "membership": "join",
                "displayname": name
            });
        }
        catch (ex) {
            console.log(ex);
        }

    }

    async init() {
        const status = {};
        for (let attribute of Object.keys(Schema.attributes)) {
            status[attribute] = Schema.attributes[attribute].initValue;
        }
        try {
            await this.client.sendStateEvent(this.roomId, "org.bpulse.petrix.status", userId, status);
        }
        catch (ex) {
            console.log(ex);
        }

    }

    async tick() {
        await this.refresh();
        if (!this.pet) { return; }

        for (let attr of Object.keys(this.pet)) {
            this.pet[attr] += Schema.attributes[attr].tickDelta;
            if (this.pet[attr] <= Schema.attributes[attr].min.limit) {
                await this.client.sendText(this.roomId, `Pet died due to low ${attr}`);
                await this.client.leaveRoom(this.roomId);
                return;
            }
            if (this.pet[attr] <= Schema.attributes[attr].min.warn) {
                await this.client.sendText(this.roomId, `Warning, low: ${attr} (${this.pet[attr]})`);
            }
            if (this.pet[attr] >= Schema.attributes[attr].max.limit) {
                await this.client.sendText(this.roomId, `Pet died due to high ${attr}`);
                await this.client.leaveRoom(this.roomId);
                return;
            }
            if (this.pet[attr] >= Schema.attributes[attr].max.warn) {
                await this.client.sendText(this.roomId, `Warning, high: ${attr} (${this.pet[attr]})`);
            }
        }
        await this.client.sendStateEvent(this.roomId, "org.bpulse.petrix.status", userId, this.pet);
    }
}