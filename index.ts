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
import { Pet } from "./Pet";

client.on("room.message", handleCommand);

let rooms = {};

client.start().then(() => {
    console.log("Client started!");
    startup();
    tick();
});

async function startup() {
    const joinedRooms = await client.getJoinedRooms();
    joinedRooms.forEach(roomId => {
        rooms[roomId] = new Pet(client, roomId);
    })
}

async function handleCommand(roomId, event) {

    if (event.sender === userId) {
        return;
    }

    if (event.content.body.startsWith("!pet")) {
        let words = event.content.body.split(" ");
        if (!words[1] || words[1] === "" || words[1] === "help") {
            sendHelp(roomId);
        }
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
        await rooms[roomId].sendStatus();
    }
    if (event.content.body.includes("rooms")) {
        await sendRoomList(roomId);
    }
    if (event.content.body.includes("name")) {
        await rooms[roomId].setName(event.content.body);
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
        if (pet[attr] >= Schema.attributes[attr].max.warn) {
            await client.sendText(roomId, `Warning, high: ${attr} (${pet[attr]})`);
        }
    }
    await client.sendStateEvent(roomId, "org.bpulse.petrix.status", userId, pet);
}

async function sendRoomList(roomId) {
    let joinedRooms = await client.getJoinedRooms();
    await client.sendNotice(roomId, JSON.stringify(joinedRooms))
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

function sendHelp(roomId) {
    client.sendNotice(roomId, 
        `I respond to messages starting with !pet, followed by one of these words:\n
        status feed play`);
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
