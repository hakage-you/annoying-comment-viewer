import { ipcMain, BrowserWindow, shell } from "electron";
import { IPCKeys, ENGINE_TYPE } from "./const";
import { createOAuth2Client, auth, getChat, getLiveChatId, testAuth, stopAuthServer } from "./youtubeAPI";
import Store from "electron-store";
import { VoicevoxEngineClient } from "./tts/VoicevoxEngineClient";
import { CoeiroinkEngineClient } from "./tts/CoeiroinkEngineClient";
import { Credentials, OAuth2Client } from "google-auth-library";

const store = new Store();
let oauth2Client: OAuth2Client;

export const initializeOAuthClient = () => {
    const clientId = store.get("oauth2ClientId") as string;
    const clientSecret = store.get("oauth2ClientSecret") as string;
    
    oauth2Client = createOAuth2Client(clientId, clientSecret);
    
    // トークンが更新されたら自動的に保存する
    oauth2Client.on('tokens', (tokens: Credentials) => {
        console.log("Tokens updated, saving to store...");
        const currentTokens = store.get("tokens", {}) as Credentials;
        store.set("tokens", { ...currentTokens, ...tokens });
    });
};

export const checkAndMigrateEnv = () => {
    if (!store.get("oauth2ClientId") && process.env.OAUTH2_CLIENT_ID) {
        store.set("oauth2ClientId", process.env.OAUTH2_CLIENT_ID);
    }
    if (!store.get("oauth2ClientSecret") && process.env.OAUTH2_CLIENT_SECRET) {
        store.set("oauth2ClientSecret", process.env.OAUTH2_CLIENT_SECRET);
    }
};

export const verifyAuthConfig = async (): Promise<{ success: boolean; reason?: 'missing_config' | 'invalid_auth' | 'network_error'; error?: any }> => {
    const clientId = store.get("oauth2ClientId") as string;
    const clientSecret = store.get("oauth2ClientSecret") as string;

    if (!clientId || !clientSecret) {
        return { success: false, reason: 'missing_config' };
    }

    const savedTokens = store.get("tokens", null) as Credentials | null;
    if (!savedTokens) {
        return { success: false, reason: 'invalid_auth' };
    }

    try {
        oauth2Client.setCredentials(savedTokens);
        await testAuth(oauth2Client);
        return { success: true };
    } catch (e: any) {
        console.error("Auth verification failed:", e);

        // ネットワークエラーの判定
        if (e.code === 'ENOTFOUND' || e.code === 'ETIMEDOUT' || e.code === 'ECONNREFUSED' || e.message?.toLowerCase().includes('network')) {
            return { success: false, reason: 'network_error', error: e };
        }

        // 認証エラー（401/403）の判定
        const status = e.response?.status || e.code;
        if (status === 401 || status === 403) {
            return { success: false, reason: 'invalid_auth' };
        }

        // その他のエラー
        return { success: false, reason: 'invalid_auth', error: e };
    }
};

// 初期化実行
checkAndMigrateEnv();
initializeOAuthClient();

let liveChatId = "";
let videoId = "";
let nextPageToken: string | undefined = undefined;
let isFirstFetch = true;

let isInitSuccess = false;
export const existsLiveChatId = () => Boolean(liveChatId);
export const checkInitSuccess = () => (process.env.DEBUG_UI === 'true') ? isInitSuccess : (isInitSuccess && Boolean(liveChatId));

export const getChatHandler = async () => {
    try {
        const res = await getChat(oauth2Client, liveChatId, nextPageToken);
        nextPageToken = res.nextPageToken;

        const timestamp = new Date().toLocaleString();
        console.log(`[${timestamp}] [getChatHandler] Fetched ${res.items.length} items. isFirstFetch=${isFirstFetch}`);
        if (res.items.length > 0) {
            console.log(`[getChatHandler] First item snippet type: ${res.items[0]?.snippet?.type}`);
        }

        if (isFirstFetch) {
            isFirstFetch = false;
            return { items: [] };
        }
        return { items: res.items };
    } catch (error: any) {
        console.error("Error fetching chat:", error);
        return { items: [] };
    }
};

