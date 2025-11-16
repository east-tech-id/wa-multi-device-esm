import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, } from "baileys";
import path from "path";
import qrTerminal from "qrcode-terminal";
import fs from "fs";
import pino from "pino";
import { CALLBACK_KEY, CREDENTIALS, Messages } from "../Defaults/index.js";
import { saveAudioHandler, saveDocumentHandler, saveImageHandler, saveVideoHandler, } from "../Utils/save-media.js";
import { WhatsappError } from "../Error/index.js";
import { parseMessageStatusCodeToReadable } from "../Utils/message-status.js";
import { getSQLiteSessionIds, useSQLiteAuthState } from "../Store/Sqlite.js";
const sessions = new Map();
const callback = new Map();
const retryCount = new Map();
const P = pino({
    level: "silent",
});
export const startSession = async (sessionId = "mysession", options = { printQR: true }) => {
    if (isSessionExistAndRunning(sessionId))
        throw new WhatsappError(Messages.sessionAlreadyExist(sessionId));
    const { version } = await fetchLatestBaileysVersion();
    const startSocket = async () => {
        const { state, saveCreds } = await useSQLiteAuthState(sessionId);
        const sock = makeWASocket({
            version,
            auth: state,
            logger: P,
            markOnlineOnConnect: false,
            browser: Browsers.ubuntu("Chrome"),
        });
        sessions.set(sessionId, { ...sock });
        try {
            sock.ev.process(async (events) => {
                if (events["connection.update"]) {
                    const update = events["connection.update"];
                    const { connection, lastDisconnect } = update;
                    if (update.qr) {
                        callback.get(CALLBACK_KEY.ON_QR)?.({
                            sessionId,
                            qr: update.qr,
                        });
                        options.onQRUpdated?.(update.qr);
                        if (options.printQR) {
                            qrTerminal.generate(update.qr, { small: true }, (qrcode) => {
                                console.log(sessionId + ":");
                                console.log(qrcode);
                            });
                        }
                    }
                    if (connection == "connecting") {
                        callback.get(CALLBACK_KEY.ON_CONNECTING)?.(sessionId);
                        options.onConnecting?.();
                    }
                    if (connection === "close") {
                        const code = lastDisconnect?.error?.output?.statusCode;
                        let retryAttempt = retryCount.get(sessionId) ?? 0;
                        let shouldRetry;
                        if (code != DisconnectReason.loggedOut && retryAttempt < 10) {
                            shouldRetry = true;
                        }
                        if (shouldRetry) {
                            retryAttempt++;
                            retryCount.set(sessionId, retryAttempt);
                            startSocket();
                        }
                        else {
                            retryCount.delete(sessionId);
                            deleteSession(sessionId);
                            callback.get(CALLBACK_KEY.ON_DISCONNECTED)?.(sessionId);
                            options.onDisconnected?.();
                        }
                    }
                    if (connection == "open") {
                        retryCount.delete(sessionId);
                        callback.get(CALLBACK_KEY.ON_CONNECTED)?.(sessionId);
                        options.onConnected?.();
                    }
                }
                if (events["creds.update"]) {
                    await saveCreds();
                }
                if (events["messages.update"]) {
                    const msg = events["messages.update"][0];
                    const data = {
                        sessionId: sessionId,
                        messageStatus: parseMessageStatusCodeToReadable(msg.update.status),
                        ...msg,
                    };
                    callback.get(CALLBACK_KEY.ON_MESSAGE_UPDATED)?.(data);
                    options.onMessageUpdated?.(data);
                }
                if (events["messages.upsert"]) {
                    const msg = events["messages.upsert"]
                        .messages?.[0];
                    msg.sessionId = sessionId;
                    msg.saveImage = (path) => saveImageHandler(msg, path);
                    msg.saveVideo = (path) => saveVideoHandler(msg, path);
                    msg.saveDocument = (path) => saveDocumentHandler(msg, path);
                    msg.saveAudio = (path) => saveAudioHandler(msg, path);
                    callback.get(CALLBACK_KEY.ON_MESSAGE_RECEIVED)?.({
                        ...msg,
                    });
                    options.onMessageReceived?.(msg);
                }
            });
            return sock;
        }
        catch (error) {
            // console.log("SOCKET ERROR", error);
            return sock;
        }
    };
    return startSocket();
};
/**
 *
 * @deprecated Use startSession method instead
 */
