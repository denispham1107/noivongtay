import type { ImagePickerAsset } from 'expo-image-picker';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import type { CaseImage, CaseVideo, CharityCase } from '@/data/cases';
import { getCaseImages, getCoverImage } from '@/data/cases';
import { getYouTubeId, normalizeCaseVideo } from '@/utils/case-video';
import { auth, db, storage } from './firebase';

export const adminRoles = ['super_admin', 'admin', 'editor', 'moderator'] as const;
export type AdminRole = (typeof adminRoles)[number];
export type CaseStatus = 'draft' | 'published';

export type AdminCase = CharityCase & {
  status: CaseStatus;
  createdBy?: string;
};

export type CaseImageInput = {
  id: string;
  url?: string;
  storagePath?: string;
  caption: string;
  altText: string;
  order: number;
  asset?: ImagePickerAsset | null;
};

export type CaseVideoInput = {
  source: 'upload' | 'youtube';
  enabled?: boolean;
  url?: string;
  storagePath?: string;
  youtubeId?: string;
  title: string;
  asset?: ImagePickerAsset | null;
};

export type NewCharityCase = Omit<CharityCase, 'id' | 'image' | 'images' | 'coverImageId' | 'video'> & {
  images: CaseImageInput[];
  coverImageId: string;
  video: CaseVideoInput | null;
  status: CaseStatus;
};

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === 'string' && adminRoles.includes(role as AdminRole);
}

function safeFileName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase();
}

async function uploadCaseImage(caseId: string, imageId: string, asset: ImagePickerAsset) {
  if (asset.fileSize && asset.fileSize >= 5 * 1024 * 1024) throw new Error('Mỗi ảnh phải nhỏ hơn 5 MB.');

  const contentType = asset.mimeType || asset.file?.type || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) throw new Error('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.');

  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const originalName = asset.fileName || `anh-hoan-canh.${extension}`;
  const fileName = `${safeFileName(imageId)}-${safeFileName(originalName)}`;
  const storagePath = `public/cases/${caseId}/${fileName}`;
  const imageRef = ref(storage, storagePath);
  let blob: Blob;
  if (asset.file) blob = asset.file;
  else blob = await fetch(asset.uri).then((response) => response.blob());

  await uploadBytes(imageRef, blob, { contentType });
  return { url: await getDownloadURL(imageRef), storagePath };
}

async function prepareImages(caseId: string, inputs: CaseImageInput[]): Promise<CaseImage[]> {
  if (!inputs.length) throw new Error('Hãy chọn ít nhất một hình ảnh.');
  if (inputs.length > 10) throw new Error('Mỗi hồ sơ chỉ được đăng tối đa 10 hình ảnh.');

  const ordered = [...inputs].sort((a, b) => a.order - b.order);
  return Promise.all(ordered.map(async (input, index) => {
    const uploaded = input.asset ? await uploadCaseImage(caseId, input.id, input.asset) : null;
    const url = uploaded?.url || input.url?.trim();
    if (!url) throw new Error(`Hình ảnh số ${index + 1} chưa hợp lệ.`);
    const image: CaseImage = {
      id: input.id,
      url,
      caption: input.caption.trim(),
      altText: input.altText.trim(),
      order: index,
    };
    const storagePath = uploaded?.storagePath || input.storagePath;
    if (storagePath) image.storagePath = storagePath;
    return image;
  }));
}

