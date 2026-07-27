import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import type { CharityCase } from '@/data/cases';
import { charityCases as demoCases, getCaseImages, getCoverImage } from '@/data/cases';
import { db, isFirebaseConfigured } from './firebase';

export async function getPublishedCases(): Promise<CharityCase[]> {
  if (!isFirebaseConfigured) return demoCases;

  const casesQuery = query(
    collection(db, 'charityCases'),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(20),
  );
  const snapshot = await getDocs(casesQuery);
  return snapshot.docs.map((document) => {
    const item = { id: document.id, ...document.data() } as CharityCase;
    const images = getCaseImages(item);
    const cover = getCoverImage({ ...item, images });
    return {
      ...item,
      receivedAmount: Number(item.receivedAmount ?? 0),
      images,
      coverImageId: cover?.id,
      image: cover?.url || item.image,
    };
  });
}

export function subscribePublishedCases(
  onCases: (cases: CharityCase[]) => void,
  onError?: (reason: Error) => void,
) {
  if (!isFirebaseConfigured) {
    onCases(demoCases);
    return () => undefined;
  }

  const casesQuery = query(
    collection(db, 'charityCases'),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(20),
  );
  return onSnapshot(casesQuery, (snapshot) => {
    onCases(snapshot.docs.map((document) => {
      const item = { id: document.id, ...document.data() } as CharityCase;
      const images = getCaseImages(item);
      const cover = getCoverImage({ ...item, images });
      return {
        ...item,
        receivedAmount: Number(item.receivedAmount ?? 0),
        images,
        coverImageId: cover?.id,
        image: cover?.url || item.image,
      };
    }));
  }, (reason) => onError?.(reason));
}
