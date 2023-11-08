/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default class Player {
    constructor(id, name, color) {
        this.id = id;
        this.name = name;
        this.color = color;

        this.moonstone = 0;
        this.moonstoneInc = rand(50, 100);
        this.energy = 0;
        this.energyInc = -5;
        this.food = 0;
        this.foodInc = 0;
        this.water = 0;
        this.waterInc = 0;
        this.oxygen = 0;
        this.oxygenInc = 0;
    }

    update(delta) {
        this.moonstone += (this.moonstoneInc / 60) * delta;
        if (this.moonstone < 0) this.moonstone = 0;
        this.energy += (this.energyInc / 60) * delta;
        if (this.energy < 0) this.energy = 0;
        this.food += (this.foodInc / 60) * delta;
        if (this.food < 0) this.food = 0;
        this.water += (this.waterInc / 60) * delta;
        if (this.water < 0) this.water = 0;
        this.oxygen += (this.oxygenInc / 60) * delta;
        if (this.oxygen < 0) this.oxygen = 0;
    }
}
