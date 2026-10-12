import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { SessionSort, SortOrder } from '../types';

export const queryKeys = {
  stats: ['stats'] as const,
  pages: ['pages'] as const,
  sessions: (params: SessionsParams) => ['sessions', params] as const,
  timeline: (sessionId: string) => ['timeline', sessionId] as const,
  heatmap: (pageUrl: string | undefined) => ['heatmap', pageUrl ?? 'all'] as const,
};

export interface SessionsParams {
  limit: number;
  offset: number;
  search?: string;
  sort: SessionSort;
  order: SortOrder;
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: api.stats,
    refetchInterval: 15_000,
  });
}

export function usePages() {
  return useQuery({ queryKey: queryKeys.pages, queryFn: api.pages });
}

export function useSessions(params: SessionsParams) {
  return useQuery({
    queryKey: queryKeys.sessions(params),
    queryFn: () => api.sessions({ ...params, search: params.search || undefined }),
    placeholderData: keepPreviousData,
  });
}

export function useTimeline(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.timeline(sessionId ?? ''),
    queryFn: () => api.timeline(sessionId as string),
    enabled: Boolean(sessionId),
  });
}

export function useHeatmap(pageUrl: string | undefined) {
  return useQuery({
    queryKey: queryKeys.heatmap(pageUrl),
    queryFn: () => api.heatmap({ pageUrl }),
    placeholderData: keepPreviousData,
  });
}
