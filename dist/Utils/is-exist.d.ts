import { SendMessageTypes } from "../Types/index.js";
export declare const isExist: ({ sessionId, to, isGroup, }: SendMessageTypes) => Promise<boolean>;
