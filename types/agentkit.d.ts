declare module 'agentkit' {
  export interface AgentConfig {
    apiKey: string;
    model: string;
    tools?: any[];
  }

  export interface Agent {
    analyze: (input: string) => Promise<any>;
  }

  export function createAgent(config: AgentConfig): Agent;
} 