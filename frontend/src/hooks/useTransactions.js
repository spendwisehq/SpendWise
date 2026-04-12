import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import transactionAPI from '../api/transaction.api';
import toast from 'react-hot-toast';

export function useTransactions(filters = {}, page = 1) {
  const params = { page, limit: 15, ...filters };
  Object.keys(params).forEach(k => !params[k] && delete params[k]);

  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => transactionAPI.getAll(params).then(r => r.data),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => transactionAPI.create(data),
    onMutate: async (newTxn) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const queries = queryClient.getQueriesData({ queryKey: ['transactions'] });
      const previousData = queries.map(([key, data]) => [key, data]);

      queryClient.setQueriesData({ queryKey: ['transactions'] }, (old) => {
        if (!old?.transactions) return old;
        const optimistic = {
          _id: `temp-${Date.now()}`,
          ...newTxn,
          createdAt: new Date().toISOString(),
          date: newTxn.date || new Date().toISOString(),
          source: 'manual',
          categoryName: 'Uncategorized',
        };
        return {
          ...old,
          transactions: [optimistic, ...old.transactions],
          pagination: { ...old.pagination, total: (old.pagination?.total || 0) + 1 },
        };
      });

      return { previousData };
    },
    onError: (err, _, context) => {
      context?.previousData?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error(err.message || 'Failed to add transaction');
    },
    onSuccess: () => {
      toast.success('Transaction added!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-summary'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => transactionAPI.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const queries = queryClient.getQueriesData({ queryKey: ['transactions'] });
      const previousData = queries.map(([key, data]) => [key, data]);

      queryClient.setQueriesData({ queryKey: ['transactions'] }, (old) => {
        if (!old?.transactions) return old;
        return {
          ...old,
          transactions: old.transactions.map(txn =>
            txn._id === id ? { ...txn, ...data } : txn
          ),
        };
      });

      return { previousData };
    },
    onError: (err, _, context) => {
      context?.previousData?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error(err.message || 'Failed to update transaction');
    },
    onSuccess: () => {
      toast.success('Transaction updated!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-summary'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => transactionAPI.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });
      const queries = queryClient.getQueriesData({ queryKey: ['transactions'] });
      const previousData = queries.map(([key, data]) => [key, data]);

      queryClient.setQueriesData({ queryKey: ['transactions'] }, (old) => {
        if (!old?.transactions) return old;
        return {
          ...old,
          transactions: old.transactions.filter(txn => txn._id !== id),
          pagination: { ...old.pagination, total: Math.max(0, (old.pagination?.total || 0) - 1) },
        };
      });

      return { previousData };
    },
    onError: (err, _, context) => {
      context?.previousData?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error(err.message || 'Failed to delete transaction');
    },
    onSuccess: () => {
      toast.success('Transaction deleted');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-summary'] });
    },
  });
}
