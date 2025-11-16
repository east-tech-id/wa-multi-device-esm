import { AuthenticationState } from "baileys";
export declare const useSQLiteAuthState: (sessionId: string) => Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}>;
export declare const getSQLiteSessionIds: () => Promise<string[]>;
