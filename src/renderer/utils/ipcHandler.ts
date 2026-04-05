import { IIpc } from '../../@types/global.d'

export const auth = (liveChatId: string) => {
    return window.ipc.auth(liveChatId)
}

export const getChatList = () => {
    return window.ipc.getChatList()
}
