import { v4 as uuidv4 } from 'uuid';

/**
 * デバッグ用のダミーメッセージを生成する
 */
export const generateDummyMessages = () => {
    const dummyCount = Math.floor(Math.random() * 5) + 1;
    return Array.from({ length: dummyCount }).map((_, i) => ({
        id: `dummy-${uuidv4()}`,
        authorChannelId: "dummy-user",
        icon: "",
        message: `[DEBUG] テストメッセージ ${i + 1}: ${new Date().toLocaleTimeString()}`,
        isOwner: Math.random() > 0.7
    }));
};
