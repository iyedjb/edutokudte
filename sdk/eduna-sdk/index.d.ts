/**
 * Eduna SDK TypeScript Definitions
 */

export interface EdunaOptions {
  apiKey: string;
  baseUrl?: string;
  model?: 'eduna-4.0' | 'eduna-scholar' | 'eduna-lite';
}

export interface ChatOptions {
  model?: 'eduna-4.0' | 'eduna-scholar' | 'eduna-lite';
  deepSearch?: boolean;
  temperature?: number;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatResponse {
  message: string;
  tokens: number;
  model: string;
  timestamp: string;
}

export interface UsageResponse {
  tokensUsed: number;
  tokensLimit: number;
  requestsToday: number;
  resetTime: string;
}

export interface WidgetOptions {
  apiKey: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  greeting?: string;
  placeholder?: string;
}

export class EdunaAI {
  constructor(options: EdunaOptions);
  
  chat(message: string, options?: ChatOptions): Promise<ChatResponse>;
  analyzeImage(imageBase64: string, prompt?: string): Promise<ChatResponse>;
  getUsage(): Promise<UsageResponse>;
}

declare global {
  interface Window {
    EdunaAI: {
      init(options: WidgetOptions): void;
      SDK: typeof EdunaAI;
    };
  }
}
