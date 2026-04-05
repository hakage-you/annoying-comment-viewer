import { getChatHandler } from "../ipcMainHandler";
export { }

declare global {
  interface Window {
    ipc: IIpc
  }
}

window.ipc = window.ipc

export interface IIpc {
  getLiveChatId: (videoId: string) => Promise<any>
  getChatList: typeof getChatHandler
  initWindowClose: () => Promise<any>
  getTts: (text: string, isOwner: boolean) => Promise<string | null>
  getConfig: () => Promise<any>
  setConfig: (config: any) => Promise<any>
  testAuthConfig: (config: { clientId: string, clientSecret: string }) => Promise<{ success: boolean, error?: string }>
  getSpeakers: (host?: string, port?: number, engine?: string) => Promise<any[]>
  openExternal: (url: string) => Promise<void>
  cancelAuth: () => Promise<void>
  onClearChat: (callback: () => void) => void
  onStickyModeChanged: (callback: (enabled: boolean) => void) => void
}
