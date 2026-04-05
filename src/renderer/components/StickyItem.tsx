import React, { useMemo } from 'react';
import { Avatar, Paper, Typography, Box } from '@mui/material';
import { choiceMotionVariant, getRandomPosition } from '../utils/motion';

export interface StickyMessage {
    id: string;
    authorChannelId: string;
    icon: string;
    message: string;
    isOwner: boolean;
}

interface StickyItemProps {
    data: StickyMessage;
}

export const StickyItem: React.FC<StickyItemProps> = ({ data }) => {
    const { top, left, rotate } = useMemo(() => getRandomPosition(), []);
    const { className } = useMemo(() => choiceMotionVariant(), []);

    return (
        <Paper
            elevation={6}
            sx={{
                position: 'absolute',
                top: `${top}%`,
                left: `${left}%`,
                transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                minWidth: '200px',
                maxWidth: '600px',
                padding: '20px',
                background: 'rgb(50 50 50 / 95%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
                zIndex: 100,
                border: data.isOwner ? '3px solid #ff4081' : 'none', // 配信者はピンクの枠線
            }}
        >
            <Avatar src={data.icon} sx={{ width: 48, height: 48 }} />
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <Typography
                    variant="h5"
                    className={className}
                    sx={{
                        overflowWrap: 'anywhere',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                    }}
                >
                    {data.message}
                </Typography>
            </Box>
        </Paper>
    );
};
