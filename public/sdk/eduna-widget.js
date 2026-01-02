/**
 * Eduna AI Chat Widget
 * Embed the Eduna educational AI assistant on any website
 * 
 * Usage:
 * <script src="https://edutok.replit.app/sdk/eduna-widget.js"></script>
 * <script>
 *   EdunaAI.init({
 *     apiKey: 'YOUR_API_KEY',
 *     position: 'bottom-right',
 *     theme: 'auto'
 *   });
 * </script>
 */

(function() {
  'use strict';

  const API_BASE = 'https://edutok.replit.app/api';
  
  const DEFAULT_OPTIONS = {
    position: 'bottom-right',
    theme: 'auto',
    language: 'pt-BR',
    greeting: 'Olá! Sou a Eduna, sua assistente educacional. Como posso ajudar?',
    placeholder: 'Digite sua pergunta...',
    primaryColor: '#6366f1'
  };

  let isOpen = false;
  let messages = [];
  let isLoading = false;

  function getStyles(options) {
    const pos = options.position || 'bottom-right';
    const isDark = options.theme === 'dark' || 
      (options.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    return `
      #eduna-widget-container {
        position: fixed;
        ${pos.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
        ${pos.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }
      
      #eduna-trigger {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${options.primaryColor || '#6366f1'}, #8b5cf6);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
        transition: all 0.3s ease;
        animation: eduna-pulse 2s infinite;
      }
      
      @keyframes eduna-pulse {
        0%, 100% { box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4); }
        50% { box-shadow: 0 4px 30px rgba(99, 102, 241, 0.6); }
      }
      
      #eduna-trigger:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
      }
      
      #eduna-trigger svg {
        width: 28px;
        height: 28px;
        fill: white;
      }
      
      #eduna-trigger.open svg.chat-icon { display: none; }
      #eduna-trigger.open svg.close-icon { display: block; }
      #eduna-trigger:not(.open) svg.chat-icon { display: block; }
      #eduna-trigger:not(.open) svg.close-icon { display: none; }
      
      #eduna-chat-box {
        position: absolute;
        ${pos.includes('bottom') ? 'bottom: 75px;' : 'top: 75px;'}
        ${pos.includes('right') ? 'right: 0;' : 'left: 0;'}
        width: 380px;
        max-width: calc(100vw - 40px);
        height: 550px;
        max-height: calc(100vh - 120px);
        background: ${isDark ? '#1a1a2e' : '#ffffff'};
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid ${isDark ? '#333' : '#e5e7eb'};
      }
      
      #eduna-chat-box.open {
        display: flex;
        animation: eduna-slide-in 0.3s ease;
      }
      
      @keyframes eduna-slide-in {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .eduna-header {
        padding: 16px;
        background: linear-gradient(135deg, ${options.primaryColor || '#6366f1'}, #8b5cf6);
        color: white;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
      
      .eduna-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }
      
      .eduna-header-info h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .eduna-header-info p {
        margin: 2px 0 0 0;
        font-size: 12px;
        opacity: 0.9;
      }
      
      .eduna-messages {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: ${isDark ? '#16162a' : '#f9fafb'};
      }
      
      .eduna-message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 16px;
        animation: eduna-fade-in 0.3s ease;
      }
      
      @keyframes eduna-fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .eduna-message.user {
        align-self: flex-end;
        background: linear-gradient(135deg, ${options.primaryColor || '#6366f1'}, #8b5cf6);
        color: white;
        border-bottom-right-radius: 4px;
      }
      
      .eduna-message.assistant {
        align-self: flex-start;
        background: ${isDark ? '#2a2a4a' : '#ffffff'};
        color: ${isDark ? '#e5e7eb' : '#374151'};
        border: 1px solid ${isDark ? '#3a3a5a' : '#e5e7eb'};
        border-bottom-left-radius: 4px;
      }
      
      .eduna-typing {
        display: flex;
        gap: 4px;
        padding: 8px 0;
      }
      
      .eduna-typing span {
        width: 8px;
        height: 8px;
        background: ${isDark ? '#6366f1' : '#6366f1'};
        border-radius: 50%;
        animation: eduna-bounce 1.4s infinite;
      }
      
      .eduna-typing span:nth-child(2) { animation-delay: 0.2s; }
      .eduna-typing span:nth-child(3) { animation-delay: 0.4s; }
      
      @keyframes eduna-bounce {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-8px); }
      }
      
      .eduna-input-area {
        padding: 12px 16px;
        border-top: 1px solid ${isDark ? '#333' : '#e5e7eb'};
        display: flex;
        gap: 8px;
        background: ${isDark ? '#1a1a2e' : '#ffffff'};
        flex-shrink: 0;
      }
      
      .eduna-input {
        flex: 1;
        padding: 12px 16px;
        border: 1px solid ${isDark ? '#444' : '#e5e7eb'};
        border-radius: 24px;
        background: ${isDark ? '#2a2a4a' : '#f3f4f6'};
        color: ${isDark ? '#fff' : '#1f2937'};
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }
      
      .eduna-input:focus {
        border-color: ${options.primaryColor || '#6366f1'};
      }
      
      .eduna-input::placeholder {
        color: ${isDark ? '#888' : '#9ca3af'};
      }
      
      .eduna-send {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${options.primaryColor || '#6366f1'}, #8b5cf6);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      
      .eduna-send:hover {
        transform: scale(1.05);
      }
      
      .eduna-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      .eduna-send svg {
        width: 20px;
        height: 20px;
        fill: white;
      }
      
      .eduna-powered {
        text-align: center;
        padding: 8px;
        font-size: 11px;
        color: ${isDark ? '#666' : '#9ca3af'};
        background: ${isDark ? '#1a1a2e' : '#ffffff'};
      }
      
      .eduna-powered a {
        color: ${options.primaryColor || '#6366f1'};
        text-decoration: none;
      }
      
      @media (max-width: 480px) {
        #eduna-chat-box {
          width: calc(100vw - 40px);
          height: calc(100vh - 100px);
          ${pos.includes('right') ? 'right: 0;' : 'left: 0;'}
        }
      }
    `;
  }

  function createWidget(options) {
    const container = document.createElement('div');
    container.id = 'eduna-widget-container';
    
    container.innerHTML = `
      <style>${getStyles(options)}</style>
      
      <button id="eduna-trigger" aria-label="Abrir chat Eduna">
        <svg class="chat-icon" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
          <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
        </svg>
        <svg class="close-icon" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      
      <div id="eduna-chat-box">
        <div class="eduna-header">
          <div class="eduna-avatar">🎓</div>
          <div class="eduna-header-info">
            <h3>Eduna AI</h3>
            <p>Assistente Educacional</p>
          </div>
        </div>
        
        <div class="eduna-messages" id="eduna-messages"></div>
        
        <div class="eduna-input-area">
          <input 
            type="text" 
            class="eduna-input" 
            id="eduna-input"
            placeholder="${options.placeholder}"
            autocomplete="off"
          />
          <button class="eduna-send" id="eduna-send" aria-label="Enviar">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
        
        <div class="eduna-powered">
          Powered by <a href="https://edutok.replit.app" target="_blank">EduTok</a>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Add initial greeting
    const messagesContainer = document.getElementById('eduna-messages');
    addMessage('assistant', options.greeting);
    
    // Event listeners
    const trigger = document.getElementById('eduna-trigger');
    const chatBox = document.getElementById('eduna-chat-box');
    const input = document.getElementById('eduna-input');
    const sendBtn = document.getElementById('eduna-send');
    
    trigger.addEventListener('click', () => {
      isOpen = !isOpen;
      trigger.classList.toggle('open', isOpen);
      chatBox.classList.toggle('open', isOpen);
      if (isOpen) {
        setTimeout(() => input.focus(), 100);
      }
    });
    
    sendBtn.addEventListener('click', () => sendMessage(options));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(options);
      }
    });
    
    console.log('[Eduna] Widget initialized');
  }

  function addMessage(role, content) {
    const container = document.getElementById('eduna-messages');
    const msg = document.createElement('div');
    msg.className = `eduna-message ${role}`;
    msg.textContent = content;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    messages.push({ role, content });
  }

  function showTyping() {
    const container = document.getElementById('eduna-messages');
    const typing = document.createElement('div');
    typing.className = 'eduna-message assistant';
    typing.id = 'eduna-typing';
    typing.innerHTML = '<div class="eduna-typing"><span></span><span></span><span></span></div>';
    container.appendChild(typing);
    container.scrollTop = container.scrollHeight;
  }

  function hideTyping() {
    const typing = document.getElementById('eduna-typing');
    if (typing) typing.remove();
  }

  async function sendMessage(options) {
    const input = document.getElementById('eduna-input');
    const sendBtn = document.getElementById('eduna-send');
    const message = input.value.trim();
    
    if (!message || isLoading) return;
    
    isLoading = true;
    input.value = '';
    sendBtn.disabled = true;
    
    addMessage('user', message);
    showTyping();
    
    try {
      const response = await fetch(`${API_BASE}/sdk/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.apiKey}`,
          'X-SDK-Version': '1.0.0'
        },
        body: JSON.stringify({
          message,
          conversationHistory: messages.slice(-10)
        })
      });
      
      hideTyping();
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Erro ao processar sua mensagem');
      }
      
      const data = await response.json();
      addMessage('assistant', data.message || data.response || 'Desculpe, não entendi.');
      
    } catch (error) {
      hideTyping();
      addMessage('assistant', `Desculpe, ocorreu um erro: ${error.message}`);
      console.error('[Eduna] Error:', error);
    }
    
    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }

  // Expose to window
  window.EdunaAI = {
    init: function(options) {
      if (!options || !options.apiKey) {
        console.error('[Eduna] API key is required. Get one at https://edutok.replit.app/devtools/apikeys');
        return;
      }
      
      const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => createWidget(mergedOptions));
      } else {
        createWidget(mergedOptions);
      }
    },
    
    open: function() {
      const trigger = document.getElementById('eduna-trigger');
      const chatBox = document.getElementById('eduna-chat-box');
      if (trigger && chatBox) {
        isOpen = true;
        trigger.classList.add('open');
        chatBox.classList.add('open');
      }
    },
    
    close: function() {
      const trigger = document.getElementById('eduna-trigger');
      const chatBox = document.getElementById('eduna-chat-box');
      if (trigger && chatBox) {
        isOpen = false;
        trigger.classList.remove('open');
        chatBox.classList.remove('open');
      }
    },
    
    sendMessage: function(message) {
      const input = document.getElementById('eduna-input');
      if (input) {
        input.value = message;
        sendMessage(window.EdunaAI._options || DEFAULT_OPTIONS);
      }
    }
  };
})();
