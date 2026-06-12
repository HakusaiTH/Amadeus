import { useState, useEffect, useCallback } from 'react';

export function useSpeechRecognition(lang = 'th-TH') {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [recognition, setRecognition] = useState(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            
            rec.onstart = () => setIsRecording(true);
            rec.onend = () => setIsRecording(false);
            rec.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsRecording(false);
            };
            
            setRecognition(rec);
        } else {
            console.warn("Speech Recognition API not supported in this browser.");
        }
    }, []);

    useEffect(() => {
        if (recognition) {
            recognition.lang = lang;
        }
    }, [lang, recognition]);

    const startRecording = useCallback((onResult) => {
        if (recognition && !isRecording) {
            recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
                if (onResult) onResult(text);
            };
            try {
                recognition.start();
            } catch(e) {}
        }
    }, [recognition, isRecording]);

    const stopRecording = useCallback(() => {
        if (recognition && isRecording) {
            try {
                recognition.stop();
            } catch(e) {}
        }
    }, [recognition, isRecording]);

    return { isRecording, transcript, startRecording, stopRecording, isSupported: !!recognition };
}
