# Nối Vòng Tay

Ứng dụng cộng đồng và dashboard quản trị dùng chung một codebase cho Web, Android và iOS.

## Công nghệ

- Expo SDK 54, React Native, TypeScript và Expo Router
- Firebase Authentication, Cloud Firestore, Cloud Storage và Cloud Functions
- Firebase Security Rules cho dữ liệu và hình ảnh
- Responsive UI dùng chung cho mobile và web

## Chạy ứng dụng

```bash
npm install
npm run web
```

Chạy trên điện thoại bằng Expo Go:

```bash
npm start
```

Sau đó quét mã QR bằng Expo Go trên Android hoặc camera trên iOS.

Nếu điện thoại không kết nối được qua mạng LAN, chạy:

```bash
npx expo start --tunnel --clear
```

## Kết nối Firebase

1. Tạo Firebase project.
2. Bật Authentication với Email/Password.
3. Tạo Cloud Firestore.
4. Bật Cloud Storage và chuyển dự án sang gói Blaze.
5. Sao chép `.env.example` thành `.env` và điền cấu hình Firebase Web App.
6. Cài Firebase CLI và đăng nhập.
7. Chọn project rồi triển khai rules, indexes và functions.

```bash
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes,storage
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

Cloud Functions được đặt tại vùng `asia-southeast1` và chỉ cho phép tài khoản có claim `role: super_admin` tạo hoặc xóa tài khoản quản trị.

## Triển khai Web trên GitHub Pages

Kho mã đã có workflow `.github/workflows/deploy-pages.yml`. Mỗi lần đẩy
nhánh `main` lên GitHub, workflow sẽ tự build và xuất bản Web tại:

```text
https://denispham1107.github.io/noivongtay/
```

Trong **GitHub → Settings → Secrets and variables → Actions**, cần tạo:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_VAPID_KEY`

Sau đó vào **Settings → Pages → Build and deployment** và chọn
**Source: GitHub Actions**.

Có thể kiểm tra bản Web tương ứng với GitHub Pages trên máy bằng:

```bash
EXPO_PUBLIC_SITE_BASE_URL=/noivongtay \
EXPO_PUBLIC_SITE_URL=https://denispham1107.github.io/noivongtay \
npx expo export --platform web
```

## Triển khai Backend Firebase

Mã backend được lưu trong kho GitHub, còn dịch vụ đang chạy được triển khai
lên Firebase Cloud Functions, Firestore và Storage:

```bash
firebase deploy --only functions,firestore:rules,firestore:indexes,storage --project noi-vong-tay
```

## Cấu trúc chính

```text
src/app/                 Các màn hình Expo Router
src/app/admin/           Dashboard quản trị responsive
src/app/cases/           Trang chi tiết hoàn cảnh
src/components/          Thành phần giao diện dùng chung
src/data/                Dữ liệu demo an toàn
src/services/            Kết nối Firebase và truy vấn dữ liệu
functions/               Backend quản lý tài khoản admin
firestore.rules          Phân quyền dữ liệu
storage.rules            Phân quyền và kiểm tra hình ảnh
```

## Chế độ demo

Khi chưa có biến môi trường Firebase, ứng dụng dùng dữ liệu mẫu trong `src/data/cases.ts`. Dashboard cho phép thử tạo và xóa người dùng trên bộ nhớ cục bộ. Sau khi kết nối Firebase, cần thay các thao tác demo bằng callable Cloud Functions đã có trong `functions/src/index.ts`.

## Kiểm tra

```bash
npx tsc --noEmit
npx expo export --platform web
cd functions && npm run build
```
