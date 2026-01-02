#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

const TEMPLATES = {
  html: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meu Site com Eduna AI</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 500px;
    }
    h1 { color: #333; margin-bottom: 10px; }
    p { color: #666; margin-bottom: 20px; }
    .badge {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      display: inline-block;
    }
    .instructions {
      margin-top: 30px;
      text-align: left;
      background: #f5f5f5;
      padding: 20px;
      border-radius: 12px;
    }
    .instructions h3 { color: #333; margin-bottom: 10px; }
    .instructions ol { color: #666; padding-left: 20px; }
    .instructions li { margin-bottom: 8px; }
    code {
      background: #e0e0e0;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Bem-vindo ao Eduna AI!</h1>
    <p>Seu assistente educacional inteligente esta pronto para uso.</p>
    <span class="badge">Powered by EduTok</span>
    
    <div class="instructions">
      <h3>Como usar:</h3>
      <ol>
        <li>Substitua <code>YOUR_API_KEY_HERE</code> pela sua chave API</li>
        <li>Obtenha sua chave em: <a href="https://edutok.replit.app/devtools/apikeys" target="_blank">EduTok DevTools</a></li>
        <li>Clique no botao de chat no canto inferior direito</li>
      </ol>
    </div>
  </div>

  <!-- Eduna AI Chat Widget -->
  <script src="https://edutok.replit.app/sdk/eduna-widget.js"></script>
  <script>
    // =====================================================
    // CONFIGURE SUA CHAVE API AQUI
    // =====================================================
    EdunaAI.init({
      apiKey: 'YOUR_API_KEY_HERE',  // <-- Substitua pela sua chave
      position: 'bottom-right',
      theme: 'auto',
      language: 'pt-BR',
      greeting: 'Ola! Sou a Eduna, sua assistente educacional. Como posso ajudar?',
      placeholder: 'Faca uma pergunta sobre qualquer assunto...'
    });
  </script>
</body>
</html>`,

  react: `// Eduna AI React Component
// Adicione este componente ao seu projeto React

import { useEffect } from 'react';

interface EdunaProps {
  apiKey: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
}

export function EdunaChat({ apiKey, position = 'bottom-right', theme = 'auto' }: EdunaProps) {
  useEffect(() => {
    // Load Eduna widget script
    const script = document.createElement('script');
    script.src = 'https://edutok.replit.app/sdk/eduna-widget.js';
    script.async = true;
    script.onload = () => {
      if (window.EdunaAI) {
        window.EdunaAI.init({ apiKey, position, theme });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      const widget = document.getElementById('eduna-chat-widget');
      if (widget) widget.remove();
    };
  }, [apiKey, position, theme]);

  return null;
}

// Uso:
// import { EdunaChat } from './EdunaChat';
// 
// function App() {
//   return (
//     <div>
//       <h1>Meu App</h1>
//       <EdunaChat apiKey="YOUR_API_KEY_HERE" />
//     </div>
//   );
// }`,

  node: `// Eduna AI Node.js Example
// Execute com: node eduna-example.js

const { EdunaAI } = require('eduna-sdk');

// Inicialize com sua chave API
const eduna = new EdunaAI({
  apiKey: 'YOUR_API_KEY_HERE' // Substitua pela sua chave
});

async function main() {
  try {
    console.log('Enviando pergunta para Eduna AI...');
    
    // Exemplo de chat simples
    const response = await eduna.chat('Explique a fotossintese de forma simples');
    
    console.log('\\nResposta da Eduna:');
    console.log(response.message);
    console.log('\\nTokens usados:', response.tokens);
    
    // Verificar uso da API
    const usage = await eduna.getUsage();
    console.log('\\nUso da API:');
    console.log('  Tokens usados hoje: ' + usage.tokensUsed + '/' + usage.tokensLimit);
    console.log('  Requisicoes hoje: ' + usage.requestsToday);
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

main();`
};

function showHelp() {
  console.log(`
+==============================================================+
|                    EDUNA SDK CLI                             |
+==============================================================+
|  Comandos disponiveis:                                       |
|                                                              |
|  npx eduna init           Cria templates em ./eduna-starter  |
|  npx eduna init --html    Cria apenas template HTML          |
|  npx eduna init --react   Cria apenas template React         |
|  npx eduna init --node    Cria apenas template Node.js       |
|  npx eduna help           Mostra esta ajuda                  |
|                                                              |
|  Obtenha sua chave API em:                                   |
|  https://edutok.replit.app/devtools/apikeys                  |
+==============================================================+
`);
}

function createFile(filename, content) {
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filename, content);
  console.log('  [OK] Criado: ' + filename);
}

function init(type) {
  const outputDir = './eduna-starter';
  
  console.log('\\n>> Criando projeto Eduna AI...\\n');
  
  if (!type || type === '--all') {
    createFile(outputDir + '/index.html', TEMPLATES.html);
    createFile(outputDir + '/EdunaChat.tsx', TEMPLATES.react);
    createFile(outputDir + '/eduna-example.js', TEMPLATES.node);
  } else if (type === '--html') {
    createFile(outputDir + '/index.html', TEMPLATES.html);
  } else if (type === '--react') {
    createFile(outputDir + '/EdunaChat.tsx', TEMPLATES.react);
  } else if (type === '--node') {
    createFile(outputDir + '/eduna-example.js', TEMPLATES.node);
  }
  
  console.log(`
>> Projeto criado com sucesso!

Arquivos em: ${outputDir}/

Proximos passos:
  1. Acesse https://edutok.replit.app/devtools/apikeys
  2. Crie sua chave API gratuita
  3. Substitua 'YOUR_API_KEY_HERE' nos arquivos
  4. Comece a usar a Eduna AI!

Documentacao: https://edutok.replit.app/docs
`);
}

// Main CLI logic
switch (command) {
  case 'init':
    init(args[1]);
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    showHelp();
}
