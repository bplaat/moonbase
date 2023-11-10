/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

import { readFile, writeFile } from 'fs/promises';
import Player from './Player.js';

export default class World {
    constructor() {
        this.players = [
            new Player(0, 'China', { red: 255, green: 0, blue: 0 }),
            new Player(1, 'Europese Unie', { red: 0, green: 100, blue: 255 }),
            new Player(2, 'India', { red: 255, green: 255, blue: 0 }),
            new Player(3, 'Verenigde Staten', { red: 0, green: 255, blue: 0 }),
        ];
    }

    async load(path) {
        const { players: jsonPlayers } = JSON.parse(await readFile(path, { encoding: 'utf-8' }));
        this.players = [];
        for (const jsonPlayer of jsonPlayers) {
            this.players.push(Player.fromJson(jsonPlayer));
        }
    }

    async save(path) {
        await writeFile(
            path,
            JSON.stringify({
                players: this.players.map((player) => player.toJson()),
            })
        );
    }

    update(delta) {
        for (const player of this.players) {
            player.update(delta);
        }
    }
}