let activeWindow: BrowserWindow | null = null;
let currentOnConfigChanged: (() => void) | undefined;
let isHandlersSetup = false;

export const init = (win: BrowserWindow, onConfigChanged?: () => void) => {
    activeWindow = win;
    currentOnConfigChanged = onConfigChanged;

    if (isHandlersSetup) return;

    ipcMain.handle(IPCKeys.GET_LIVE_CHAT_ID, async (e: Electron.IpcMainInvokeEvent, _videoId: string) => {
        const isGUIDev = process.env.DEBUG_UI === 'true';
        if (isGUIDev) {
            isInitSuccess = true;
            return Promise.resolve();
        }

        videoId = _videoId;
        isFirstFetch = true;

        // 保存されているトークンをロード
        const savedTokens = store.get("tokens", null) as Credentials | null;

        if (savedTokens) {
            console.log("Using saved tokens");
            oauth2Client.setCredentials(savedTokens);

            // 有効な LiveChatId を取得できるか試す
            try {
                liveChatId = await getLiveChatId(oauth2Client, videoId);
                isInitSuccess = true;
                return;
            } catch (error: any) {
                // Check if it's an Authentication error
                const status = error?.response?.status || error?.code;
                if (status === 401 || status === 403) {
                    console.log("Tokens expired or invalid, re-authenticating...");
                } else {
                    // Propagate logic errors (e.g. videoId not found) to the renderer
                    console.error("Video ID Error:", error.message);
                    throw error;
                }
            }
        }

        // 新規認証
        try {
            const tokens = await auth(oauth2Client);
            store.set("tokens", tokens);
            liveChatId = await getLiveChatId(oauth2Client, videoId);
        } catch (error: any) {
            console.error("AUTH Initialization failed:", error);
            throw error;
        } finally {
            isInitSuccess = true;
        }
    });

    ipcMain.handle(
        IPCKeys.GET_CHAT,
        () => getChatHandler()
    );

    ipcMain.handle(
        IPCKeys.GET_SPEAKERS,
        async (e, host?: string, port?: number, engine?: string) => {
            const h = host || (store.get("ttsHost", "127.0.0.1") as string);
            const p = port || (store.get("ttsPort", 50025) as number);
            const eng = engine || (store.get("ttsEngine", ENGINE_TYPE.VOICEVOX) as string);
            const client = eng === ENGINE_TYPE.COEIROINK
                ? new CoeiroinkEngineClient(h, p)
                : new VoicevoxEngineClient(h, p);
            return await client.getSpeakers();
        }
    );

    ipcMain.handle(
        IPCKeys.INIT_CLOSE, (_) => {
            activeWindow?.close();
        }
    );

    ipcMain.handle(
        IPCKeys.GET_TTS,
        async (e: Electron.IpcMainInvokeEvent, text: string, isOwner: boolean) => {
            const enableTts = store.get("enableTts", false) as boolean;
            if (!enableTts) return null;

            try {
                const host = store.get("ttsHost", "127.0.0.1") as string;
                const port = store.get("ttsPort", 50025) as number;
                const engine = store.get("ttsEngine", "voicevox") as string;
                const ownerSpeakerId = store.get("ttsOwnerSpeakerId", 1) as string | number;
                const otherSpeakerId = store.get("ttsOtherSpeakerId", 2) as string | number;
                const ownerStyleId = store.get("ttsOwnerStyleId", 0) as number;
                const otherStyleId = store.get("ttsOtherStyleId", 0) as number;

                const speakerId = isOwner ? ownerSpeakerId : otherSpeakerId;
                const styleId = isOwner ? ownerStyleId : otherStyleId;

                if (engine === ENGINE_TYPE.COEIROINK) {
                    return await (new CoeiroinkEngineClient(host, port)).generateTTS(text, speakerId, styleId);
                } else {
                    return await (new VoicevoxEngineClient(host, port)).generateTTS(text, speakerId);
                }
            } catch (error) {
                console.error("[Main] TTS Generation error:", error);
                return null;
            }
        }
    );

    ipcMain.handle(
        IPCKeys.GET_CONFIG,
        () => {
            const isGUIDev = process.env.DEBUG_UI === 'true';
            return {
                enableStickyMode: store.get('enableStickyMode', false),
                enableTts: store.get('enableTts', false),
                ttsHost: store.get("ttsHost", "127.0.0.1"),
                ttsPort: store.get("ttsPort", 50025),
                ttsEngine: store.get("ttsEngine", ENGINE_TYPE.VOICEVOX),
                ttsOwnerSpeakerId: store.get("ttsOwnerSpeakerId", 1),
                ttsOtherSpeakerId: store.get("ttsOtherSpeakerId", 2),
                ttsOwnerStyleId: store.get("ttsOwnerStyleId", 0),
                ttsOtherStyleId: store.get("ttsOtherStyleId", 0),
                isDebugUi: isGUIDev,
                oauth2ClientId: store.get("oauth2ClientId", ""),
                oauth2ClientSecret: store.get("oauth2ClientSecret", "")
            };
        }
    );

    ipcMain.handle(
        IPCKeys.SET_CONFIG,
        (e, config: any) => {
            if (activeWindow && e.sender.id !== activeWindow.webContents.id) {
                console.error("Permission Denied: Config changes are only allowed from the initialization window.");
                return;
            }

            if (config.enableStickyMode !== undefined) {
                store.set('enableStickyMode', config.enableStickyMode);
            }
            if (config.enableTts !== undefined) {
                store.set('enableTts', config.enableTts);
            }
            if (config.ttsHost !== undefined) {
                store.set('ttsHost', config.ttsHost);
            }
            if (config.ttsPort !== undefined) {
                store.set('ttsPort', config.ttsPort);
            }
            if (config.ttsEngine !== undefined) {
                store.set('ttsEngine', config.ttsEngine);
            }
            if (config.ttsOwnerSpeakerId !== undefined) {
                store.set('ttsOwnerSpeakerId', config.ttsOwnerSpeakerId);
            }
            if (config.ttsOtherSpeakerId !== undefined) {
                store.set('ttsOtherSpeakerId', config.ttsOtherSpeakerId);
            }
            if (config.ttsOwnerStyleId !== undefined) {
                store.set('ttsOwnerStyleId', config.ttsOwnerStyleId);
            }
            if (config.ttsOtherStyleId !== undefined) {
                store.set('ttsOtherStyleId', config.ttsOtherStyleId);
            }
            if (config.oauth2ClientId !== undefined) {
                store.set('oauth2ClientId', config.oauth2ClientId);
            }
            if (config.oauth2ClientSecret !== undefined) {
                store.set('oauth2ClientSecret', config.oauth2ClientSecret);
            }
            
            // クライアントを再初期化
            if (config.oauth2ClientId !== undefined || config.oauth2ClientSecret !== undefined) {
                initializeOAuthClient();
            }

            if (currentOnConfigChanged) currentOnConfigChanged();
        }
    );

    ipcMain.handle(
        IPCKeys.TEST_AUTH_CONFIG,
        async (e, config: { clientId: string, clientSecret: string }) => {
            try {
                // Use a temporary client to avoid messing with global state during test
                const testClient = createOAuth2Client(config.clientId, config.clientSecret);
                
                // This calls auth(), opening the browser and waiting for the user to auth
                const tokens = await auth(testClient);
                
                // Test if the token actually works by making a harmless API call
                await testAuth(testClient);

                // Success! Set global settings
                store.set('oauth2ClientId', config.clientId);
                store.set('oauth2ClientSecret', config.clientSecret);
                store.set("tokens", tokens);

                // Re-initialize the global client with the verified keys
                initializeOAuthClient();
                return { success: true };
            } catch (error: any) {
                console.error("Test Auth failed:", error);
                const detail = error.response?.data?.error_description || error.message || "Unknown error";
                const msg = `認証に失敗しました。Client ID または Client Secret が誤っているか、無効化されている可能性があります。\n\n詳細: ${detail}`;
                return { success: false, error: msg };
            }
        }
    );

    ipcMain.handle(
        IPCKeys.CANCEL_AUTH,
        async (_) => {
            stopAuthServer();
        }
    );

    ipcMain.handle(
        IPCKeys.OPEN_EXTERNAL,
        async (e, url: string) => {
            await shell.openExternal(url);
        }
    );

    isHandlersSetup = true;
};
