'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'
import { AgentResponse } from '@/config/agentkit'

interface AgentState {
  messages: AgentResponse[]
  isLoading: boolean
  error: string | null
  currentToken: {
    id: string
    name: string
    description: string
    imageUrl: string
    price: string
  } | null
}

type AgentAction =
  | { type: 'ADD_MESSAGE'; payload: AgentResponse }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_TOKEN'; payload: AgentState['currentToken'] }
  | { type: 'CLEAR_MESSAGES' }

const initialState: AgentState = {
  messages: [],
  isLoading: false,
  error: null,
  currentToken: null
}

function agentReducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      }
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      }
    case 'SET_CURRENT_TOKEN':
      return {
        ...state,
        currentToken: action.payload
      }
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: []
      }
    default:
      return state
  }
}

interface AgentContextType extends AgentState {
  sendMessage: (message: string, userId?: string) => Promise<void>
  getRecommendations: (userId?: string, preferences?: {
    interests?: string[]
    priceRange?: { min: number; max: number }
  }) => Promise<void>
  analyzeToken: (tokenId: string, userId?: string) => Promise<void>
  clearMessages: () => void
}

const AgentContext = createContext<AgentContextType | undefined>(undefined)

export function AgentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(agentReducer, initialState)

  const sendMessage = async (message: string, userId?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          userId,
          context: {
            currentToken: state.currentToken
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send message')
      }

      const data = await response.json()
      dispatch({ type: 'ADD_MESSAGE', payload: data })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const getRecommendations = async (userId?: string, preferences?: {
    interests?: string[]
    priceRange?: { min: number; max: number }
  }) => {
    await sendMessage('recommend tokens', userId)
  }

  const analyzeToken = async (tokenId: string, userId?: string) => {
    await sendMessage('analyze token', userId)
  }

  const clearMessages = () => {
    dispatch({ type: 'CLEAR_MESSAGES' })
  }

  return (
    <AgentContext.Provider
      value={{
        ...state,
        sendMessage,
        getRecommendations,
        analyzeToken,
        clearMessages
      }}
    >
      {children}
    </AgentContext.Provider>
  )
}

export function useAgent() {
  const context = useContext(AgentContext)
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider')
  }
  return context
} 