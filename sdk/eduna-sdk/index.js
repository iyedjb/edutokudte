/**
 * Eduna SDK - Official SDK for Eduna AI
 * Educational AI assistant by EduTok
 */

const API_BASE_URL = 'https://edutok.replit.app/api';

class EdunaAI {
  constructor(options = {}) {
    if (!options.apiKey) {
      throw new Error('API key is required. Get one at https://edutok.replit.app/devtools/apikeys');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || API_BASE_URL;
    this.defaultModel = options.model || 'eduna-4.0';
  }

  async chat(message, options = {}) {
    if (!message || typeof message !== 'string') {
      throw new Error('Message is required and must be a string');
    }

    const response = await fetch(`${this.baseUrl}/sdk/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-SDK-Version': '1.0.0'
      },
      body: JSON.stringify({
        message,
        model: options.model || this.defaultModel,
        deepSearch: options.deepSearch || false,
        temperature: options.temperature || 0.7,
        conversationHistory: options.history || []
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  async analyzeImage(imageBase64, prompt = 'Descreva esta imagem') {
    const response = await fetch(`${this.baseUrl}/sdk/analyze-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-SDK-Version': '1.0.0'
      },
      body: JSON.stringify({
        image: imageBase64,
        prompt
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  async getUsage() {
    const response = await fetch(`${this.baseUrl}/sdk/usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-SDK-Version': '1.0.0'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch usage data');
    }

    return response.json();
  }
}

// Browser widget initialization
if (typeof window !== 'undefined') {
  window.EdunaAI = {
    init: function(options) {
      if (!options.apiKey) {
        console.error('[Eduna] API key is required');
        return;
      }

      const position = options.position || 'bottom-right';
      const theme = options.theme || 'auto';
      
      // Create chat widget container
      const container = document.createElement('div');
      container.id = 'eduna-chat-widget';
      container.innerHTML = `
        <style>
          #eduna-chat-widget {
            position: fixed;
            ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
            ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
            z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .eduna-trigger {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .eduna-trigger:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
          }
          .eduna-trigger svg {
            width: 28px;
            height: 28px;
            fill: white;
          }
          .eduna-chat-box {
            position: absolute;
            ${position.includes('bottom') ? 'bottom: 70px;' : 'top: 70px;'}
            ${position.includes('right') ? 'right: 0;' : 'left: 0;'}
            width: 380px;
            height: 520px;
            background: ${theme === 'dark' ? '#1a1a2e' : '#ffffff'};
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            display: none;
            flex-direction: column;
            overflow: hidden;
          }
          .eduna-chat-box.open {
            display: flex;
          }
          .eduna-header {
            padding: 16px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .eduna-header img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
          }
          .eduna-messages {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
          }
          .eduna-input-area {
            padding: 12px;
            border-top: 1px solid ${theme === 'dark' ? '#333' : '#eee'};
            display: flex;
            gap: 8px;
          }
          .eduna-input {
            flex: 1;
            padding: 12px;
            border: 1px solid ${theme === 'dark' ? '#444' : '#ddd'};
            border-radius: 24px;
            background: ${theme === 'dark' ? '#2a2a3e' : '#f5f5f5'};
            color: ${theme === 'dark' ? '#fff' : '#333'};
            outline: none;
          }
          .eduna-send {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #6366f1;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .eduna-send svg {
            width: 20px;
            height: 20px;
            fill: white;
          }
        </style>
        <button class="eduna-trigger" aria-label="Abrir chat Eduna">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.97 4.29L2 22l5.71-.97A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.41 0-2.76-.36-3.95-1.04l-.28-.17-3.11.53.53-3.11-.17-.28C4.36 14.76 4 13.41 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>
        </button>
        <div class="eduna-chat-box">
          <div class="eduna-header">
            <img src="https://edutok.replit.app/eduna-avatar.png" alt="Eduna" />
            <div>
              <strong>Eduna AI</strong>
              <div style="font-size: 12px; opacity: 0.9;">Assistente Educacional</div>
            </div>
          </div>
          <div class="eduna-messages">
            <div style="text-align: center; color: #888; margin-top: 40%;">
              ${options.greeting || 'Olá! Como posso ajudar você hoje?'}
            </div>
          </div>
          <div class="eduna-input-area">
            <input type="text" class="eduna-input" placeholder="${options.placeholder || 'Digite sua pergunta...'}" />
            <button class="eduna-send">
              <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(container);
      
      // Toggle chat
      const trigger = container.querySelector('.eduna-trigger');
      const chatBox = container.querySelector('.eduna-chat-box');
      trigger.addEventListener('click', () => {
        chatBox.classList.toggle('open');
      });

      console.log('[Eduna] Widget initialized successfully');
    },
    
    // Expose the SDK class
    SDK: EdunaAI
  };
}

// Node.js/CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EdunaAI };
}

// ES modules export
if (typeof exports !== 'undefined') {
  exports.EdunaAI = EdunaAI;
}
