import { useQuery } from '@tanstack/react-query';
import aiAPI from '../api/ai.api';

export function useAIAnalysis(month, year) {
  const analysisQuery = useQuery({
    queryKey: ['ai-analysis', month, year],
    queryFn: () => aiAPI.getAnalysis({ month, year }).then(r => r.data),
    enabled: false,
  });

  const insightsQuery = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => aiAPI.getInsights().then(r => r.data),
    enabled: false,
  });

  return {
    analysis: analysisQuery.data,
    insights: insightsQuery.data?.insights || [],
    isLoading: analysisQuery.isFetching || insightsQuery.isFetching,
    fetchAIInsights: () => {
      analysisQuery.refetch();
      insightsQuery.refetch();
    },
  };
}
