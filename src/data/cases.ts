export type CaseImage = {
  id: string;
  url: string;
  storagePath?: string;
  caption?: string;
  altText?: string;
  order: number;
};

export type CharityCase = {
  id: string;
  name: string;
  location: string;
  category: string;
  summary: string;
  story: string;
  image: string;
  images?: CaseImage[];
  coverImageId?: string;
  priority: string;
  updated: string;
  progress: number;
  supporters: number;
  receivedAmount?: number;
  verified: boolean;
  status?: 'draft' | 'published';
  createdAt?: unknown;
  updatedAt?: unknown;
  publishedAt?: unknown;
};

export function getCaseImages(item: Pick<CharityCase, 'name' | 'image' | 'images' | 'coverImageId'>): CaseImage[] {
  if (item.images?.length) return [...item.images].sort((a, b) => a.order - b.order);
  return item.image ? [{ id: item.coverImageId || 'legacy-cover', url: item.image, altText: `Hình ảnh của ${item.name}`, order: 0 }] : [];
}

export function getCoverImage(item: Pick<CharityCase, 'name' | 'image' | 'images' | 'coverImageId'>): CaseImage | undefined {
  const images = getCaseImages(item);
  return images.find((entry) => entry.id === item.coverImageId) || images[0];
}

export const charityCases: CharityCase[] = [
  {
    id: 'be-minh-an',
    name: 'Bé Minh An',
    location: 'Đồng Nai',
    category: 'Y tế',
    summary: 'Cần được đồng hành trong hành trình điều trị bệnh tim bẩm sinh.',
    story: 'Minh An là một em bé hiền và luôn mỉm cười. Gia đình em đang cố gắng từng ngày để theo đuổi quá trình điều trị dài hạn. Sự quan tâm của cộng đồng sẽ giúp gia đình có thêm điểm tựa trong thời gian này.',
    image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=85',
    priority: 'Khẩn cấp',
    updated: 'Hôm nay',
    progress: 68,
    supporters: 124,
    verified: true,
  },
  {
    id: 'co-lan',
    name: 'Cô Lan',
    location: 'Quảng Nam',
    category: 'Sinh kế',
    summary: 'Mong có một kế sinh nhai ổn định sau mùa mưa lũ.',
    story: 'Sau nhiều năm làm công việc thời vụ, cô Lan mong có một gian hàng nhỏ để chủ động cuộc sống. Hồ sơ đã được tình nguyện viên địa phương gặp gỡ và xác minh.',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=85',
    priority: 'Đang cần hỗ trợ',
    updated: '2 ngày trước',
    progress: 42,
    supporters: 76,
    verified: true,
  },
  {
    id: 'gia-dinh-anh-hung',
    name: 'Gia đình anh Hùng',
    location: 'Lào Cai',
    category: 'Nhà ở',
    summary: 'Cần sửa lại mái nhà để bảo đảm an toàn trước mùa mưa.',
    story: 'Mái nhà của gia đình đã xuống cấp sau nhiều mùa mưa. Nhóm xác minh đang phối hợp với địa phương để lên danh sách vật liệu và kế hoạch sửa chữa minh bạch.',
    image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=85',
    priority: 'Đang cần hỗ trợ',
    updated: '4 ngày trước',
    progress: 31,
    supporters: 48,
    verified: true,
  },
  {
    id: 'lop-hoc-suoi-ma',
    name: 'Lớp học Suối Mã',
    location: 'Sơn La',
    category: 'Giáo dục',
    summary: 'Bổ sung sách và góc đọc cho các em nhỏ vùng cao.',
    story: 'Một góc đọc nhỏ sẽ giúp các em có thêm cơ hội khám phá thế giới. Danh mục sách được xây dựng cùng giáo viên để phù hợp với độ tuổi và chương trình học.',
    image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=85',
    priority: 'Ổn định',
    updated: '1 tuần trước',
    progress: 84,
    supporters: 203,
    verified: true,
  },
];

export const categories = ['Tất cả', 'Y tế', 'Giáo dục', 'Nhà ở', 'Sinh kế'];
