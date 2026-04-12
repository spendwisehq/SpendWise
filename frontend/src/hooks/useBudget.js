import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationAPI from '../api/notification.api';
import toast from 'react-hot-toast';

export function useBudget() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['budget'],
    queryFn: () => notificationAPI.getBudget().then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: (totalBudget) => notificationAPI.setBudget({ totalBudget }),
    onSuccess: (res) => {
      queryClient.setQueryData(['budget'], res.data);
      toast.success('Spending cap set!');
    },
    onError: () => toast.error('Failed to set cap'),
  });

  return {
    budget: query.data?.budget,
    isLoading: query.isLoading,
    setBudget: mutation,
  };
}
