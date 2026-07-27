import { useCallback, useEffect, useState } from 'react';

import type { CharityCase } from '@/data/cases';
import { charityCases as demoCases } from '@/data/cases';
import { getPublishedCases } from '@/services/charity-cases';
import { isFirebaseConfigured } from '@/services/firebase';

export function usePublishedCases() {
  const [cases, setCases] = useState<CharityCase[]>(isFirebaseConfigured ? [] : demoCases);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCases(await getPublishedCases());
    } catch (reason) {
      setCases([]);
      setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { cases, loading, error, refresh };
}
