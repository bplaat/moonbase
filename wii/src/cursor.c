/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

#include "cursor.h"

#include <gccore.h>

#include "canvas.h"
#include "cursor_textures.h"
#include "cursor_textures_tpl.h"

Cursor cursors[4] = {0};

void cursor_init(void) {
    // Load cursor textures
    TPLFile cursor_tpl;
    TPL_OpenTPLFromMemory(&cursor_tpl, (void *)cursor_textures_tpl, cursor_textures_tpl_size);
    TPL_GetTexture(&cursor_tpl, id_cursor1, &cursors[0].texture);
    TPL_GetTexture(&cursor_tpl, id_cursor2, &cursors[1].texture);
    TPL_GetTexture(&cursor_tpl, id_cursor3, &cursors[2].texture);
    TPL_GetTexture(&cursor_tpl, id_cursor4, &cursors[3].texture);

    // Read cursors state
    WPAD_ScanPads();
    for (int32_t i = 0; i < 4; i++) {
        Cursor *cursor = &cursors[i];
        // uint32_t devtype;
        // WPAD_Probe(i, &devtype);
        // cursor->enabled = devtype == WPAD_EXP_NONE || devtype == WPAD_EXP_NUNCHUK || devtype == WPAD_EXP_CLASSIC;
        cursor->enabled = i == 0;
    }
}

void cursor_update(void) {
    // Read cursors state
    WPAD_ScanPads();
    for (int32_t i = 0; i < 4; i++) {
        Cursor *cursor = &cursors[i];
        if (cursor->enabled) {
            ir_t ir;
            WPAD_IR(i, &ir);
            cursor->x = ir.x;
            cursor->y = ir.y;
            cursor->angle = ir.angle;
            cursor->buttons_down = WPAD_ButtonsDown(i);
            cursor->buttons_held = WPAD_ButtonsHeld(i);
            cursor->buttons_up = WPAD_ButtonsUp(i);
        }
    }
}

void cursor_render(void) {
    // Draw enabled cursors on screen
    for (int32_t i = 0; i < 4; i++) {
        Cursor *cursor = &cursors[i];
        if (cursor->enabled) {
            guMtxRotDeg(canvas.transform_matrix, 'z', cursor->angle);
            canvas_draw_image(&cursor->texture, cursor->x - 96 / 2, cursor->y - 96 / 2, 96, 96, 0xffffffff);
        }
    }
    guMtxIdentity(canvas.transform_matrix);
}
