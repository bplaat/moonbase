/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

import { WebSocketServer } from 'ws';
import { MessageType } from './consts.js';
import World from './game/World.js';
import log from './log.js';
import { exists } from './utils.js';

// Game state
const world = new World();
if (await exists('data.json')) {
    world.load('data.json');
}

// Websocket server
let clients = [];
function broadcast(message) {
    for (const client of clients) {
        client.send(message);
    }
}

function broadcastPlayersUpdate() {
    let messageLength = 1 + 1;
    for (const player of world.players) {
        messageLength += 1 + 2 + player.name.length + 3 + 4 * 12;
    }
    const message = new ArrayBuffer(messageLength);
    let pos = 0;
    const view = new DataView(message);
    view.setUint8(pos++, MessageType.PLAYERS_UPDATE);
    view.setUint8(pos++, world.players.length);
    for (const player of world.players) {
        view.setUint8(pos++, player.id);
        view.setUint16(pos, player.name.length, true); pos += 2;
        for (let j = 0; j < player.name.length; j++) {
            view.setUint8(pos++, player.name.charCodeAt(j));
        }
        view.setUint8(pos++, player.color.red);
        view.setUint8(pos++, player.color.green);
        view.setUint8(pos++, player.color.blue);

        view.setFloat32(pos, player.moonstone, true); pos += 4;
        view.setFloat32(pos, player.moonstoneInc, true); pos += 4;
        view.setFloat32(pos, player.energy, true); pos += 4;
        view.setFloat32(pos, player.energyInc, true); pos += 4;
        view.setFloat32(pos, player.food, true); pos += 4;
        view.setFloat32(pos, player.foodInc, true); pos += 4;
        view.setFloat32(pos, player.water, true); pos += 4;
        view.setFloat32(pos, player.waterInc, true); pos += 4;
        view.setFloat32(pos, player.oxygen, true); pos += 4;
        view.setFloat32(pos, player.oxygenInc, true); pos += 4;
        view.setFloat32(pos, player.housingUsed, true); pos += 4;
        view.setFloat32(pos, player.housing, true); pos += 4;
    }
    broadcast(message);
}

const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', ws => {
    clients.push(ws);
    ws.on('message', (message) => {
        let pos = 0;
        const view = new DataView(message);
        const type = view.getUint8(pos++);

        // if (type == MessageType.PLAYER_INC) {
        //     const playerId = view.getUint8(pos++);
        //     const resourceId = view.getUint8(pos++);
        //     const change = view.getFloat32(pos); pos += 4;
        // }
        // if (type == MessageType.PLAYER_DEC) {
        //     const playerId = view.getUint8(pos++);
        //     const resourceId = view.getUint8(pos++);
        //     const change = view.getFloat32(pos); pos += 4;
        // }

        // if (type == MessageType.UNIT_BUY) {
        //     const playerId = view.getUint8(pos++);
        //     const unitId = view.getUint8(pos++);
        //     const amount = view.getUint8(pos++);
        // }

        // if (type === MessageType.UNIT_SELL) {
        //     const playerId = view.getUint8(pos++);
        //     const unitId = view.getUint8(pos++);
        //     const amount = view.getUint8(pos++);
        // }

        // if (type === MessageType.UNIT_DESTROY) {
        //     const playerId = view.getUint8(pos++);
        //     const unitId = view.getUint8(pos++);
        //     const amount = view.getUint8(pos++);
        // }

    });
    ws.on('error', log.error);
    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});

// Game loop
let saveTime = 0;
let oldTime = 0;
function update() {
    const time = performance.now();
    world.update((time - oldTime) / 1000);
    oldTime = time;

    if (performance.now() - saveTime >= 10000) {
        saveTime = performance.now();
        world.save('data.json');
    }

    broadcastPlayersUpdate();

    setTimeout(update, 250);
}
update();
