/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

const SERVER_PORT = 8080;

const MessageType = {
    PLAYER_UPDATE: 0x00,
    PLAYER_MODIFY: 0x01,
    UNIT_BUY: 0x10,
    UNIT_SELL: 0x11,
    UNIT_DESTROY: 0x12,
};

export { SERVER_PORT, MessageType };
