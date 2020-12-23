import {
    MatrixClient
} from "matrix-bot-sdk";
import { PetSchema } from "./PetSchema";
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
        await this.client.sendNotice(this.roomId, JSON.stringify(this.pet, null, 2))
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
        for (let attribute of Object.keys(PetSchema.attributes)) {
            status[attribute] = PetSchema.attributes[attribute].initValue;
        }
        try {
            let powerLevels = await this.client.getRoomStateEvent(this.roomId, "m.room.power_levels", "");
            //console.log(powerLevels);
            powerLevels.invite = 0;
            await this.client.sendStateEvent(this.roomId, "m.room.power_levels", "", powerLevels);
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
            this.pet[attr] += PetSchema.attributes[attr].tickDelta;
            if (this.pet[attr] <= PetSchema.attributes[attr].min.limit) {
                await this.client.sendText(this.roomId, `Pet died due to low ${attr}`);
                await this.client.leaveRoom(this.roomId);
                return;
            }
            if (this.pet[attr] <= PetSchema.attributes[attr].min.warn) {
                await this.client.sendText(this.roomId, `Warning, low: ${attr} (${this.pet[attr]})`);
            }
            if (this.pet[attr] >= PetSchema.attributes[attr].max.limit) {
                await this.client.sendText(this.roomId, `Pet died due to high ${attr}`);
                await this.client.leaveRoom(this.roomId);
                return;
            }
            if (this.pet[attr] >= PetSchema.attributes[attr].max.warn) {
                await this.client.sendText(this.roomId, `Warning, high: ${attr} (${this.pet[attr]})`);
            }
        }
        await this.client.sendStateEvent(this.roomId, "org.bpulse.petrix.status", userId, this.pet);
    }

    async doAction(action, actions) {
        await this.refresh();
        actions[action].forEach((effect) => {
            this.pet[effect.attribute] += effect.baseDelta;
        })
        await this.client.sendStateEvent(this.roomId, "org.bpulse.petrix.status", userId, this.pet);
        this.sendStatus();
    }
}