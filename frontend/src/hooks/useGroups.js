import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import groupAPI from '../api/group.api';
import toast from 'react-hot-toast';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => groupAPI.getAll().then(r => r.data.groups || []),
  });
}

export function useGroupDetail(groupId) {
  const groupQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupAPI.getOne(groupId).then(r => r.data.group),
    enabled: !!groupId,
  });

  const splitsQuery = useQuery({
    queryKey: ['group-splits', groupId],
    queryFn: () => groupAPI.getSplits(groupId).then(r => r.data.splits || []),
    enabled: !!groupId,
  });

  const balancesQuery = useQuery({
    queryKey: ['group-balances', groupId],
    queryFn: () => groupAPI.getBalances(groupId).then(r => r.data),
    enabled: !!groupId,
  });

  return {
    group: groupQuery.data,
    splits: splitsQuery.data || [],
    balances: balancesQuery.data,
    isLoading: groupQuery.isLoading || splitsQuery.isLoading || balancesQuery.isLoading,
    refetch: () => {
      groupQuery.refetch();
      splitsQuery.refetch();
      balancesQuery.refetch();
    },
  };
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => groupAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created!');
    },
    onError: () => toast.error('Failed to create group'),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => groupAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group deleted');
    },
    onError: () => toast.error('Failed to delete group'),
  });
}

export function useAddSplit(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => groupAPI.addSplit(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-splits', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-balances', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast.success('Expense added!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add expense'),
  });
}

export function useSettleSplit(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ splitId, userId }) => groupAPI.settleShare(groupId, splitId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-splits', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-balances', groupId] });
      toast.success('Marked as settled!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to settle'),
  });
}

export function useAddMember(groupId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => groupAPI.addMember(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      toast.success('Member added successfully!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add member'),
  });
}
