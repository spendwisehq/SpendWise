// mobile/src/hooks/useFriends.js
import { useQuery } from '@tanstack/react-query';
import friendAPI from '../api/friend.api';

export function useFriends() {
  return useQuery({
    queryKey: ['friends'],
    queryFn: () => friendAPI.getAll().then(r => r.data),
  });
}
