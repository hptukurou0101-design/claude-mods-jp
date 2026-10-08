export type SkillUse = { name: string; at: number }
export type AgentRun = {
  id: string
  type: string
  description: string
  model: string
  startedAt: number
  endedAt: number | null
}

export type UsdJpy = { rate: number; date: string; fetchedAt: number }

export type TokenTotals = { input: number; output: number; cacheRead: number; cacheWrite: number }

declare module 'claude-code' {
  interface PluginState {
    'work-status': {
      skills: SkillUse[]
      agents: AgentRun[]
      sessionStartedAt: number
      turnStartedAt: number | null
      tokens: TokenTotals
      usdJpy: UsdJpy | null
    }
  }
}
