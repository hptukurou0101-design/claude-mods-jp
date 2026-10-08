export type SkillUse = { name: string; at: number }
export type AgentRun = {
  id: string
  type: string
  description: string
  model: string
  startedAt: number
  endedAt: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'work-status': {
      skills: SkillUse[]
      agents: AgentRun[]
      sessionStartedAt: number
      turnStartedAt: number | null
    }
  }
}
