import { useCallback, useEffect, useState } from 'react';

import { defaultCasePriorities, getCasePriorities, type CasePriority } from '@/services/priorities';

export function useCasePriorities() {
  const [priorities, setPriorities] = useState<CasePriority[]>(defaultCasePriorities);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setPriorities(await getCasePriorities());
    } catch {
      setPriorities(defaultCasePriorities);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { priorities, loading, refresh };
}
