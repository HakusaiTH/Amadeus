import { useState } from 'react';
import { playAudioBuffer, audioContext } from '../utils/audioSystem';

export function useElevenLabs(apiKey, voiceId = 'aSXMur7mD1WXp3qPUFMR') {
    const [isPlaying, setIsPlaying] = useState(false);

    const playSpeech = async (text, onStart, onEnd) => {
        if (!text.trim()) return;
        
        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_multilingual_v2',
                    output_format: 'mp3_44100_128',
                })
            });

            if (!response.ok) throw new Error("ElevenLabs API Error");

            const arrayBuffer = await response.arrayBuffer();
            
            if (audioContext) {
                const decodedData = await audioContext.decodeAudioData(arrayBuffer);
                setIsPlaying(true);
                if (onStart) onStart();
                
                playAudioBuffer(decodedData, () => {
                    setIsPlaying(false);
                    if (onEnd) onEnd();
                });
            }
        } catch (e) {
            console.error(e);
            setIsPlaying(false);
        }
    };

    return { playSpeech, isPlaying };
}
