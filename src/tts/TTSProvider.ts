export interface TTSProvider {
    generateTTS(text: string, speakerId: string | number, styleId?: number): Promise<string | null>;
}