export const startSessionWithPairingCode = async (sessionId, options) => {
    if (isSessionExistAndRunning(sessionId))
        throw new WhatsappError(Messages.sessionAlreadyExist(sessionId));
    const { version } = await fetchLatestBaileysVersion();
    const startSocket = async () => {
        const { state, saveCreds } = await useMultiFileAuthState(path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX));
        const sock = makeWASocket({
            version,
            printQRInTerminal: false,
            auth: state,
            logger: P,
            markOnlineOnConnect: false,
            browser: Browsers.ubuntu("Chrome"),
        });
        sessions.set(sessionId, { ...sock });
        try {
            if (!sock.authState.creds.registered) {
                console.log("first time pairing");
                const code = await sock.requestPairingCode(options.phoneNumber);
                console.log(code);
                callback.get(CALLBACK_KEY.ON_PAIRING_CODE)?.(sessionId, code);
            }
            sock.ev.process(async (events) => {
                if (events["connection.update"]) {
                    const update = events["connection.update"];
                    const { connection, lastDisconnect } = update;
                    if (update.qr) {
                        callback.get(CALLBACK_KEY.ON_QR)?.({
                            sessionId,
                            qr: update.qr,
                        });
                    }
                    if (connection == "connecting") {
                        callback.get(CALLBACK_KEY.ON_CONNECTING)?.(sessionId);
                    }
                    if (connection === "close") {
                        const code = lastDisconnect?.error?.output?.statusCode;
                        let retryAttempt = retryCount.get(sessionId) ?? 0;
                        let shouldRetry;
                        if (code != DisconnectReason.loggedOut && retryAttempt < 10) {
                            shouldRetry = true;
                        }
                        if (shouldRetry) {
                            retryAttempt++;
                        }
                        if (shouldRetry) {
                            retryCount.set(sessionId, retryAttempt);
                            startSocket();
                        }
                        else {
                            retryCount.delete(sessionId);
                            deleteSession(sessionId);
                            callback.get(CALLBACK_KEY.ON_DISCONNECTED)?.(sessionId);
                        }
                    }
                    if (connection == "open") {
                        retryCount.delete(sessionId);
                        callback.get(CALLBACK_KEY.ON_CONNECTED)?.(sessionId);
                    }
                }
                if (events["creds.update"]) {
                    await saveCreds();
                }
                if (events["messages.update"]) {
                    const msg = events["messages.update"][0];
                    const data = {
                        sessionId: sessionId,
                        messageStatus: parseMessageStatusCodeToReadable(msg.update.status),
                        ...msg,
                    };
                    callback.get(CALLBACK_KEY.ON_MESSAGE_UPDATED)?.(data);
                }
                if (events["messages.upsert"]) {
                    const msg = events["messages.upsert"]
                        .messages?.[0];
                    msg.sessionId = sessionId;
                    msg.saveImage = (path) => saveImageHandler(msg, path);
                    msg.saveVideo = (path) => saveVideoHandler(msg, path);
                    msg.saveDocument = (path) => saveDocumentHandler(msg, path);
                    msg.saveAudio = (path) => saveAudioHandler(msg, path);
                    callback.get(CALLBACK_KEY.ON_MESSAGE_RECEIVED)?.({
                        ...msg,
                    });
                }
            });
            return sock;
        }
        catch (error) {
            // console.log("SOCKET ERROR", error);
            return sock;
        }
    };
    return startSocket();
};
/**
 * @deprecated Use startSession method instead
 */
export const startWhatsapp = startSession;
export const deleteSession = async (sessionId) => {
    const session = getSession(sessionId);
    try {
        await session?.logout();
    }
    catch (error) { }
    session?.end(undefined);
    sessions.delete(sessionId);
    const dir = path.resolve(CREDENTIALS.DIR_NAME, sessionId + CREDENTIALS.PREFIX);
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { force: true, recursive: true });
    }
};
export const getAllSession = () => Array.from(sessions.keys());
export const getSession = (key) => sessions.get(key);
const isSessionExistAndRunning = (sessionId) => {
    if (getSession(sessionId)) {
        return true;
    }
    return false;
};
/**
 * @returns loaded session ids
 */
export const loadSessionsFromStorage = async (getOptions) => {
    const sessionIds = await getSQLiteSessionIds();
    for (const sessionId of sessionIds) {
        const options = getOptions?.(sessionId);
        await startSession(sessionId, options || undefined);
    }
    return sessionIds;
};
export const onMessageReceived = (listener) => {
    callback.set(CALLBACK_KEY.ON_MESSAGE_RECEIVED, listener);
};
export const onQRUpdated = (listener) => {
    callback.set(CALLBACK_KEY.ON_QR, listener);
};
export const onConnected = (listener) => {
    callback.set(CALLBACK_KEY.ON_CONNECTED, listener);
};
export const onDisconnected = (listener) => {
    callback.set(CALLBACK_KEY.ON_DISCONNECTED, listener);
};
export const onConnecting = (listener) => {
    callback.set(CALLBACK_KEY.ON_CONNECTING, listener);
};
export const onMessageUpdate = (listener) => {
    callback.set(CALLBACK_KEY.ON_MESSAGE_UPDATED, listener);
};
export const onPairingCode = (listener) => {
    callback.set(CALLBACK_KEY.ON_PAIRING_CODE, listener);
};
