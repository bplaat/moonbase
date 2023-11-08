/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

import Unit, { unitTypes } from './Unit.js';

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
            const unitType = unitTypes.find((unitType) => unitType.id === unit.typeId);
            if ('moonstone' in unitType.inc) this.moonstoneInc += unitType.inc.moonstone;
            if ('energy' in unitType.inc) this.energyInc += unitType.inc.energy;
            if ('food' in unitType.inc) this.foodInc += unitType.inc.food;
            if ('water' in unitType.inc) this.waterInc += unitType.inc.water;
            if ('oxygen' in unitType.inc) this.oxygenInc += unitType.inc.oxygen;
            if ('housingUsed' in unitType.inc) this.housingUsed += unitType.inc.housingUsed;
            if ('housing' in unitType.inc) this.housing += unitType.inc.housing;
        }
    }

    update(delta) {
        this.energy += (this.energyInc / 60) * delta;
        if (this.energy < 0) this.energy = 0;

        if (this.energy > 0) {
            this.moonstone += (this.moonstoneInc / 60) * delta;
            if (this.moonstone < 0) this.moonstone = 0;
            this.food += (this.foodInc / 60) * delta;
            if (this.food < 0) this.food = 0;
            this.water += (this.waterInc / 60) * delta;
            if (this.water < 0) this.water = 0;
            this.oxygen += (this.oxygenInc / 60) * delta;
            if (this.oxygen < 0) this.oxygen = 0;
        }
    }
}
