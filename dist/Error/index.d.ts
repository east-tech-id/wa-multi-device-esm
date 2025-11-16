export declare class WhatsappError extends Error {
    constructor(message: string);
    static isWhatsappError(error: any): error is WhatsappError;
}
