// mobile/src/hooks/useGroups.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import groupAPI from '../api/group.api';
import Toast from 'react-native-toast-message';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => groupAPI.getAll().then(r => r.data),
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => groupAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      Toast.show({ type: 'success', text1: 'Group created!' });
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: err.message || 'Failed to create group' });
    },
  });
}
