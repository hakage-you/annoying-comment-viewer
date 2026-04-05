import React, { useMemo } from 'react';
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { StandardMode } from './StandardMode';
import { StickyBoard } from './StickyBoard';
import { useAppLogic } from '../hooks/useAppLogic';

export const App = (): JSX.Element => {
    const nonce = document.head.querySelector('[property~=csp-nonce][content]')?.getAttribute('content') as string;
    const cache = useMemo(() => createCache({
        key: 'emotion',
        prepend: true,
        nonce,
    }), [nonce]);

    //--- Custom Hook ---
    const {
        stickyMode,
        stickyMsgs,
        standardMsg,
        onStandardProcessComplete
    } = useAppLogic();

    return (
        <CacheProvider value={cache}>
            <div style={{ backgroundColor: 'transparent', width: '100vw', height: '100vh', overflow: 'hidden' }}>
                {stickyMode ? (
                    <StickyBoard messages={stickyMsgs} />
                ) : (
                    <StandardMode
                        message={standardMsg}
                        onProcessComplete={onStandardProcessComplete}
                    />
                )}
            </div>
        </CacheProvider>
    );
};