async function uploadCaseVideo(caseId: string, asset: ImagePickerAsset) {
  if (asset.fileSize && asset.fileSize > 100 * 1024 * 1024) throw new Error('Video phải có dung lượng không quá 100 MB.');

  const contentType = asset.mimeType || asset.file?.type || 'video/mp4';
  if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(contentType)) throw new Error('Chỉ chấp nhận video MP4, WebM hoặc MOV.');

  const extension = contentType === 'video/webm' ? 'webm' : contentType === 'video/quicktime' ? 'mov' : 'mp4';
  const originalName = asset.fileName || `video-hoan-canh.${extension}`;
  const fileName = `${Date.now()}-${safeFileName(originalName)}`;
  const storagePath = `public/cases/${caseId}/videos/${fileName}`;
  const videoRef = ref(storage, storagePath);
  let blob: Blob;
  if (asset.file) blob = asset.file;
  else blob = await fetch(asset.uri).then((response) => response.blob());

  await uploadBytes(videoRef, blob, { contentType });
  return { url: await getDownloadURL(videoRef), storagePath };
}

async function prepareVideo(caseId: string, input: CaseVideoInput | null): Promise<CaseVideo | null> {
  if (!input) return null;
  if (input.source === 'youtube') {
    const youtubeId = getYouTubeId(input.youtubeId || input.url || '');
    if (!youtubeId) {
      if (input.enabled === false) return null;
      throw new Error('Liên kết YouTube không hợp lệ.');
    }
    return {
      source: 'youtube',
      youtubeId,
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
      enabled: input.enabled !== false,
      title: input.title.trim(),
    };
  }

  const uploaded = input.asset ? await uploadCaseVideo(caseId, input.asset) : null;
  const url = uploaded?.url || input.url?.trim();
  if (!url) {
    if (input.enabled === false) return null;
    throw new Error('Hãy chọn video muốn tải lên.');
  }
  const video: CaseVideo = {
    source: 'upload',
    url,
    enabled: input.enabled !== false,
    title: input.title.trim(),
  };
  const storagePath = uploaded?.storagePath || input.storagePath;
  if (storagePath) video.storagePath = storagePath;
  return video;
}

async function requireEditorialUser(action: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  const token = await currentUser.getIdTokenResult();
  if (!isAdminRole(token.claims.role)) throw new Error(`Tài khoản không có quyền ${action} hồ sơ.`);
  return currentUser;
}

function buildCaseData(input: NewCharityCase, images: CaseImage[], video: CaseVideo | null) {
  const cover = images.find((entry) => entry.id === input.coverImageId) || images[0];
  if (!cover) throw new Error('Hãy chọn ảnh đại diện cho hồ sơ.');
  return {
    name: input.name.trim(),
    location: input.location.trim(),
    category: input.category,
    summary: input.summary.trim(),
    story: input.story.trim(),
    image: cover.url,
    images,
    coverImageId: cover.id,
    video,
    youtubeUrlDraft: input.youtubeUrlDraft?.trim() || '',
    priority: input.priority,
    updated: 'Vừa cập nhật',
    progress: Math.max(0, Math.min(100, Math.round(input.progress))),
    supporters: Math.max(0, Math.round(input.supporters)),
    verified: input.verified,
    status: input.status,
  };
}

export async function createCharityCase(input: NewCharityCase) {
  const currentUser = await requireEditorialUser('tạo');
  const caseRef = doc(collection(db, 'charityCases'));
  const [images, video] = await Promise.all([prepareImages(caseRef.id, input.images), prepareVideo(caseRef.id, input.video)]);
  const data = buildCaseData(input, images, video);

  await setDoc(caseRef, {
    ...data,
    createdBy: currentUser.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: input.status === 'published' ? serverTimestamp() : null,
  });
  return caseRef.id;
}

