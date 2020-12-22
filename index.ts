import {
    MatrixClient,
    SimpleFsStorageProvider,
    AutojoinRoomsMixin,
    LogService
} from "matrix-bot-sdk";
import {LogWrapper} from "./LogWrapper";

const homeserverUrl = require("./config/config.json").homeserver;
const accessToken = require("./config/config.json").accessToken;
const userId = require("./config/config.json").userId;
const storage = new SimpleFsStorageProvider("config/storage.json");
const testRoom = "!CtTvtZfObCTrbLBmlh:bpulse.org";
const client = new MatrixClient(homeserverUrl, accessToken, storage);
const logWrapper = new LogWrapper();
LogService.setLogger(logWrapper);
AutojoinRoomsMixin.setupOnClient(client);
import Schema from "./schema";

client.on("room.message", handleCommand);

client.start().then(() => {
    console.log("Client started!");
    tick();
});

async function handleCommand(roomId, event) {

    if (event.sender === userId) {
        return;
    }

    if (event.content.body.includes("new")) {
        try {
            const petRoomId = await client.createRoom({});
            client.sendNotice(roomId, `Inviting ${event.sender} to ${petRoomId}.`)
            await client.inviteUser(event.sender, petRoomId);
            initPet(petRoomId);
        }
        catch (ex) {
            console.log(ex);
        }
    }
    if (event.content.body.includes("init")) {
        await initPet(roomId);
    }
    if (event.content.body.includes("tick")) {
        await tickRoom(roomId);
    }
    if (event.content.body.includes("status")) {
        await sendStatus(roomId);
    }
    if (event.content.body.includes("rooms")) {
        await sendRoomList(roomId);
    }
    if (event.content.body.includes("name")) {
        await sendPetName(roomId, event.content.body);
    }
    
    for (let action of Object.keys(Schema.actions)) {
        if (event.content.body.includes(action)) {
            await doAction(roomId, action, Schema.actions);
        }
    }
}

async function initPet(roomId) {
    const status = {  };
    for (let attribute of Object.keys(Schema.attributes)) {
        status[attribute] = Schema.attributes[attribute].initValue;
    }
    try {
        await client.sendStateEvent(roomId, "org.bpulse.petrix.status", userId, status);
    }
    catch(ex) {
        console.log(ex);
    }
    
}
async function tick() {
    try {
        const rooms = await client.getJoinedRooms();
        for (let roomId of rooms) {
            await tickRoom(roomId);
        }
    }
    catch (err) {
        console.log(err);
    }
    
    
    setTimeout(() => {
        tick()
    }, 100 * 1000);
}

async function tickRoom(roomId) {
    const pet = await getPetFromRoom(roomId);
    if (!pet) { return; }

    for (let attr of Object.keys(pet)) {
        pet[attr] += Schema.attributes[attr].tickDelta;
        if (pet[attr] <= Schema.attributes[attr].min.limit) {
            await client.sendText(roomId, `Pet died due to low ${attr}`);
            await client.leaveRoom(roomId);
            return;
        }
        if (pet[attr] <= Schema.attributes[attr].min.warn) {
            await client.sendText(roomId, `Warning, low: ${attr} (${pet[attr]})`);
        }
        if (pet[attr] >= Schema.attributes[attr].max.limit) {
            await client.sendText(roomId, `Pet died due to high ${attr}`);
            await client.leaveRoom(roomId);
            return;
        }
    }
    await client.sendStateEvent(roomId, "org.bpulse.petrix.status", userId, pet);
}

async function sendStatus(roomId) {
    const pet = await getPetFromRoom(roomId)
    await client.sendNotice(roomId, JSON.stringify(pet))
}

async function sendRoomList(roomId) {
    const rooms = await client.getJoinedRooms();
    await client.sendNotice(roomId, JSON.stringify(rooms))
}

async function sendPetName(roomId, name) {
    try {
        await client.sendStateEvent(roomId, "m.room.member", userId, {
            "membership": "join",
            "displayname": name});
    }
    catch (ex) {
        console.log(ex);
    }
}

async function doAction(roomId, action, actions) {
    const pet = await getPetFromRoom(roomId);
    actions[action].forEach((effect) => {
        pet[effect.attribute] += effect.delta;
    })
    await client.sendStateEvent(roomId, "org.bpulse.petrix.status", userId, pet);
    await client.sendNotice(roomId, JSON.stringify(pet))
}

async function getPetFromRoom(roomId) {
    const state = await client.getRoomState(roomId);
    const pet = state.find(s => s.type==="org.bpulse.petrix.status"&&s.state_key===userId)
    
    
    return pet ? pet.content : undefined;
}

const polka = require('polka'); 
import { readFileSync } from 'fs';

polka()
  .get('/get-pet/:roomid', async (req, res) => {
      var pet = await getPetFromRoom(req.params.roomid)
      console.log(pet);
      res.writeHead(200, {
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify(pet))
      res
  })
  .get('/:path', (req, res) => {
    const file = readFileSync(`./canvas/${req.params.path}`, 'utf-8');
    res.end(file);
  })
  .listen(3584, err => {
    if (err) throw err;
    console.log(`> Running on localhost:3584`);
  });
