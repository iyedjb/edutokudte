# Eduna SDK

Official SDK for integrating **Eduna AI** - the educational AI assistant powered by EduTok.

## Quick Start

### 1. Install the SDK

```bash
npm install eduna-sdk
```

### 2. Get Your API Key

Visit [EduTok DevTools](https://edutok.replit.app/devtools/apikeys) to create your free API key.

### 3. Initialize in Your Project

After installation, a starter template will be created automatically. Or run:

```bash
npx eduna init
```

## Usage Examples

### JavaScript/HTML (Browser)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Meu Site com Eduna AI</title>
</head>
<body>
  <h1>Bem-vindo ao Meu Site</h1>
  
  <!-- Eduna Chat Widget -->
  <script src="https://edutok.replit.app/sdk/eduna-widget.js"></script>
  <script>
    EdunaAI.init({
      apiKey: 'YOUR_API_KEY_HERE',
      position: 'bottom-right',
      theme: 'auto',
      language: 'pt-BR'
    });
  </script>
</body>
</html>
```

### Node.js

```javascript
const { EdunaAI } = require('eduna-sdk');

const eduna = new EdunaAI({
  apiKey: 'YOUR_API_KEY_HERE'
});

async function chat() {
  const response = await eduna.chat('Explique fotossíntese de forma simples');
  console.log(response.message);
}

chat();
```

### React

```jsx
import { EdunaChat } from 'eduna-sdk/react';

function App() {
  return (
    <div>
      <h1>Meu App Educacional</h1>
      <EdunaChat 
        apiKey="YOUR_API_KEY_HERE"
        position="bottom-right"
        theme="auto"
      />
    </div>
  );
}
```

### Python

```python
from eduna import EdunaAI

eduna = EdunaAI(api_key="YOUR_API_KEY_HERE")

response = eduna.chat("Explique fotossíntese de forma simples")
print(response.message)
```

## API Reference

### `EdunaAI.init(options)`

Initialize the Eduna chat widget.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | Your API key from EduTok DevTools |
| `position` | string | `'bottom-right'` | Widget position: `'bottom-right'`, `'bottom-left'`, `'top-right'`, `'top-left'` |
| `theme` | string | `'auto'` | Color theme: `'light'`, `'dark'`, `'auto'` |
| `language` | string | `'pt-BR'` | Interface language |
| `greeting` | string | `'Olá! Como posso ajudar?'` | Initial greeting message |
| `placeholder` | string | `'Digite sua pergunta...'` | Input placeholder text |

### `eduna.chat(message, options)`

Send a message to Eduna AI.

```javascript
const response = await eduna.chat('Qual é a capital do Brasil?', {
  model: 'eduna-4.0',      // AI model to use
  deepSearch: false,       // Enable deep search mode
  temperature: 0.7         // Response creativity (0-1)
});
```

### Response Object

```javascript
{
  message: "A capital do Brasil é Brasília...",
  tokens: 150,
  model: "eduna-4.0",
  timestamp: "2024-01-15T10:30:00Z"
}
```

## Rate Limits

| Plan | Tokens/Day | Requests/Min |
|------|------------|--------------|
| Free | 500 | 60 |
| Pro | 5,000 | 120 |
| Enterprise | Unlimited | Custom |

## Models Available

| Model | Description | Best For |
|-------|-------------|----------|
| `eduna-4.0` | Balanced, fast responses | General use |
| `eduna-scholar` | Academic, detailed responses | Research, homework |
| `eduna-lite` | Quick, concise answers | Simple questions |

## Support

- Documentation: https://edutok.replit.app/docs
- API Keys: https://edutok.replit.app/devtools/apikeys
- Issues: https://github.com/edutok/eduna-sdk/issues

## License

MIT License - Use freely in your projects!