export async function updateCharityCase(caseId: string, input: NewCharityCase) {
  const currentUser = await requireEditorialUser('chỉnh sửa');
  const caseRef = doc(db, 'charityCases', caseId);
  const currentSnapshot = await getDoc(caseRef);
  if (!currentSnapshot.exists()) throw new Error('Hồ sơ không còn tồn tại hoặc đã bị xóa.');

  const currentData = currentSnapshot.data();
  const previousImages = getCaseImages({
    name: currentData.name ?? '',
    image: currentData.image ?? '',
    images: currentData.images,
    coverImageId: currentData.coverImageId,
  });
  const previousVideo = normalizeCaseVideo(currentData.video, true);
  const [images, video] = await Promise.all([prepareImages(caseId, input.images), prepareVideo(caseId, input.video)]);
  const data = buildCaseData(input, images, video);

  await updateDoc(caseRef, {
    ...data,
    updatedBy: currentUser.uid,
    updatedAt: serverTimestamp(),
    publishedAt: input.status === 'published' ? currentData.publishedAt ?? serverTimestamp() : null,
  });

  const retainedPaths = new Set(images.map((entry) => entry.storagePath).filter(Boolean));
  const removedPaths = previousImages.map((entry) => entry.storagePath).filter((path): path is string => !!path && !retainedPaths.has(path));
  const removedVideoPath = previousVideo?.source === 'upload' && previousVideo.storagePath !== video?.storagePath
    ? previousVideo.storagePath
    : undefined;
  await Promise.allSettled([
    ...removedPaths.map((path) => deleteObject(ref(storage, path))),
    ...(removedVideoPath ? [deleteObject(ref(storage, removedVideoPath))] : []),
  ]);
}

export async function deleteCharityCaseVideo(caseId: string) {
  const currentUser = await requireEditorialUser('xóa video khỏi');
  const caseRef = doc(db, 'charityCases', caseId);
  const currentSnapshot = await getDoc(caseRef);
  if (!currentSnapshot.exists()) throw new Error('Hồ sơ không còn tồn tại hoặc đã bị xóa.');

  const video = normalizeCaseVideo(currentSnapshot.data().video, true);
  if (video?.source === 'upload' && video.storagePath) {
    try {
      await deleteObject(ref(storage, video.storagePath));
    } catch (reason) {
      if ((reason as { code?: string })?.code !== 'storage/object-not-found') throw reason;
    }
  }

  await updateDoc(caseRef, {
    video: null,
    updatedBy: currentUser.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCharityCaseYoutubeLink(caseId: string) {
  const currentUser = await requireEditorialUser('xóa liên kết YouTube khỏi');
  const caseRef = doc(db, 'charityCases', caseId);
  const currentSnapshot = await getDoc(caseRef);
  if (!currentSnapshot.exists()) throw new Error('Hồ sơ không còn tồn tại hoặc đã bị xóa.');

  const currentVideo = normalizeCaseVideo(currentSnapshot.data().video, true);
  await updateDoc(caseRef, {
    youtubeUrlDraft: '',
    ...(currentVideo?.source === 'youtube' ? { video: null } : {}),
    updatedBy: currentUser.uid,
    updatedAt: serverTimestamp(),
  });
}

function toAdminCase(id: string, data: DocumentData): AdminCase {
  const base = {
    id,
    name: data.name ?? '',
    location: data.location ?? '',
    category: data.category ?? '',
    summary: data.summary ?? '',
    story: data.story ?? '',
    image: data.image ?? '',
    images: data.images,
    coverImageId: data.coverImageId,
    video: normalizeCaseVideo(data.video, true),
    youtubeUrlDraft: typeof data.youtubeUrlDraft === 'string' ? data.youtubeUrlDraft : '',
    priority: data.priority ?? 'Đang cần hỗ trợ',
    updated: data.updated ?? 'Vừa cập nhật',
    progress: Number(data.progress ?? 0),
    supporters: Number(data.supporters ?? 0),
    receivedAmount: Number(data.receivedAmount ?? 0),
    verified: Boolean(data.verified),
    status: data.status === 'published' ? 'published' as const : 'draft' as const,
    createdBy: data.createdBy,
  };
  const images = getCaseImages(base);
  const cover = getCoverImage({ ...base, images });
  return { ...base, images, coverImageId: cover?.id, image: cover?.url || base.image };
}

export async function getAdminCases() {
  const snapshot = await getDocs(collection(db, 'charityCases'));
  return snapshot.docs.map((item) => toAdminCase(item.id, item.data()));
}
