// mobile/src/hooks/useGoals.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import goalAPI from '../api/goal.api';
import Toast from 'react-native-toast-message';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: () => goalAPI.getAll().then(r => r.data),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => goalAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      Toast.show({ type: 'success', text1: 'Goal created!' });
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: err.message || 'Failed to create goal' });
    },
  });
}
