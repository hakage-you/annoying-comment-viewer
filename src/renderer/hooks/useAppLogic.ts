import { useEffect, useCallback } from 'react';
import useInterval from 'use-interval';
import { generateDummyMessages } from '../utils/debug';
import { CHAT_FETCH_INTERVAL_MS } from '../../const';
import { useSettings } from './useSettings';
import { useMessageStore } from './useMessageStore';
import { useAudioService } from './useAudioService';

// グローバルなフラグ管理（フェッチ競合防止）
let fetching = false;

export const useAppLogic = () => {
    const { stickyMode, isDebugUi } = useSettings();
    const { 
        stickyMsgs, 
        standardMsg, 
        msgQueue, 
        setStickyMsgs,
        setStandardMsg, 
        addStickyMessage, 
        pushToQueue, 
        popFromQueue, 
        clearAllMessages, 
        handleModeration, 
        isProcessed, 
        markAsProcessed 
    } = useMessageStore();
    const { speakMessage } = useAudioService();

    //--- Main Logic: processNewMessage ---
    const processNewMessage = useCallback(async (msg: any, currentStickyMode: boolean) => {
        if (isProcessed(msg.id)) return;
        markAsProcessed(msg.id);

        console.log(`[Renderer] Processing message: ${msg.id} - ${msg.message}`);

        // 先にメッセージを表示する
        if (currentStickyMode) {
            addStickyMessage(msg);
        } else {
            setStandardMsg(msg);
        }

        // 裏でTTSを取得して再生
        setTimeout(() => {
            speakMessage(msg.message, msg.isOwner).catch(err => {
                console.error("[TTS Error]", err);
            });
        }, 0);
    }, [isProcessed, markAsProcessed, addStickyMessage, setStandardMsg, speakMessage]);

    //--- Effects & IPC ---
    useEffect(() => {
        window.ipc.onClearChat(() => {
            clearAllMessages();
        });
        
        // Sticky Mode 切り替え時の初期化
        window.ipc.onStickyModeChanged(() => {
            setStickyMsgs([]); 
        });
    }, [clearAllMessages, setStickyMsgs]);

    // Standard Mode のキュー処理
    useEffect(() => {
        if (!stickyMode && !standardMsg && msgQueue.length > 0) {
            const next = popFromQueue();
            if (next) {
                processNewMessage(next, false);
            }
        }
    }, [msgQueue, standardMsg, stickyMode, processNewMessage, popFromQueue]);

    const onStandardProcessComplete = useCallback(() => {
        setStandardMsg(null);
    }, [setStandardMsg]);

    const processMessageBatchSequentially = useCallback((msgs: any[], onComplete: () => void) => {
        let index = 0;
        const processNext = () => {
            if (index < msgs.length) {
                processNewMessage(msgs[index], stickyMode);
                index++;
                setTimeout(processNext, 1200);
            } else {
                onComplete();
            }
        };
        processNext();
    }, [processNewMessage, stickyMode]);

    //--- Chat Fetch Interval ---
    useInterval(() => {
        if (fetching) return;

        if (isDebugUi) {
            fetching = true;
            const dummies = generateDummyMessages();

            if (stickyMode) {
                processMessageBatchSequentially(dummies, () => {
                    fetching = false;
                });
            } else {
                pushToQueue(dummies);
                fetching = false;
            }
            return;
        }

        fetching = true;
        window.ipc.getChatList().then(async (res) => {
            const { items } = res;
            if (!items || items.length === 0) {
                fetching = false;
                return;
            }

            // Moderation events (Deletion/BAN)
            const deletedMessageIds = items
                .filter((x: any) => x.snippet.type === 'messageDeletedEvent')
                .map((x: any) => x.snippet.messageDeletedDetails.deletedMessageId);

            const bannedChannelIds = items
                .filter((x: any) => x.snippet.type === 'userBannedEvent')
                .map((x: any) => x.snippet.userBannedDetails.bannedUserDetails.channelId);

            handleModeration(deletedMessageIds, bannedChannelIds);

            // Message processing
            const newMsgs = items
                .filter((x: any) => x.snippet.type === 'textMessageEvent')
                .map((x: any) => ({
                    id: x.id,
                    authorChannelId: x.authorDetails.channelId,
                    icon: x?.authorDetails?.profileImageUrl,
                    message: x?.snippet?.textMessageDetails?.messageText,
                    isOwner: x?.authorDetails?.isChatOwner ?? false
                }))
                .filter((m: any) => !isProcessed(m.id));

            if (newMsgs.length > 0) {
                if (stickyMode) {
                    processMessageBatchSequentially(newMsgs, () => {
                        fetching = false;
                    });
                } else {
                    pushToQueue(newMsgs);
                    fetching = false;
                }
            } else {
                fetching = false;
            }
        }).catch(err => {
            console.error("Fetch Logic Error:", err);
            fetching = false;
        });
    }, CHAT_FETCH_INTERVAL_MS);

    return {
        stickyMode,
        stickyMsgs,
        standardMsg,
        onStandardProcessComplete
    };
};
