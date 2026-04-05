import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StickyMessage } from '../components/StickyItem';
import { MAX_STICKY_COUNT, PROCESSED_ID_CACHE_SIZE } from '../../const';

export const useMessageStore = () => {
    const [stickyMsgs, setStickyMsgs] = useState<StickyMessage[]>([]);
    const [standardMsg, setStandardMsg] = useState<any>(null);
    const [msgQueue, setMsgQueue] = useState<any[]>([]);
    
    // De-duplication set
    const processedIdsRef = useRef<Set<string>>(new Set());

    const isProcessed = useCallback((id: string) => {
        return processedIdsRef.current.has(id);
    }, []);

    const markAsProcessed = useCallback((id: string) => {
        processedIdsRef.current.add(id);
        
        // Cache size management
        if (processedIdsRef.current.size > PROCESSED_ID_CACHE_SIZE) {
            const firstElement = processedIdsRef.current.values().next().value;
            if (firstElement) processedIdsRef.current.delete(firstElement);
        }
    }, []);

    const addStickyMessage = useCallback((msg: any) => {
        const newMsg: StickyMessage = {
            id: msg.id || uuidv4(),
            authorChannelId: msg.authorChannelId || "",
            icon: msg.icon,
            message: msg.message,
            isOwner: msg.isOwner,
        };

        setStickyMsgs(prev => {
            const next = [...prev, newMsg];
            return next.length > MAX_STICKY_COUNT ? next.slice(1) : next;
        });
    }, []);

    const setStandardMessage = useCallback((msg: any) => {
        setStandardMsg(msg);
    }, []);

    const pushToQueue = useCallback((msgs: any[]) => {
        setMsgQueue(prev => [...prev, ...msgs]);
    }, []);

    const popFromQueue = useCallback(() => {
        if (msgQueue.length === 0) return null;
        const next = msgQueue[0];
        setMsgQueue(prev => prev.slice(1));
        return next;
    }, [msgQueue]);

    const clearAllMessages = useCallback(() => {
        setStickyMsgs([]);
        setMsgQueue([]);
    }, []);

    const handleModeration = useCallback((deletedMessageIds: string[], bannedChannelIds: string[]) => {
        if (deletedMessageIds.length === 0 && bannedChannelIds.length === 0) return;

        const isFiltered = (m: any) => 
            deletedMessageIds.includes(m.id) || bannedChannelIds.includes(m.authorChannelId || m.channelId);

        setStickyMsgs(prev => prev.filter(m => !isFiltered(m)));
        setMsgQueue(prev => prev.filter(m => !isFiltered(m)));

        setStandardMsg((prev: any) => {
            if (prev && isFiltered(prev)) return null;
            return prev;
        });
    }, []);

    return {
        stickyMsgs,
        standardMsg,
        msgQueue,
        setStickyMsgs,
        setStandardMsg,
        setMsgQueue,
        addStickyMessage,
        setStandardMessage,
        pushToQueue,
        popFromQueue,
        clearAllMessages,
        handleModeration,
        isProcessed,
        markAsProcessed
    };
};
