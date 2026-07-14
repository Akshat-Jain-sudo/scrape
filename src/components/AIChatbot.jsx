import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Bug, Lightbulb, Star, HelpCircle, ChevronDown, Sparkles } from 'lucide-react';

/**
 * AIChatbot — Premium floating chatbot widget for Symbiote.
 * 
 * Features:
 * - Glassmorphism floating action button with pulse animation
 * - Slide-up chat window with theme support
 * - Message bubbles with typing indicator
 * - Quick action pills for common intents
 * - Inline feedback collection with star ratings
 * - Session persistence via sessionStorage
 * - Keyboard support (Enter to send, Escape to close)
 */

// Generate or retrieve a persistent session ID
function getSessionId() {
  let id = sessionStorage.getItem('symbiote_chat_session');
  if (!id) {
    id = 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem('symbiote_chat_session', id);
  }
  return id;
}

// Simple markdown-like formatting for bot messages
function formatMessage(text) {
  if (!text) return '';
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Horizontal rule
    .replace(/\n---\n/g, '<hr class="chat-hr"/>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

const QUICK_ACTIONS = [
  { label: '🐛 Report Bug', message: 'I want to report a bug', icon: Bug },
  { label: '💡 Suggest Feature', message: 'I have a feature request', icon: Lightbulb },
  { label: '⭐ Rate App', message: 'I want to rate this app', icon: Star },
  { label: '❓ Help', message: 'What can you help me with?', icon: HelpCircle },
];

export default function AIChatbot({ currentView = 'dashboard', addToast }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasGreeted, setHasGreeted] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatWindowRef = useRef(null);
  const sessionId = useRef(getSessionId());

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Load chat history from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('symbiote_chat_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setHasGreeted(true);
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('symbiote_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Send the initial greeting when opening for the first time
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);

    if (!hasGreeted && messages.length === 0) {
      setHasGreeted(true);
      setIsTyping(true);

      // Send a greeting
      setTimeout(async () => {
        try {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'hello',
              sessionId: sessionId.current,
              currentPage: currentView,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setMessages([{ role: 'assistant', content: data.reply, timestamp: new Date().toISOString() }]);
          } else {
            setMessages([{
              role: 'assistant',
              content: "Hey there! 👋 I'm **Symbiote AI**, your assistant. Ask me about features, report bugs, or share feedback!",
              timestamp: new Date().toISOString(),
            }]);
          }
        } catch {
          setMessages([{
            role: 'assistant',
            content: "Hey there! 👋 I'm **Symbiote AI**, your assistant. Ask me about features, report bugs, or share feedback!",
            timestamp: new Date().toISOString(),
          }]);
        } finally {
          setIsTyping(false);
        }
      }, 600);
    }
  }, [hasGreeted, messages.length, currentView]);

  // Send a message to the chatbot API
  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;

    const userMsg = { role: 'user', content: trimmed, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          sessionId: sessionId.current,
          currentPage: currentView,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Simulate a slight typing delay for natural feel
        await new Promise(r => setTimeout(r, 400 + Math.random() * 600));

        const botMsg = { role: 'assistant', content: data.reply, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, botMsg]);

        if (data.feedbackSaved && addToast) {
          addToast('Feedback saved! Thank you 🙏', 'success');
        }
      } else {
        throw new Error('API error');
      }
    } catch {
      const errorMsg = {
        role: 'assistant',
        content: "Oops, something went wrong 😅. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [currentView, addToast]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickAction = (action) => {
    sendMessage(action.message);
  };

  // Pulse the FAB after a delay to draw attention
  useEffect(() => {
    if (!isOpen && !hasGreeted) {
      const timer = setTimeout(() => {
        setUnreadCount(1);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hasGreeted]);

  return (
    <>
      {/* Chat Window */}
      <div
        ref={chatWindowRef}
        className={`chatbot-window ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-label="AI Chatbot"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="chatbot-header-title">Symbiote AI</div>
              <div className="chatbot-header-status">
                <span className="chatbot-status-dot"></span>
                Online — Ask anything
              </div>
            </div>
          </div>
          <button
            className="chatbot-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="chatbot-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble chat-bubble-${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="chat-bubble-avatar">
                  <Sparkles size={12} />
                </div>
              )}
              <div
                className="chat-bubble-content"
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="chat-bubble chat-bubble-assistant">
              <div className="chat-bubble-avatar">
                <Sparkles size={12} />
              </div>
              <div className="chat-typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions (show when few messages) */}
        {messages.length <= 2 && !isTyping && (
          <div className="chatbot-quick-actions">
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                className="chatbot-quick-btn"
                onClick={() => handleQuickAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <form className="chatbot-input-area" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="chatbot-input"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isTyping}
            aria-label="Chat message input"
            autoComplete="off"
          />
          <button
            type="submit"
            className="chatbot-send-btn"
            disabled={!inputValue.trim() || isTyping}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Floating Action Button */}
      <button
        className={`chatbot-fab ${isOpen ? 'active' : ''}`}
        onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <ChevronDown size={24} />
        ) : (
          <>
            <MessageCircle size={24} />
            {unreadCount > 0 && (
              <span className="chatbot-fab-badge">{unreadCount}</span>
            )}
          </>
        )}
      </button>
    </>
  );
}
