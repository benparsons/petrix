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
    refreshRooms();
    tickAll();
});

async function refreshRooms() {
    rooms = {};
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
        if (words[1] === "status") {
            await rooms[roomId].sendStatus();
        }
        if (words[1] === "name" || words[1] === "rename") {
            await rooms[roomId].setName(words.slice(2).join(" "));
        }
        if (words[1] === "new") {
            try {
                const petRoomId = await client.createRoom({});
                client.sendNotice(roomId, `Inviting ${event.sender} to ${petRoomId}.`)
                await client.inviteUser(event.sender, petRoomId);
                await refreshRooms();
                rooms[petRoomId].init();
            }
            catch (ex) {
                console.log(ex);
            }
        }
        if (words[1] === "init") {
            await rooms[roomId].init();
        }
        for (let action of Object.keys(Schema.actions)) {
            if (words[1] === action) {
                await doAction(roomId, action, Schema.actions);
            }
        }
    }

    
    if (event.content.body.includes("tick")) {
        await rooms[roomId].tick();
    }
    if (event.content.body.includes("rooms")) {
        await sendRoomList(roomId);
    }
}


async function tickAll() {
    try {
        await refreshRooms();
        for (let roomId of Object.keys(rooms)) {
            await rooms[roomId].tick();
        }
    }
    catch (err) {
        console.log(err);
    }

    setTimeout(() => {
        tickAll()
    }, 100 * 1000);
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
        status feed play name`);
}

// const polka = require('polka'); 
// import { readFileSync } from 'fs';

// polka()
//   .get('/get-pet/:roomid', async (req, res) => {
//       var pet = await getPetFromRoom(req.params.roomid)
//       console.log(pet);
//       res.writeHead(200, {
//         'Content-Type': 'application/json'
//       });
//       res.end(JSON.stringify(pet))
//       res
//   })
//   .get('/:path', (req, res) => {
//     const file = readFileSync(`./canvas/${req.params.path}`, 'utf-8');
//     res.end(file);
//   })
//   .listen(3584, err => {
//     if (err) throw err;
//     console.log(`> Running on localhost:3584`);
//   });
