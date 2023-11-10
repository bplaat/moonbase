/*
 * Copyright (c) 2023, Bastiaan van der Plaat <bastiaan.v.d.plaat@gmail.com>
 *
 * SPDX-License-Identifier: MIT
 */

#include <gccore.h>
#include <malloc.h>
#include <network.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wiiuse/wpad.h>

#include "canvas.h"
#include "cursor.h"

#define DEFAULT_FIFO_SIZE (256 * 1024)

GXRModeObj *screenmode;

// Poweroff callbacks
bool running = true;

void poweroff(void) { running = false; }

void wpad_poweroff(int32_t chan) {
    if (chan == WPAD_CHAN_ALL) {
        running = false;
    }
}

// Websocket stuff
#define MESSAGE_TYPE_PLAYER_UPDATE 0x01

typedef struct Player {
    uint8_t id;
    char name[64];
    struct {
        uint8_t red;
        uint8_t green;
        uint8_t blue;
    } color;
    float moonstone;
    float moonstoneInc;
    float energy;
    float energyInc;
    float food;
    float foodInc;
    float water;
    float waterInc;
    float oxygen;
    float oxygenInc;
    float housingUsed;
    float housing;
} Player;

size_t player_size = 0;
Player players[4] = {0};

void websocket_message(uint8_t *message, size_t size) {
    size_t pos = 0;
    uint8_t type = message[pos++];

    if (type == MESSAGE_TYPE_PLAYER_UPDATE) {
        uint8_t playerId = message[pos++];
        Player *player = NULL;
        for (size_t i = 0; i < player_size; i++) {
            if (players[i].id == playerId) {
                player = &players[i];
                break;
            }
        }
        if (player == NULL) {
            player = &players[player_size++];
        }

        player->id = playerId;
        size_t nameLength = *(uint16_t *)&message[pos];
        pos += 2;
        for (size_t i = 0; i < nameLength; i++) {
            player->name[i] = message[pos++];
        }
        player->name[nameLength] = '\0';
        player->color.red = message[pos++];
        player->color.green = message[pos++];
        player->color.blue = message[pos++];

        player->moonstone = *(float *)&message[pos];
        pos += 4;
        player->moonstoneInc = *(float *)&message[pos];
        pos += 4;
        player->energy = *(float *)&message[pos];
        pos += 4;
        player->energyInc = *(float *)&message[pos];
        pos += 4;
        player->food = *(float *)&message[pos];
        pos += 4;
        player->foodInc = *(float *)&message[pos];
        pos += 4;
        player->water = *(float *)&message[pos];
        pos += 4;
        player->waterInc = *(float *)&message[pos];
        pos += 4;
        player->oxygen = *(float *)&message[pos];
        pos += 4;
        player->oxygenInc = *(float *)&message[pos];
        pos += 4;
        player->housingUsed = *(float *)&message[pos];
        pos += 4;
        player->housing = *(float *)&message[pos];
        pos += 4;
    }
}

