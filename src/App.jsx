import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, MessageSquare } from 'lucide-react';
import VrmViewer from './components/VrmViewer';
import { useGemini } from './hooks/useGemini';
import { useElevenLabs } from './hooks/useElevenLabs';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { stopAudioPlayback } from './utils/audioSystem';
import './index.css';

// Using API keys from environment variables
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

function App() {
  const { messages, generateContent, isThinking, systemLanguage, setSystemLanguage, resetHistory } = useGemini(GEMINI_API_KEY);
  const { playSpeech, isPlaying } = useElevenLabs(ELEVENLABS_API_KEY);
  const { isRecording, transcript, startRecording, stopRecording, isSupported } = useSpeechRecognition(systemLanguage);
  
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Handle speech recognition result
  const handleSpeechResult = async (text) => {
    stopRecording();
    if (text.trim()) {
      const reply = await generateContent(text);
      if (reply) {
        await playSpeech(reply, 
            () => window.setTalkingState && window.setTalkingState(true),
            () => window.setTalkingState && window.setTalkingState(false)
        );
      }
    }
  };

  const handleSendText = async () => {
    if (!inputText.trim() || isThinking) return;
    const text = inputText;
    setInputText('');
    const reply = await generateContent(text);
    if (reply) {
      await playSpeech(reply,
          () => window.setTalkingState && window.setTalkingState(true),
          () => window.setTalkingState && window.setTalkingState(false)
      );
    }
  };

  const toggleMic = () => {
    if (isRecording) {
      stopRecording();
    } else {
      stopAudioPlayback(); // Stop any currently playing audio so it doesn't bleed into mic
      startRecording(handleSpeechResult);
    }
  };

  const handleReset = () => {
    stopAudioPlayback();
    resetHistory();
  };

  return (
    <div className="app-container">
      <VrmViewer isTalking={isPlaying} />
      
      <div className="ui-layer">
        <div className="glass-panel chat-sidebar">
          <div className="chat-header">
            <h2>Amadeus AI</h2>
            <select 
              className="lang-select" 
              value={systemLanguage} 
              onChange={(e) => setSystemLanguage(e.target.value)}
            >
              <option value="th-TH">Thai (th-TH)</option>
              <option value="ja-JP">Japanese (ja-JP)</option>
            </select>
          </div>

          <div className="chat-history">
            {messages.length === 0 && !isThinking && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
                <MessageSquare size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                <p>Start a conversation by speaking or typing.</p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role === 'user' ? 'user' : 'model'}`}>
                {msg.text}
              </div>
            ))}
            
            {isThinking && (
              <div className="message model" style={{ opacity: 0.7 }}>
                <span className="dot-pulse">Thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-controls" style={{ flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                placeholder="Type a message..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: '8px', 
                  border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)',
                  color: 'white', outline: 'none'
                }}
              />
              <button 
                onClick={handleSendText}
                disabled={isThinking || !inputText.trim()}
                style={{
                  padding: '10px', borderRadius: '8px', background: 'var(--primary)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  opacity: (isThinking || !inputText.trim()) ? 0.5 : 1
                }}
              >
                <Send size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
              <button 
                className={`mic-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleMic}
                disabled={!isSupported || isThinking}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                {isRecording ? 'Stop Recording' : 'Start Mic'}
              </button>
              
              <button 
                onClick={handleReset}
                style={{
                  padding: '10px 16px', borderRadius: '12px', background: 'transparent',
                  color: 'var(--text-muted)', border: '1px solid var(--glass-border)', cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
