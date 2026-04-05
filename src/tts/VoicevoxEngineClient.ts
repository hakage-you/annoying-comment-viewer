import axios from 'axios';
import { TTSProvider } from './TTSProvider';

export class VoicevoxEngineClient implements TTSProvider {
    constructor(private host: string, private port: number) {}

    async generateTTS(text: string, speakerId: string | number, _styleId?: number): Promise<string | null> {
        try {
            const sid = typeof speakerId === 'string' ? parseInt(speakerId, 10) : speakerId;
            const urlBase = `http://${this.host}:${this.port}`;
            console.log(`[TTS] Generating Audio: "${text}" with speaker ${sid} at ${urlBase}`);
            
            // 1. Audio query
            const audioQueryResponse = await axios.post(`${urlBase}/audio_query`, null, {
                params: {
                    text: text,
                    speaker: sid
                }
            });
            
            // 2. Synthesis
            const synthesisResponse = await axios.post(`${urlBase}/synthesis`, audioQueryResponse.data, {
                params: {
                    speaker: sid
                },
                responseType: 'arraybuffer'
            });

            // Convert arraybuffer to base64 string
            const base64 = Buffer.from(synthesisResponse.data, 'binary').toString('base64');
            return `data:audio/wav;base64,${base64}`;
        } catch (e) {
            console.error(`[TTS] generateTTS error:`, e);
            return null;
        }
    }

    async getSpeakers(): Promise<any[]> {
        const urlBase = `http://${this.host}:${this.port}`;
        console.log(`[TTS] Fetching speakers from ${urlBase}/speakers`);
        try {
            const res = await axios.get(`${urlBase}/speakers`);
            console.log(`[TTS] Successfully fetched ${res.data.length} speakers`);
            return res.data;
        } catch (e) {
            console.error(`[TTS] getSpeakers failed:`, e);
            throw e;
        }
    }
}
