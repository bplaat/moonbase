/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

import { readFile } from 'fs/promises';

const unitTypes = JSON.parse(await readFile('src/units.json', { encoding: 'utf-8' }));

export default class Unit {
    constructor(typeId) {
        this.typeId = typeId;
    }

    static fromJson(jsonUnit) {
        return new Unit(jsonUnit.typeId);
    }

    get unitType() {
        return unitTypes.find(unitType => unitType.id === this.typeId);
    }

    toJson() {
        return { typeId: this.typeId };
    }
}

export { unitTypes };
