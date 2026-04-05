import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import express, { Request, Response, NextFunction } from 'express';
import { shell } from 'electron';
import dotenv from 'dotenv';


dotenv.config();

const client_id_env = process.env.OAUTH2_CLIENT_ID || "";
const client_secret_env = process.env.OAUTH2_CLIENT_SECRET || "";

export const createOAuth2Client = (clientId?: string, clientSecret?: string) => {
    return new google.auth.OAuth2(
        clientId || client_id_env,
        clientSecret || client_secret_env,
        'http://127.0.0.1' // 初期値（auth関数内でポートを指定して上書きされます）
    );
};

let currentAuthServer: any = null;
let currentAuthReject: any = null;

export function closeServer() {
    if (currentAuthServer) {
        currentAuthServer.close();
        currentAuthServer = null;
    }
    currentAuthReject = null;
}

export function stopAuthServer(error?: Error) {
    const reject = currentAuthReject;
    closeServer();
    if (reject) {
        reject(error || new Error("認証がキャンセルされました。"));
    }
}

export async function auth(oauth2Client: OAuth2Client): Promise<any> {
    const app = express();
    
    return new Promise((resolve, reject) => {
        currentAuthReject = reject;
        const timeout = setTimeout(() => {
            stopAuthServer();
            if (currentAuthReject) {
                currentAuthReject(new Error("認証タイムアウト：180秒以内にブラウザでの操作が完了しませんでした。"));
            }
        }, 180000);

        currentAuthServer = app.listen(0, async () => {
            const port = (currentAuthServer.address() as any).port;
            const redirectUri = `http://127.0.0.1:${port}`;
            
            // Redirect URIを動的に設定
            (oauth2Client as any).redirectUri = redirectUri;

            const scopes = [
                'https://www.googleapis.com/auth/youtube.force-ssl'
            ];

            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: scopes,
                prompt: 'consent' // Force to get refresh_token
            });

            console.log(`Node.js is listening to PORT:${port}`);
            console.log("Opening Auth URL in external browser...");

            // 外部ブラウザ（既定のブラウザ）で開く
            await shell.openExternal(authUrl);

            app.get("/", async (req: Request, res: Response) => {
                try {
                    const { code } = req.query;
                    if (!code) {
                        res.send('<html><body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #1a1a1a; color: #ff5252;"><div>認証コードが見つかりませんでした。ブラウザを閉じてアプリでやり直してください。</div></body></html>');
                        clearTimeout(timeout);
                        stopAuthServer(new Error('認証コードが返されませんでした。'));
                        return;
                    }

                    // 先にトークンを取得。失敗すれば下の catch に飛ぶ
                    const { tokens } = await oauth2Client.getToken(code as string);
                    oauth2Client.setCredentials(tokens);

                    // トークン取得に成功したらブラウザに成功メッセージを返す
                    res.send('<html><body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #1a1a1a; color: #4dabf7;"><div>認証されました。このタブを閉じてアプリに戻ってください。</div><script>setTimeout(() => window.close(), 1500);</script></body></html>');
                    
                    // 少し待ってからプロミスを解決し、サーバーを閉じる
                    setTimeout(() => {
                        clearTimeout(timeout);
                        closeServer();
                        resolve(tokens);
                    }, 500);
                } catch (error: any) {
                    console.error("Token exchange error:", error);
                    const errorDetail = error.response?.data?.error_description || error.message || "Unknown error";
                    res.status(500).send(`<html><body style="font-family: sans-serif; padding: 2rem; background: #1a1a1a; color: #ff5252;"><h1>認証エラー</h1><p>アクセストークンの取得に失敗しました。</p><p style="color: #ccc;">理由: ${errorDetail}</p><p>Client ID または Client Secret が誤っているか、無効化されている可能性があります。</p></body></html>`);
                    clearTimeout(timeout);
                    stopAuthServer(error);
                }
            });
        });

        currentAuthServer.on('error', (err: any) => {
            clearTimeout(timeout);
            stopAuthServer(err);
        });
    });
}



export async function getLiveChatId(oauth2Client: OAuth2Client, videoId: string): Promise<string> {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const res = await youtube.videos.list({
        part: ['liveStreamingDetails'],
        id: [videoId]
    });

    const item = res.data.items?.[0];
    const liveChatId = item?.liveStreamingDetails?.activeLiveChatId;
    
    if (!liveChatId) {
        throw new Error('Active live chat not found for this video.');
    }

    console.log(`live chat id: ${liveChatId}`);
    return liveChatId;
}

export async function getChat(oauth2Client: OAuth2Client, liveChatId: string, pageToken?: string) {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const res = await youtube.liveChatMessages.list({
        liveChatId: liveChatId,
        part: ['id', 'snippet', 'authorDetails'],
        pageToken: pageToken
    });

    return {
        items: res.data.items || [],
        nextPageToken: res.data.nextPageToken || undefined
    };
}

export async function testAuth(oauth2Client: OAuth2Client): Promise<void> {
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    // Token is verified implicitly by making a basic API call
    await youtube.channels.list({
        part: ['id'],
        mine: true
    });
}

