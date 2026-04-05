import React from 'react';
import Snackbar, { SnackbarOrigin } from '@mui/material/Snackbar';
import SnackbarContent from "@mui/material/SnackbarContent";
import Slide, { SlideProps } from '@mui/material/Slide';
import Typography from "@mui/material/Typography";
import Grid from '@mui/material/Grid';
import { Avatar } from '@mui/material';
import { choiceMotionVariant, MotionVariant, noneVariant } from '../utils/motion';

type TransitionProps = Omit<SlideProps, 'direction'>;

function TransitionDown(props: TransitionProps) {
    return <Slide {...props} direction="down" />;
}

const anchorOrigin: SnackbarOrigin = {
    vertical: 'top',
    horizontal: 'center'
};

interface MessageConfig {
    id: string;
    authorChannelId: string;
    icon: string;
    message: string;
    isOwner: boolean;
}

interface StandardModeProps {
    message: MessageConfig | null;
    onProcessComplete: () => void;
}

export const StandardMode: React.FC<StandardModeProps> = ({
    message,
    onProcessComplete
}) => {
    const [open, setOpen] = React.useState(false);
    const [variant, setVariant] = React.useState<MotionVariant>(noneVariant);

    React.useEffect(() => {
        if (message) {
            setVariant(choiceMotionVariant());
            setOpen(true);
        } else {
            setOpen(false);
        }
    }, [message]);

    const duration = message && message.message.length < 20 
        ? variant.durationSec * 1000 
        : Math.floor(variant.durationSec * 2) * 1000;

    // 非アクティブ状態でも確実に閉じるための自前タイマー
    React.useEffect(() => {
        if (open && duration) {
            const timer = setTimeout(() => {
                setOpen(false);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [open, duration]);

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        setOpen(false);
    };

    return (
        <Snackbar
            open={open}
            onClose={handleClose}
            TransitionComponent={TransitionDown}
            TransitionProps={{
                onExited: onProcessComplete
            }}
            anchorOrigin={anchorOrigin}
            autoHideDuration={null}
            sx={{
                marginTop: "33vh"
            }}
        >
            <SnackbarContent
                message={
                    <Grid container justifyContent="center" wrap="nowrap">
                        <Grid sx={{ marginRight: "30px" }}>
                            <Avatar src={message?.icon}></Avatar>
                        </Grid>
                        <Grid>
                            <Typography variant="h1" className={variant.className} sx={{ overflowWrap: "anywhere", padding: "50px" }}>
                                {message?.message}
                            </Typography>
                        </Grid>
                    </Grid>
                }
                sx={{
                    width: "1200px",
                    background: "rgb(50 50 50 / 98%)",
                }}
            />
        </Snackbar>
    );
};
