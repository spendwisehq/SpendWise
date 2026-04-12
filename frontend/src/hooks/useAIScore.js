import { useQuery } from '@tanstack/react-query';
import aiAPI from '../api/ai.api';

export function useAIScore() {
  const query = useQuery({
    queryKey: ['ai-score'],
    queryFn: () => aiAPI.getScore().then(r => r.data),
    enabled: false,
  });

  return {
    score: query.data,
    isLoading: query.isFetching,
    refetch: query.refetch,
  };
}
