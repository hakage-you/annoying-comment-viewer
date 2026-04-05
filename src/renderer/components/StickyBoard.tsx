import React from 'react';
import { Box } from '@mui/material';
import { StickyItem, StickyMessage } from './StickyItem';

interface StickyBoardProps {
    messages: StickyMessage[];
}

export const StickyBoard: React.FC<StickyBoardProps> = ({ messages }) => {
    return (
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none', // 背後の操作を邪魔しない
                overflow: 'hidden',
            }}
        >
            {messages.map((msg) => (
                <StickyItem key={msg.id} data={msg} />
            ))}
        </Box>
    );
};
