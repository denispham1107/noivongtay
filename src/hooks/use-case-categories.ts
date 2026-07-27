import { useCallback, useEffect, useState } from 'react';

import { defaultCaseCategories, getCaseCategories, type CaseCategory } from '@/services/categories';

export function useCaseCategories() {
  const [categories, setCategories] = useState<CaseCategory[]>(defaultCaseCategories);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await getCaseCategories());
    } catch {
      setCategories(defaultCaseCategories);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { categories, loading, refresh };
}
