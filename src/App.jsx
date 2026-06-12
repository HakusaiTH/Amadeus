import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, MessageSquare, MessageCircle, X } from 'lucide-react';
import VrmViewer from './components/VrmViewer';
import { useGemini } from './hooks/useGemini';
import { useElevenLabs } from './hooks/useElevenLabs';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { stopAudioPlayback } from './utils/audioSystem';
import './index.css';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

function App() {
  const { messages, generateContent, isThinking, systemLanguage, setSystemLanguage, resetHistory } = useGemini(GEMINI_API_KEY);
  const { playSpeech, isPlaying } = useElevenLabs(ELEVENLABS_API_KEY);
  const { isRecording, transcript, startRecording, stopRecording, isSupported } = useSpeechRecognition(systemLanguage);
  
  const [inputText, setInputText] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, isChatOpen]);

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
      stopAudioPlayback();
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
        
        {/* Floating Mic Button (Bottom Left) */}
        <button 
          className={`floating-mic icon-btn ${isRecording ? 'recording' : ''}`}
          onClick={toggleMic}
          disabled={!isSupported || isThinking}
          title={isRecording ? "Stop Recording" : "Start Microphone"}
        >
          {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
        </button>

        {/* Floating Chat Toggle (Bottom Right) */}
        {!isChatOpen && (
          <button 
            className="floating-toggle icon-btn"
            onClick={() => setIsChatOpen(true)}
            title="Open Chat"
          >
            <MessageCircle size={28} />
          </button>
        )}

        {/* Collapsible Chat Sidebar */}
        <div className={`chat-sidebar ${!isChatOpen ? 'hidden' : ''}`}>
          <div className="chat-header">
            <img src="/images/Amadeuslogo.png" alt="Amadeus AI" className="chat-logo" />
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select 
                className="lang-select" 
                value={systemLanguage} 
                onChange={(e) => setSystemLanguage(e.target.value)}
              >
                <option value="th-TH">TH</option>
                <option value="ja-JP">JP</option>
              </select>
              <button 
                onClick={() => setIsChatOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
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

          <div className="chat-controls">
            <div className="input-row">
              <input 
                type="text" 
                className="text-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                placeholder="Type a message..."
              />
              <button 
                className="send-btn"
                onClick={handleSendText}
                disabled={isThinking || !inputText.trim()}
              >
                <Send size={20} />
              </button>
            </div>
            
            <button className="reset-btn" onClick={handleReset}>
              Reset Conversation
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
