import React, { useState, useRef, useEffect } from 'react';

const App = () => {
  const [isChat, setIsChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const API_URL = 'http://localhost:8000/chat';

  const defaultPrompts = [
    'Find best tourist attractions nearby',
    'Recommend local restaurants and cuisine',
    'Plan a day trip itinerary',
    'Learn about local culture and history'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const getBotResponse = async (userMessage) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.session_id) {
        setSessionId(data.session_id);
      }

      return data.response;
    } catch (error) {
      console.error('Error calling backend:', error);
      return "Sorry, I'm having trouble connecting to the server. Please make sure the backend is running on http://localhost:8000";
    }
  };

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text) return;

    if (!isChat) {
      setIsChat(true);
    }

    setMessages(prev => [...prev, { text, isUser: true }]);
    setInputValue('');
    setIsTyping(true);

    const response = await getBotResponse(text);
    
    setIsTyping(false);
    setMessages(prev => [...prev, { text: response, isUser: false }]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePromptClick = (prompt) => {
    setInputValue(prompt);
    setTimeout(() => sendMessage(), 100);
  };

  const refreshPrompts = () => {
    const cards = document.querySelectorAll('.prompt-card');
    cards.forEach(card => {
      card.style.animation = 'none';
      setTimeout(() => {
        card.style.animation = 'slideIn 0.3s ease';
      }, 10);
    });
  };

  // Format bot message to display bullet points properly
  const formatBotMessage = (text) => {
    if (!text) return text;
    
    // Split by lines and format bullet points
    const lines = text.split('\n');
    const formattedLines = lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) return null;
      
      // Check if line starts with bullet point indicators
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || trimmedLine.startsWith('* ')) {
        const bulletContent = trimmedLine.replace(/^[-•*]\s*/, '').trim();
        if (!bulletContent) return null;
        return (
          <div key={index} style={styles.bulletPoint}>
            <span style={styles.bullet}>•</span>
            <span style={styles.bulletText}>{bulletContent}</span>
          </div>
        );
      }
      
      // Check if line is a section header (like "Day 1:", "Accommodation:", etc.)
      if (trimmedLine.endsWith(':') || /^(Day \d+|Accommodation|Transportation|Budget|Tips?|Itinerary|Places|Restaurants|Hotels):/i.test(trimmedLine)) {
        return (
          <div key={index} style={styles.sectionHeader}>
            {trimmedLine}
          </div>
        );
      }
      
      // If it's regular text that should be a bullet point (starts with text but no bullet)
      // Convert it to a bullet point for consistency
      if (trimmedLine.length > 0 && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('•') && !trimmedLine.startsWith('*')) {
        return (
          <div key={index} style={styles.bulletPoint}>
            <span style={styles.bullet}>•</span>
            <span style={styles.bulletText}>{trimmedLine}</span>
          </div>
        );
      }
      
      return null;
    }).filter(Boolean); // Remove null entries
    
    return <div style={styles.messageContentWrapper}>{formattedLines}</div>;
  };

  return (
    <div style={styles.body}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>🗺</div>
          Tourist Buddy
        </div>
      </div>

      {/* Welcome View */}
      {!isChat && (
        <div style={styles.mainContent}>
          <h1 style={styles.greetingTitle}>Hello, Buddy</h1>
          <h2 style={styles.greetingSubtitle}>Can I help you with anything?</h2>
          
          <p style={styles.description}>
            Choose a prompt below or write your own to start<br />
            chatting with Tourist Buddy
          </p>

          <div style={styles.promptsGrid} className="prompts-grid">
            {defaultPrompts.map((prompt, idx) => (
              <div
                key={idx}
                className="prompt-card"
                style={styles.promptCard}
                onClick={() => handlePromptClick(prompt)}
              >
                {prompt}
              </div>
            ))}
          </div>

          <button style={styles.refreshButton} onClick={refreshPrompts}>
            <span style={styles.refreshIcon}>🔄</span>
            Refresh prompts
          </button>

          <div style={styles.inputWrapper}>
            <div style={styles.inputContainer}>
              <input
                type="text"
                style={styles.mainInput}
                placeholder="How can Tourist Buddy help you today?"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              
              <div style={styles.inputActions}>
                <button style={styles.sendButton} onClick={sendMessage} title="Send">
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat View */}
      {isChat && (
        <div style={styles.chatView}>
          <div style={styles.messagesArea}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.message,
                  ...(msg.isUser ? styles.messageUser : {}),
                }}
              >
                <div style={{
                  ...styles.messageAvatar,
                  ...(msg.isUser ? styles.messageAvatarUser : styles.messageAvatarBot),
                }}>
                  {msg.isUser ? 'M' : '🗺'}
                </div>
                <div style={{
                  ...styles.messageBubble,
                  ...(msg.isUser ? styles.messageBubbleUser : {}),
                }}>
                  {msg.isUser ? (
                    msg.text
                  ) : (
                    <div style={styles.botMessageContent}>
                      {formatBotMessage(msg.text)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={styles.message}>
                <div style={{...styles.messageAvatar, ...styles.messageAvatarBot}}>
                  🗺
                </div>
                <div style={{...styles.messageBubble, fontStyle: 'italic', opacity: 0.6}}>
                  Typing...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div style={styles.chatInputArea}>
            <div style={styles.inputContainer}>
              <input
                type="text"
                style={styles.mainInput}
                placeholder="How can Tourist Buddy help you today?"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              
              <div style={styles.inputActions}>
                <button style={styles.sendButton} onClick={sendMessage} title="Send">
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  body: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
    background: 'linear-gradient(to bottom, #e8f5e9 0%, #f1f8f4 50%, #f5f5f5 100%)',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 0,
  },
  header: {
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: '500',
    color: '#1a1a1a',
  },
  logoIcon: {
    width: '28px',
    height: '28px',
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  },
  greetingTitle: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '8px',
    textAlign: 'center',
  },
  greetingSubtitle: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '16px',
    textAlign: 'center',
  },
  description: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    lineHeight: '1.5',
    marginBottom: '36px',
  },
  promptsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    width: '100%',
    maxWidth: '800px',
    marginBottom: '16px',
  },
  promptCard: {
    background: 'white',
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    padding: '18px 16px',
    fontSize: '14px',
    color: '#1a1a1a',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    lineHeight: '1.4',
    animation: 'slideIn 0.3s ease',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: '8px',
    marginBottom: '32px',
    transition: 'all 0.2s ease',
  },
  refreshIcon: {
    fontSize: '14px',
  },
  inputWrapper: {
    width: '100%',
    maxWidth: '800px',
    position: 'relative',
  },
  inputContainer: {
    background: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '16px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
  },
  mainInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '15px',
    color: '#1a1a1a',
    fontFamily: 'inherit',
  },
  inputActions: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  sendButton: {
    width: '36px',
    height: '36px',
    border: 'none',
    background: '#00e676',
    color: 'white',
    cursor: 'pointer',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  chatView: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  message: {
    display: 'flex',
    gap: '12px',
    maxWidth: '75%',
    animation: 'slideIn 0.3s ease',
  },
  messageUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
  },
  messageAvatarBot: {
    background: 'linear-gradient(180deg, #00ff00 0%, #00e676 100%)',
    color: 'white',
  },
  messageAvatarUser: {
    background: '#1a1a1a',
    color: 'white',
    fontWeight: '500',
  },
  messageBubble: {
    background: 'white',
    border: '1px solid #e5e5e5',
    borderRadius: '16px',
    padding: '16px 18px',
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#1a1a1a',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    maxWidth: '100%',
  },
  messageBubbleUser: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
  botMessageContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  messageContentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  bulletPoint: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '4px',
    paddingLeft: '2px',
    lineHeight: '1.5',
  },
  bullet: {
    color: '#00e676',
    fontSize: '16px',
    fontWeight: 'bold',
    flexShrink: 0,
    marginTop: '3px',
    lineHeight: '1.2',
  },
  bulletText: {
    flex: 1,
    lineHeight: '1.5',
    color: '#1a1a1a',
    fontSize: '15px',
    wordBreak: 'break-word',
  },
  sectionHeader: {
    fontWeight: '600',
    fontSize: '16px',
    color: '#667eea',
    marginTop: '16px',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '2px solid #e8f5e9',
  },
  regularText: {
    lineHeight: '1.6',
    marginBottom: '4px',
    color: '#1a1a1a',
  },
  chatInputArea: {
    padding: '20px',
    borderTop: '1px solid #e5e5e5',
    background: 'white',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
  },
};

export default App;