int main(void) {
    // Init video
    VIDEO_Init();
    VIDEO_SetBlack(true);

    // Get screen mode
    screenmode = VIDEO_GetPreferredMode(NULL);
    VIDEO_Configure(screenmode);
    if (CONF_GetAspectRatio() == CONF_ASPECT_16_9) {
        screenmode->viWidth = (float)screenmode->viHeight * (16.f / 9.f);
    }

    // Alloc two framebuffers to toggle between
    void *frame_buffers[] = {MEM_K0_TO_K1(SYS_AllocateFramebuffer(screenmode)),
                             MEM_K0_TO_K1(SYS_AllocateFramebuffer(screenmode))};
    uint32_t fb_index = 0;
    VIDEO_SetNextFramebuffer(frame_buffers[fb_index]);

    // Wait for next frame
    VIDEO_Flush();
    VIDEO_WaitVSync();
    if (screenmode->viTVMode & VI_NON_INTERLACE) VIDEO_WaitVSync();

    // Init gx fifo buffer
    uint8_t *gx_fifo = MEM_K0_TO_K1(memalign(32, DEFAULT_FIFO_SIZE));
    memset(gx_fifo, 0, DEFAULT_FIFO_SIZE);
    GX_Init(gx_fifo, DEFAULT_FIFO_SIZE);

    // Init other gx stuff
    GX_SetViewport(0, 0, screenmode->fbWidth, screenmode->efbHeight, 0, 1);
    float yscale = GX_GetYScaleFactor(screenmode->efbHeight, screenmode->xfbHeight);
    uint32_t xfbHeight = GX_SetDispCopyYScale(yscale);
    GX_SetDispCopySrc(0, 0, screenmode->fbWidth, screenmode->efbHeight);
    GX_SetDispCopyDst(screenmode->fbWidth, xfbHeight);
    GX_SetCopyFilter(screenmode->aa, screenmode->sample_pattern, GX_TRUE, screenmode->vfilter);
    GX_SetFieldMode(screenmode->field_rendering,
                    ((screenmode->viHeight == 2 * screenmode->xfbHeight) ? GX_ENABLE : GX_DISABLE));
    GX_SetDispCopyGamma(GX_GM_1_0);

    GX_ClearVtxDesc();
    GX_InvVtxCache();
    GX_InvalidateTexAll();
    VIDEO_SetBlack(false);

    // Init wpad buttons
    WPAD_Init();
    WPAD_SetDataFormat(WPAD_CHAN_ALL, WPAD_FMT_BTNS_ACC_IR);
    WPAD_SetVRes(0, screenmode->viWidth, screenmode->viHeight);

    // Set power off handlers
    SYS_SetPowerCallback(poweroff);
    WPAD_SetPowerButtonCallback(wpad_poweroff);

    // Init stuff
    canvas_init();
    cursor_init();

    // Connect to websocket server
    net_init();

    int socketfd = net_socket(AF_INET, SOCK_STREAM, IPPROTO_IP);
    struct hostent *hp = net_gethostbyname("localhost");
    struct sockaddr_in server_address;
    server_address.sin_family = AF_INET;
    server_address.sin_port = htons(8080);
    memcpy((char *)&server_address.sin_addr, hp->h_addr_list[0], hp->h_length);
    net_connect(socketfd, (struct sockaddr *)&server_address, sizeof(server_address));

    const char *upgrade_request =
        "GET / HTTP/1.1\r\n"
        "Host: localhost:8080\r\n"
        "Connection: Upgrade\r\n"
        "Upgrade: websocket\r\n"
        "Sec-WebSocket-Version: 13\r\n"
        "Sec-WebSocket-Key: 2cN9hgbncbm4s4W9z0/fKQ==\r\n\r\n";
    net_send(socketfd, upgrade_request, strlen(upgrade_request), 0);

    uint8_t buffer[1024];
    net_recv(socketfd, buffer, sizeof(buffer), 0);

    // Game loop
    while (running) {
        // Read buttons
        cursor_update();
        for (int32_t i = 0; i < 4; i++) {
            Cursor *cursor = &cursors[i];
            if (cursor->enabled) {
                if (cursor->buttons_down & WPAD_BUTTON_HOME) running = false;
            }
        }

        // Read incoming websocket messages
        int bytes_read = net_recv(socketfd, buffer, sizeof(buffer), 0);
        if (bytes_read > 0) {
            uint8_t frame_type = buffer[0] & 15;
            if (frame_type == 2) {
                uint8_t playload_size = buffer[1] & 127;
                if (playload_size == 126) {
                    websocket_message(&buffer[2 + 2], *(uint16_t *)&buffer[2]);
                } else if (playload_size == 127) {
                    websocket_message(&buffer[2 + 4], *(uint32_t *)&buffer[2]);
                } else {
                    websocket_message(&buffer[2], playload_size);
                }
            }
        }

        // ### Draw Screen ###
        canvas_begin(screenmode->viWidth, screenmode->viHeight);

        float y = 0;
        for (size_t i = 0; i < player_size; i++) {
            Player *player = &players[i];

            canvas_fill_rect(0, y, screenmode->viWidth, screenmode->viHeight / player_size,
                             ((player->color.blue >> 1) << 8) | ((player->color.green >> 1) << 16) |
                                 ((player->color.red >> 1) << 25) | 0xff);

            int columns = 4;
            float x = 0;
            float y0 = y + (screenmode->viHeight / player_size - 32) / 2;
            canvas_fill_text(player->name, x + 16, y0, 32, 0xffffffff);
            x += screenmode->viWidth / columns;

            y0 = y + (screenmode->viHeight / player_size - 32 - 8 - 32) / 2;
            char buffer[255];
            sprintf(buffer, u8"🪨 %d +%d", (int)player->moonstone, (int)player->moonstoneInc);
            canvas_fill_text(buffer, x, y0, 32, 0xffffffff);
            x += screenmode->viWidth / columns;

            sprintf(buffer, u8"⚡ %d +%d", (int)player->energy, (int)player->energyInc);
            canvas_fill_text(buffer, x, y0, 32, 0xffffffff);
            x += screenmode->viWidth / columns;

            sprintf(buffer, u8"🥩 %d +%d", (int)player->food, (int)player->foodInc);
            canvas_fill_text(buffer, x, y0, 32, 0xffffffff);

            x = screenmode->viWidth / columns;
            y0 = y + (screenmode->viHeight / player_size - 32 - 8 - 32) / 2 + 32 + 8;
            sprintf(buffer, u8"💧 %d +%d", (int)player->water, (int)player->waterInc);
            canvas_fill_text(buffer, x, y0, 32, 0xffffffff);
            x += screenmode->viWidth / columns;

            sprintf(buffer, u8"☁️ %d +%d", (int)player->oxygen, (int)player->oxygenInc);
            canvas_fill_text(buffer, x, y0, 32, 0xffffffff);
            x += screenmode->viWidth / columns;

            sprintf(buffer, u8"🏠 %d / %d", (int)player->housingUsed, (int)player->housing);
            canvas_fill_text(buffer, x, y0, 32, 0xffffffff);

            y += screenmode->viHeight / player_size;
        }

        cursor_render();
        canvas_end();

        // Set clear color for next frame
        GX_SetCopyClear((GXColor){128, 128, 128, 255}, GX_MAX_Z24);

        // Present framebuffer
        GX_DrawDone();
        fb_index ^= 1;
        GX_CopyDisp(frame_buffers[fb_index], GX_TRUE);
        VIDEO_SetNextFramebuffer(frame_buffers[fb_index]);

        // Wait for next frame
        VIDEO_Flush();
        VIDEO_WaitVSync();
        if (screenmode->viTVMode & VI_NON_INTERLACE) VIDEO_WaitVSync();
    }

    net_close(socketfd);

    // Disconnect wpads
    WPAD_Disconnect(WPAD_CHAN_ALL);
    return 0;
}
