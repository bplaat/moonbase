/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

import { readFile } from 'fs/promises';
import { WebSocketServer } from 'ws';
import { MessageType } from './consts.js';
import World from './game/World.js';
import Unit, { unitTypes } from './game/Unit.js';
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

function broadcastPlayerUpdate(player) {
    const message = new ArrayBuffer(1 + 1 + 2 + player.name.length + 3 + 12 * 4 + 2 + player.units.length);
    const view = new DataView(message);
    let pos = 0;
    view.setUint8(pos++, MessageType.PLAYER_UPDATE);
    view.setUint8(pos++, player.id);
    view.setUint16(pos, player.name.length); pos += 2;
    for (let j = 0; j < player.name.length; j++) {
        view.setUint8(pos++, player.name.charCodeAt(j));
    }
    view.setUint8(pos++, player.color.red);
    view.setUint8(pos++, player.color.green);
    view.setUint8(pos++, player.color.blue);

    view.setFloat32(pos, player.moonstone); pos += 4;
    view.setFloat32(pos, player.moonstoneInc); pos += 4;
    view.setFloat32(pos, player.energy); pos += 4;
    view.setFloat32(pos, player.energyInc); pos += 4;
    view.setFloat32(pos, player.food); pos += 4;
    view.setFloat32(pos, player.foodInc); pos += 4;
    view.setFloat32(pos, player.water); pos += 4;
    view.setFloat32(pos, player.waterInc); pos += 4;
    view.setFloat32(pos, player.oxygen); pos += 4;
    view.setFloat32(pos, player.oxygenInc); pos += 4;
    view.setFloat32(pos, player.housingUsed); pos += 4;
    view.setFloat32(pos, player.housing); pos += 4;

    view.setUint16(pos, player.units.length); pos += 2;
    for (const unit of player.units) {
        view.setUint8(pos++, unit.typeId);
    }
    broadcast(message);
}

const wss = new WebSocketServer({ port: 8080 });
log.info('Websocket server is listening on: ws://localhost:8080/');
wss.on('connection', (ws) => {
    clients.push(ws);
    ws.on('message', async (message) => {
        const data = new Uint8Array(message.byteLength);
        message.copy(data, 0);
        const view = new DataView(data.buffer);
        let pos = 0;
        const type = view.getUint8(pos++);

        if (type === MessageType.PLAYER_MODIFY) {
            const playerId = view.getUint8(pos++);
            const player = world.players.find(player => player.id === playerId);
            player.moonstone = Math.max(player.moonstone + view.getFloat32(pos), 0); pos += 4;
            player.energy = Math.max(player.energy + view.getFloat32(pos), 0); pos += 4;
            player.food = Math.max(player.food + view.getFloat32(pos), 0); pos += 4;
            player.water = Math.max(player.water + view.getFloat32(pos), 0); pos += 4;
            player.oxygen = Math.max(player.oxygen + view.getFloat32(pos), 0); pos += 4;
            world.save('data.json');
        }

        if (type === MessageType.UNIT_BUY) {
            const playerId = view.getUint8(pos++);
            const player = world.players.find(player => player.id === playerId);
            const unitTypeId = view.getUint8(pos++);
            const unitType = unitTypes.find(unitType => unitType.id === unitTypeId);
            if (
                player.moonstone >= (unitType.price.moonstone || 0) &&
                player.energy >= (unitType.price.moonstone || 0) &&
                player.food >= (unitType.price.food || 0) &&
                player.water >= (unitType.price.water || 0) &&
                player.oxygen >= (unitType.price.oxygen || 0) &&
                player.housing - player.housingUsed >= (unitType.inc.housingUsed || 0)
            ) {
                player.moonstone -= unitType.price.moonstone || 0;
                player.energy -= unitType.price.energy || 0;
                player.food -= unitType.price.food || 0;
                player.water -= unitType.price.water || 0;
                player.oxygen -= unitType.price.oxygen || 0;

                player.units.push(new Unit(unitTypeId));
                player.calcInc();
                world.save('data.json');
            }
        }

        if (type === MessageType.UNIT_SELL) {
            const playerId = view.getUint8(pos++);
            const player = world.players.find(player => player.id === playerId);
            const unitTypeId = view.getUint8(pos++);
            const unit = player.units.find(unit => unit.typeId === unitTypeId);
            if (unit !== null) {
                player.moonstone += (unit.unitType.price.moonstone || 0) / 2;
                player.energy += (unit.unitType.price.energy || 0) / 2;
                player.food += (unit.unitType.price.food || 0) / 2;
                player.water += (unit.unitType.price.water || 0) / 2;
                player.oxygen += (unit.unitType.price.oxygen || 0) / 2;

                player.units.splice(player.units.indexOf(unit), 1);
                player.calcInc();
                world.save('data.json');
            }
        }

        if (type === MessageType.UNIT_DESTROY) {
            const playerId = view.getUint8(pos++);
            const player = world.players.find(player => player.id === playerId);
            const unitTypeId = view.getUint8(pos++);
            const unit = player.units.find(unit => unit.typeId === unitTypeId);
            if (unit !== null) {
                player.units.splice(player.units.indexOf(unit), 1);
                player.calcInc();
                world.save('data.json');
            }
        }

        if (type == MessageType.UNIT_TYPES_JSON_REQ) {
            const unitTypesJson = await readFile('src/units.json', { encoding: 'utf-8' });
            const message = new ArrayBuffer(1 + unitTypesJson.length);
            const view = new DataView(message);
            let pos = 0;
            view.setUint8(pos++, MessageType.UNIT_TYPES_JSON_RES);
            for (let j = 0; j < unitTypesJson.length; j++) {
                view.setUint8(pos++, unitTypesJson.charCodeAt(j));
            }
            ws.send(message);
        }
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

    for (const player of world.players) {
        broadcastPlayerUpdate(player);
    }

    setTimeout(update, 250);
}
update();
