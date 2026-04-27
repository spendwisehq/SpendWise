// mobile/src/hooks/useAIChat.js
import { useMutation, useQuery } from '@tanstack/react-query';
import aiAPI from '../api/ai.api';

export function useAIChat() {
  return useMutation({
    mutationFn: (message) => aiAPI.chat({ message }).then(r => r.data),
  });
}

export function useAIScore() {
  return useQuery({
    queryKey: ['ai-score'],
    queryFn: () => aiAPI.score().then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAIInsights() {
  return useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => aiAPI.insights().then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });
}
