# Hướng dẫn Test Từng Thư viện

Để xác định thư viện nào gây ra lỗi `TypeError: Failed to construct 'URL': Invalid base URL`, hãy làm theo các bước sau:

## Bước 1: Test không có thư viện database

**Hiện tại**: `main.ts` đã được comment toàn bộ database code. App sẽ chạy mà không có database.

```bash
npm run build
```

Nếu build thành công và không có lỗi → Vấn đề nằm ở database libraries.

## Bước 2: Test từng thư viện riêng biệt

### Test 2.1: Chỉ import PGlite

Trong `src/test-imports.ts`, uncomment dòng:
```typescript
import { PGlite } from '@electric-sql/pglite';
console.log('PGlite imported successfully');
```

Trong `src/main.ts`, uncomment dòng:
```typescript
import './test-imports';
```

Chạy build và kiểm tra console.

### Test 2.2: Chỉ import Drizzle

Comment lại PGlite, uncomment:
```typescript
import { drizzle } from 'drizzle-orm/pglite';
console.log('Drizzle imported successfully');
```

### Test 2.3: Import cả hai nhưng không khởi tạo

Uncomment:
```typescript
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
console.log('Both libraries imported successfully');
```

### Test 2.4: Test khởi tạo PGlite

Uncomment:
```typescript
import { PGlite } from '@electric-sql/pglite';

// Test với memory database
const memoryDb = new PGlite();
console.log('Memory database created');
```

### Test 2.5: Test IndexedDB (có thể gây lỗi)

Uncomment:
```typescript
// Test với IndexedDB (có thể gây lỗi)
const idbDb = new PGlite('idb://test-db');
console.log('IndexedDB database created');
```

## Bước 3: Phân tích kết quả

- **Nếu lỗi ở Test 2.1**: Vấn đề với `@electric-sql/pglite`
- **Nếu lỗi ở Test 2.2**: Vấn đề với `drizzle-orm/pglite`
- **Nếu lỗi ở Test 2.4**: Vấn đề với memory database initialization
- **Nếu lỗi ở Test 2.5**: Vấn đề với IndexedDB URL trong userscript environment

## Bước 4: Khôi phục sau khi test

Sau khi xác định được nguyên nhân, uncomment lại database initialization trong `main.ts`:

```typescript
import { DatabaseService } from './db/database';

// Initialize database before creating app
DatabaseService.initialize().then(() => {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);
  const container = document.createElement('div');
  document.body.appendChild(container);
  app.mount(container);
}).catch(console.error);
```

Và comment lại:
```typescript
// import './test-imports';
```