import axios from 'axios';
import { TTSProvider } from './TTSProvider';

export class CoeiroinkEngineClient implements TTSProvider {
    constructor(private host: string, private port: number) { }

    async generateTTS(text: string, speakerId: string | number, styleId?: number): Promise<string | null> {
        const urlBase = `http://${this.host}:${this.port}/v1`;
        try {
            console.log(`[TTS] Generating Audio: "${text}" with speaker ${speakerId} (style: ${styleId}) at ${urlBase}`);

            // 1. Predict
            const synthesisResponse = await axios.post(`${urlBase}/predict`, {
                text: text,
                speakerUuid: speakerId,
                styleId: styleId || 0,
                speedScale: 1.0, 
            }, {
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
        const urlBase = `http://${this.host}:${this.port}/v1`;
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
