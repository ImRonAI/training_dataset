export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityChoice {
  index: number;
  finish_reason: string;
  message: PerplexityMessage;
  delta?: Partial<PerplexityMessage>;
}

export interface PerplexityUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: PerplexityChoice[];
  usage: PerplexityUsage;
  citations?: string[];
}

export interface ResearchSession {
  id: string;
  title: string;
  query: string;
  response: string;
  citations: string[];
  timestamp: number;
}
