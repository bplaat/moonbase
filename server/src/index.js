/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

import { WebSocketServer } from 'ws';
import { MessageType } from './consts.js';
import Player from './game/Player.js';
import log from './log.js';

const players = [
    new Player(0, 'China', { red: 255, green: 0, blue: 0 }),
    new Player(1, 'European Union', { red: 0, green: 0, blue: 255 }),
    new Player(2, 'India', { red: 255, green: 255, blue: 0 }),
    new Player(3, 'United States', { red: 0, green: 255, blue: 0 }),
];

let clients = [];
function broadcast(message) {
    for (const client of clients) {
        client.send(message);
    }
}

let oldTime = 0;
function update() {
    setTimeout(update, 250);

    // Update players
    const time = performance.now();
    for (const player of players) {
        player.update((time - oldTime) / 1000);
    }
    oldTime = time;

    // Broadcast update

    let messageLength = 1;
    for (const player of players) {
        messageLength += 1 + 2 + player.name.length + 3 + 4 * 5 * 2;
    }
    const message = new ArrayBuffer(512);//messageLength);
    let pos = 0;
    const view = new DataView(message);
    view.setUint8(pos++, MessageType.PLAYERS_UPDATE);
    view.setUint8(pos++, players.length);
    for (const player of players) {
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
        view.setUint32(pos, player.housingUsed, true); pos += 4;
        view.setUint32(pos, player.housing, true); pos += 4;
    }
    broadcast(message);
}
update();

const wss = new WebSocketServer({ port: 8080 });


wss.on('connection', ws => {
    clients.push(ws);
    ws.on('message', (message) => {
        let pos = 0;
        const view = new DataView(message);
        const type = view.getUint8(pos++);

        if (type == MessageType.PLAYER_INC) {
            const playerId = view.getUint8(pos++);
            const resourceId = view.getUint8(pos++);
            const change = view.getFloat32(pos); pos += 4;
        }
        if (type == MessageType.PLAYER_DEC) {
            const playerId = view.getUint8(pos++);
            const resourceId = view.getUint8(pos++);
            const change = view.getFloat32(pos); pos += 4;
        }

        if (type == MessageType.UNIT_BUY) {
            const playerId = view.getUint8(pos++);
            const unitId = view.getUint8(pos++);
            const amount = view.getUint8(pos++);
        }

        if (type == MessageType.UNIT_SELL) {
            const playerId = view.getUint8(pos++);
            const unitId = view.getUint8(pos++);
            const amount = view.getUint8(pos++);
        }

        if (type == MessageType.UNIT_DESTROY) {
            const playerId = view.getUint8(pos++);
            const unitId = view.getUint8(pos++);
            const amount = view.getUint8(pos++);
        }

    });
    ws.on('error', log.error);
    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});
