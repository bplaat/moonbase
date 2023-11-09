/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

import Unit from './Unit.js';

export default class Player {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;

        this.moonstone = 0;
        this.moonstoneInc = 0;
        this.energy = 0;
        this.energyInc = 0;
        this.food = 0;
        this.foodInc = 0;
        this.water = 0;
        this.waterInc = 0;
        this.oxygen = 0;
        this.oxygenInc = 0;
        this.housingUsed = 0;
        this.housing = 0;

        this.units = [new Unit(0)];
        this.calcInc();
    }

    static fromJson(jsonPlayer) {
        const player = new Player(jsonPlayer.id, jsonPlayer.name, jsonPlayer.color);
        player.moonstone = jsonPlayer.moonstone;
        player.energy = jsonPlayer.energy;
        player.food = jsonPlayer.food;
        player.water = jsonPlayer.water;
        player.oxygen = jsonPlayer.oxygen;

        player.units = [];
        for (const jsonUnit of jsonPlayer.units) {
            player.units.push(Unit.fromJson(jsonUnit));
        }
        player.calcInc();
        return player;
    }

    toJson() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            moonstone: this.moonstone,
            energy: this.energy,
            food: this.food,
            water: this.water,
            oxygen: this.oxygen,
            units: this.units.map((unit) => unit.toJson()),
        };
    }

    calcInc() {
        this.moonstoneInc = 0;
        this.energyInc = 0;
        this.foodInc = 0;
        this.waterInc = 0;
        this.oxygenInc = 0;
        this.housingUsed = 0;
        this.housing = 0;

        for (const unit of this.units) {
            if ('moonstone' in unit.unitType.inc) this.moonstoneInc += unit.unitType.inc.moonstone;
            if ('energy' in unit.unitType.inc) this.energyInc += unit.unitType.inc.energy;
            if ('food' in unit.unitType.inc) this.foodInc += unit.unitType.inc.food;
            if ('water' in unit.unitType.inc) this.waterInc += unit.unitType.inc.water;
            if ('oxygen' in unit.unitType.inc) this.oxygenInc += unit.unitType.inc.oxygen;
            if ('housingUsed' in unit.unitType.inc) this.housingUsed += unit.unitType.inc.housingUsed;
            if ('housing' in unit.unitType.inc) this.housing += unit.unitType.inc.housing;
        }
    }

    update(delta) {
        this.energy = Math.max(this.energy + (this.energyInc / 60) * delta, 0);
        if (this.energy > 0) {
            this.moonstone = Math.max(this.moonstone + (this.moonstoneInc / 60) * delta, 0);
            this.food = Math.max(this.food + (this.foodInc / 60) * delta, 0);
            this.water = Math.max(this.water + (this.waterInc / 60) * delta, 0);
            this.oxygen = Math.max(this.oxygen + (this.oxygenInc / 60) * delta, 0);
        }
    }
}
