// mobile/src/hooks/useCategories.js
import { useQuery } from '@tanstack/react-query';
import categoryAPI from '../api/category.api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryAPI.getAll().then(r => r.data.categories),
  });
}
