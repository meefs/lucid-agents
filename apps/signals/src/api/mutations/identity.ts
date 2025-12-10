import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'
import { getApiAgentsByAgentIdQueryKey } from '../queries/agents'
import type { _Error } from '@lucid-agents/hono-runtime/sdk'

export interface IdentityRegistrationResult {
  status: 'registered' | 'pending' | 'failed' | 'not_registered'
  agentId?: string
  owner?: string
  tokenURI?: string
  domain?: string
  error?: string
}

export interface UseRetryIdentityRegistrationOptions {
  onSuccess?: (result: IdentityRegistrationResult) => void
  onError?: (error: _Error) => void
}

/**
 * Retry identity registration for an agent
 */
export function useRetryIdentityRegistration(
  agentId: string,
  options: UseRetryIdentityRegistrationOptions = {}
) {
  const queryClient = useQueryClient()

  return useMutation<IdentityRegistrationResult, _Error>({
    mutationFn: async () => {
      const getBaseUrl = (): string => {
        if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
          return import.meta.env.VITE_API_URL
        }
        return 'http://localhost:8787'
      }
      const url = new URL(
        `/api/agents/${agentId}/identity/retry`,
        getBaseUrl()
      )
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        const error = await response.json()
        throw error
      }
      return response.json()
    },
    onSuccess: (data) => {
      // Invalidate agent query to refetch with updated metadata
      queryClient.invalidateQueries({
        queryKey: getApiAgentsByAgentIdQueryKey({
          client: apiClient,
          path: { agentId },
        }),
      })
      options.onSuccess?.(data)
    },
    onError: (error) => {
      options.onError?.(error)
    },
  })
}

