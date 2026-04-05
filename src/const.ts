export const IPCKeys = {
    GET_LIVE_CHAT_ID: 'get_live_chat_id',
    GET_CHAT: "get_chat",
    INIT_CLOSE: "init_close",
    GET_TTS: "get_tts",
    CLEAR_CHAT: "clear_chat",
    STICKY_MODE_CHANGED: "sticky_mode_changed",
    GET_CONFIG: "get_config",
    SET_CONFIG: "set_config",
    GET_SPEAKERS: "get_speakers",
    TEST_AUTH_CONFIG: "test_auth_config",
    OPEN_EXTERNAL: "open_external",
    CANCEL_AUTH: "cancel_auth"
} as const;

export const ENGINE_TYPE = {
    VOICEVOX: 'voicevox',
    SHAREVOX: 'sharevox',
    COEIROINK: 'coeiroink'
} as const;

export type TtsEngine = typeof ENGINE_TYPE[keyof typeof ENGINE_TYPE];

export const ENGINE_DEFAULTS: Record<TtsEngine, { port: number, name: string }> = {
    [ENGINE_TYPE.VOICEVOX]: { port: 50021, name: 'VOICEVOX' },
    [ENGINE_TYPE.SHAREVOX]: { port: 50025, name: 'SHAREVOX' },
    [ENGINE_TYPE.COEIROINK]: { port: 50032, name: 'COEIROINK (v1 API)' }
};
export const MAX_STICKY_COUNT = 80;
export const CHAT_FETCH_INTERVAL_MS = 10000;
export const PROCESSED_ID_CACHE_SIZE = 1000;
