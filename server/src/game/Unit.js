/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

import { readFile } from 'fs/promises';
import unitTypes from '../units.json' with { type: 'json' };

export default class Unit {
    constructor(typeId) {
        this.typeId = typeId;
    }

    static fromJson(jsonUnit) {
        return new Unit(jsonUnit.typeId);
    }

    toJson() {
        return { typeId: this.typeId };
    }
}

export { unitTypes };
