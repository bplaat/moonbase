/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

import { access } from 'fs/promises';

export async function exists(path) {
    try {
        await access(path);
        return true;
    } catch {
        return false;
    }
}
