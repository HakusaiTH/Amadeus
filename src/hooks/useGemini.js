import { useState, useRef } from 'react';

export function useGemini(apiKey) {
    const [messages, setMessages] = useState([]);
    const [isThinking, setIsThinking] = useState(false);
    const historyRef = useRef([]);
    const [systemLanguage, setSystemLanguage] = useState('th-TH');

    const generateContent = async (text) => {
        setIsThinking(true);
        setMessages(prev => [...prev, { role: 'user', text }]);
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const contents = historyRef.current.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));
        
        contents.push({
            role: "user",
            parts: [{ text }]
        });

        const instruction = systemLanguage === 'ja-JP' 
            ? "Your primary language is Japanese. Please speak in Japanese. Provide short, natural conversational responses."
            : "Your primary language is Thai. Please speak in Thai. Provide short, natural conversational responses.";

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: instruction }] },
                    contents,
                    generationConfig: { temperature: 0.7 }
                })
            });

            if (!response.ok) throw new Error("API Error");
            const data = await response.json();
            
            if (data.candidates && data.candidates[0]) {
                const reply = data.candidates[0].content.parts[0].text;
                historyRef.current.push({ role: "user", text });
                historyRef.current.push({ role: "model", text: reply });
                setMessages(prev => [...prev, { role: 'model', text: reply }]);
                return reply;
            }
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'system', text: "Error generating response." }]);
        } finally {
            setIsThinking(false);
        }
    };

    const resetHistory = () => {
        historyRef.current = [];
        setMessages([]);
    };

    return { messages, generateContent, isThinking, systemLanguage, setSystemLanguage, resetHistory };
}
