import { useCallback } from 'react';
import { audioPlay } from '../utils/audio';

export const useAudioService = () => {
    const playAudio = useCallback((audioBase64: string | null) => {
        if (audioBase64) {
            console.log("[Audio] Playing TTS voice...");
            new Audio(audioBase64).play();
        } else {
            console.log("[Audio] TTS failed or disabled, playing fallback sound...");
            audioPlay();
        }
    }, []);

    const speakMessage = useCallback(async (message: string, isOwner: boolean) => {
        const audioBase64 = await window.ipc.getTts(message, isOwner);
        playAudio(audioBase64);
    }, [playAudio]);

    return {
        playAudio,
        speakMessage
    };
};
