import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { IPCKeys } from "./const";
import { IIpc } from "./@types/global";

const api: IIpc = {
    // 関数で包んで部分的に公開する
    // renderer -> main
    getLiveChatId: (videoId: string) => ipcRenderer.invoke(IPCKeys.GET_LIVE_CHAT_ID, videoId),
    getChatList: () => ipcRenderer.invoke(IPCKeys.GET_CHAT),
    getSpeakers: (host?: string, port?: number, engine?: string) => ipcRenderer.invoke(IPCKeys.GET_SPEAKERS, host, port, engine),
    initWindowClose: () => ipcRenderer.invoke(IPCKeys.INIT_CLOSE),
    getTts: (text: string, isOwner: boolean) => ipcRenderer.invoke(IPCKeys.GET_TTS, text, isOwner),
    getConfig: () => ipcRenderer.invoke(IPCKeys.GET_CONFIG),
    setConfig: (config: any) => ipcRenderer.invoke(IPCKeys.SET_CONFIG, config),
    testAuthConfig: (config: { clientId: string, clientSecret: string }) => ipcRenderer.invoke(IPCKeys.TEST_AUTH_CONFIG, config),
    openExternal: (url: string) => ipcRenderer.invoke(IPCKeys.OPEN_EXTERNAL, url),
    cancelAuth: () => ipcRenderer.invoke(IPCKeys.CANCEL_AUTH),
    onClearChat: (callback: () => void) => {
        ipcRenderer.on('clear-chat', () => callback());
    },
    onStickyModeChanged: (callback: (enabled: boolean) => void) => {
        ipcRenderer.on('sticky-mode-changed', (_event, enabled) => callback(enabled));
    },
}

contextBridge.exposeInMainWorld('ipc', api);
