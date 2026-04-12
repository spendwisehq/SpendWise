import { useQuery } from '@tanstack/react-query';
import transactionAPI from '../api/transaction.api';
import aiAPI from '../api/ai.api';
import aiAdvancedAPI from '../api/aiAdvanced.api';

export function useGoals() {
  const statsQuery = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => transactionAPI.getStats().then(r => r.data),
  });

  const scoreQuery = useQuery({
    queryKey: ['ai-score'],
    queryFn: () => aiAPI.getScore().then(r => r.data),
    enabled: false,
  });

  const recsQuery = useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: () => aiAPI.getRecommendations().then(r => r.data),
    enabled: false,
  });

  const forecastQuery = useQuery({
    queryKey: ['ai-forecast', 3],
    queryFn: () => aiAdvancedAPI.getForecast({ months: 3 }).then(r => r.data),
    enabled: false,
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    score: scoreQuery.data,
    recommendations: recsQuery.data?.recommendations || [],
    forecast: forecastQuery.data,
    aiLoading: scoreQuery.isFetching || recsQuery.isFetching || forecastQuery.isFetching,
    fetchAIData: () => {
      scoreQuery.refetch();
      recsQuery.refetch();
      forecastQuery.refetch();
    },
  };
}
