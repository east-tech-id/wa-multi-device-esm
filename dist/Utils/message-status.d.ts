import { proto } from "baileys";
import { MessageUpdated } from "../Types/index.js";
export declare const parseMessageStatusCodeToReadable: (code: proto.WebMessageInfo.Status) => MessageUpdated["messageStatus"];
