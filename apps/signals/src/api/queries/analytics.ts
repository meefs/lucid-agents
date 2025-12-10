import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../client'
import type { _Error } from '@lucid-agents/hono-runtime/sdk'

const getBaseUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  return 'http://localhost:8787'
}

export interface UseAnalyticsSummaryOptions {
  windowHours?: number
  enabled?: boolean
}

export interface AnalyticsSummary {
  outgoingTotal: string
  incomingTotal: string
  netTotal: string
  outgoingCount: number
  incomingCount: number
  windowStart: number | null
  windowEnd: number
}

/**
 * Fetch analytics summary for an agent
 */
export function useAnalyticsSummary(
  agentId: string,
  options: UseAnalyticsSummaryOptions = {}
) {
  const { windowHours, enabled = true } = options

  return useQuery<AnalyticsSummary, _Error>({
    queryKey: ['analytics', 'summary', agentId, windowHours],
    queryFn: async () => {
      const url = new URL(
        `/api/agents/${agentId}/analytics/summary`,
        getBaseUrl()
      )
      if (windowHours) {
        url.searchParams.set('windowHours', windowHours.toString())
      }
      const response = await fetch(url.toString())
      if (!response.ok) {
        const error = await response.json()
        throw error
      }
      return response.json()
    },
    enabled: enabled && !!agentId,
  })
}

export interface UseAnalyticsTransactionsOptions {
  windowHours?: number
  direction?: 'incoming' | 'outgoing'
  enabled?: boolean
}

export interface Transaction {
  id?: string
  groupName: string
  scope: string
  direction: 'incoming' | 'outgoing'
  amount: string
  amountUsdc: string
  timestamp: number
  timestampIso: string
}

/**
 * Fetch analytics transactions for an agent
 */
export function useAnalyticsTransactions(
  agentId: string,
  options: UseAnalyticsTransactionsOptions = {}
) {
  const { windowHours, direction, enabled = true } = options

  return useQuery<Transaction[], _Error>({
    queryKey: ['analytics', 'transactions', agentId, windowHours, direction],
    queryFn: async () => {
      const url = new URL(
        `/api/agents/${agentId}/analytics/transactions`,
        getBaseUrl()
      )
      if (windowHours) {
        url.searchParams.set('windowHours', windowHours.toString())
      }
      if (direction) {
        url.searchParams.set('direction', direction)
      }
      const response = await fetch(url.toString())
      if (!response.ok) {
        const error = await response.json()
        throw error
      }
      return response.json()
    },
    enabled: enabled && !!agentId,
  })
}

/**
 * Export analytics as CSV
 */
export function useAnalyticsExportCSV(
  agentId: string,
  windowHours?: number
) {
  return useQuery<string, _Error>({
    queryKey: ['analytics', 'export', 'csv', agentId, windowHours],
    queryFn: async () => {
      const url = new URL(
        `/api/agents/${agentId}/analytics/export/csv`,
        getBaseUrl()
      )
      if (windowHours) {
        url.searchParams.set('windowHours', windowHours.toString())
      }
      const response = await fetch(url.toString())
      if (!response.ok) {
        const error = await response.json()
        throw error
      }
      return response.text()
    },
    enabled: false, // Only fetch when explicitly called
  })
}

/**
 * Export analytics as JSON
 */
export function useAnalyticsExportJSON(
  agentId: string,
  windowHours?: number
) {
  return useQuery<{ summary: AnalyticsSummary; transactions: Transaction[] }, _Error>({
    queryKey: ['analytics', 'export', 'json', agentId, windowHours],
    queryFn: async () => {
      const url = new URL(
        `/api/agents/${agentId}/analytics/export/json`,
        getBaseUrl()
      )
      if (windowHours) {
        url.searchParams.set('windowHours', windowHours.toString())
      }
      const response = await fetch(url.toString())
      if (!response.ok) {
        const error = await response.json()
        throw error
      }
      return response.json()
    },
    enabled: false, // Only fetch when explicitly called
  })
}

