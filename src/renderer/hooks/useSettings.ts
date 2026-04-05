import { useState, useEffect } from 'react';

export const useSettings = () => {
    const [stickyMode, setStickyMode] = useState(false);
    const [isDebugUi, setIsDebugUi] = useState(false);

    useEffect(() => {
        // Initial config fetch
        window.ipc.getConfig().then(config => {
            setStickyMode(config.enableStickyMode);
            setIsDebugUi(config.isDebugUi);
        });

        // IPC event listeners
        window.ipc.onStickyModeChanged((enabled) => {
            setStickyMode(enabled);
        });
    }, []);

    return {
        stickyMode,
        setStickyMode,
        isDebugUi,
        setIsDebugUi
    };
};
