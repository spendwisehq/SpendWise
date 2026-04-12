// mobile/src/hooks/useDashboardStats.js
import { useQuery } from '@tanstack/react-query';
import transactionAPI from '../api/transaction.api';

export function useStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => transactionAPI.getStats().then(r => r.data),
  });
}

export function useTransactionSummary(month, year) {
  return useQuery({
    queryKey: ['transaction-summary', month, year],
    queryFn: () => transactionAPI.getSummary({ month, year }).then(r => r.data),
  });
}

export function useDashboardStats(month, year) {
  const stats = useStats();
  const summary = useTransactionSummary(month, year);

  return {
    stats: stats.data,
    summary: summary.data,
    isLoading: stats.isLoading || summary.isLoading,
    isRefetching: stats.isRefetching || summary.isRefetching,
    refetch: () => {
      stats.refetch();
      summary.refetch();
    },
  };
}
