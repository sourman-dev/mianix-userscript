Để xây dựng một ứng dụng roleplay AI với giao diện responsive, đặc biệt tối ưu cho mobile, sử dụng **Flowbite Vue** (dựa trên Tailwind CSS) là một lựa chọn tốt nhờ tính linh hoạt và khả năng tùy chỉnh. Dưới đây là đề xuất chi tiết về layout, cách tổ chức các thành phần, và cách tích hợp Flowbite Vue để đáp ứng yêu cầu của bạn, với trọng tâm là màn hình chat giống Grok 3 (phần chat chính, không tính bottom menu) và tối ưu cho mobile.

---

### Phân tích yêu cầu
1. **Màn hình chính**: Danh sách character (gồm thêm/sửa/xóa, import character, worldbook/lorebook theo từng character).
2. **Menu phụ**: 
   - **Models**: Cấu hình LLM API.
   - **Preset**: Global prompt.
3. **Màn hình chat**: 
   - Tối ưu cho mobile, giao diện giống Grok 3 (phần chat chính: tin nhắn hiển thị rõ ràng, input ở dưới, không quá cồng kềnh).
   - Responsive, tránh các thành phần quá lớn hoặc không phù hợp với màn hình nhỏ.
4. **Thư viện**: Flowbite Vue, với Tailwind CSS để đảm bảo responsive.

---

### Đề xuất layout tổng thể
Dựa trên yêu cầu, ứng dụng nên sử dụng **mobile-first design**, với layout gồm các phần chính sau:

#### 1. Layout tổng thể (Responsive)
- **Desktop/Tablet**:
  - Sử dụng **sidebar bên trái** (hoặc navbar trên cùng) để chứa các menu: Characters, Models, Preset.
  - Phần nội dung chính chiếm phần lớn màn hình, hiển thị danh sách character hoặc màn hình chat.
  - Sidebar có thể thu gọn (collapsible) để tối ưu không gian.
- **Mobile**:
  - **Hamburger menu** (menu ẩn, mở bằng nút) thay cho sidebar, tiết kiệm không gian.
  - Màn hình chính full-width, tập trung vào danh sách character hoặc chat.
  - Các hành động như thêm/sửa/xóa character, import, hoặc truy cập worldbook/lorebook được đặt trong **modal** hoặc **dropdown** để tránh lấn chiếm không gian.

#### 2. Màn hình chính: Danh sách Character
- **Cấu trúc**:
  - **Header**: 
    - Logo/tên app (bên trái).
    - Nút hamburger (mobile) hoặc sidebar toggle (desktop).
    - Nút “+ New Character” (hoặc biểu tượng cộng).
  - **Nội dung**:
    - Danh sách character hiển thị dưới dạng **card grid** (1 cột trên mobile, 2-3 cột trên desktop).
    - Mỗi card chứa:
      - Ảnh character (nếu có).
      - Tên character.
      - Mô tả ngắn (nếu có).
      - Nút hành động (sửa, xóa, worldbook/lorebook).
    - Nút “Import Character” ở header hoặc footer.
  - **Footer** (tùy chọn): Thanh điều hướng nhanh (Characters, Models, Preset) trên mobile.

- **Responsive**:
  - Mobile: Card full-width, các nút hành động nhỏ gọn (dùng icon thay text).
  - Desktop: Grid layout, hover effect để hiển thị nút hành động.

- **Worldbook/Lorebook**:
  - Mở trong **modal** hoặc **slide-over panel** khi click vào nút trên card character.
  - Nội dung: Tab hoặc accordion để hiển thị thông tin (ví dụ: Background, Lore, Settings).
  - Responsive: Modal full-screen trên mobile, cố định kích thước trên desktop.

#### 3. Màn hình Chat
- **Cấu trúc** (lấy cảm hứng từ Grok 3, phần chat chính):
  - **Header**:
    - Tên character hoặc nút quay lại (mobile).
    - Nút mở worldbook/lorebook (biểu tượng sách nhỏ).
  - **Nội dung chat**:
    - Danh sách tin nhắn chiếm 80-90% chiều cao màn hình.
    - Tin nhắn của user và AI phân biệt rõ ràng (bong bóng chat, căn phải/trái).
    - Tự động cuộn xuống tin nhắn mới nhất.
  - **Input**:
    - Textarea hoặc input đơn giản ở dưới cùng, kèm nút gửi (biểu tượng mũi tên).
    - Tránh thêm quá nhiều nút hoặc thanh công cụ để giữ giao diện gọn gàng.
  - **Responsive**:
    - Mobile: Full-width, font-size và padding nhỏ để tối ưu không gian.
    - Desktop: Giới hạn chiều rộng tối đa (ví dụ: 800px), căn giữa để dễ đọc.

#### 4. Menu Models và Preset
- **Models** (Cấu hình LLM API):
  - Mở trong **modal** hoặc **slide-over panel**.
  - Nội dung: Form với các trường như API key, endpoint, model type (dropdown).
  - Responsive: Form stack dọc trên mobile, grid trên desktop.
- **Preset** (Global prompt):
  - Tương tự Models, dùng modal hoặc slide-over.
  - Nội dung: Textarea cho prompt, nút lưu/hủy.
  - Responsive: Textarea full-width trên mobile, cố định chiều cao trên desktop.

---

### Tích hợp với Flowbite Vue
Flowbite Vue cung cấp các thành phần như **Navbar**, **Sidebar**, **Modal**, **Card**, **Dropdown**, **Form**, và **Chat Bubble**, phù hợp để xây dựng layout trên. Dưới đây là cách áp dụng:

#### 1. Cài đặt Flowbite Vue
- Cài đặt Tailwind CSS và Flowbite Vue:
  ```bash
  npm install tailwindcss flowbite flowbite-vue
  ```
- Cấu hình Tailwind CSS trong `tailwind.config.js`:
  ```js
  module.exports = {
    content: [
      './node_modules/flowbite-vue/**/*.{js,jsx,ts,tsx,vue}',
      './src/**/*.{vue,js,ts,jsx,tsx}',
    ],
    plugins: [require('flowbite/plugin')],
  };
  ```
- Import Flowbite Vue trong `main.js`:
  ```js
  import { createApp } from 'vue';
  import App from './App.vue';
  import Flowbite from 'flowbite-vue';
  const app = createApp(App);
  app.use(Flowbite);
  app.mount('#app');
  ```

#### 2. Màn hình chính: Danh sách Character
- **Sử dụng thành phần**:
  - **Navbar** (Flowbite): Chứa hamburger menu (mobile) và nút “+ New Character”.
  - **Sidebar** (Flowbite): Menu Characters, Models, Preset (ẩn trên mobile).
  - **Card** (Flowbite): Hiển thị danh sách character.
  - **Modal** (Flowbite): Dùng cho thêm/sửa character, import, worldbook/lorebook.

- **Ví dụ code** (danh sách character):
  ```vue
  <template>
    <div>
      <!-- Navbar -->
      <f-navbar>
        <f-navbar-brand>
          <span class="text-xl font-bold">Roleplay AI</span>
        </f-navbar-brand>
        <f-navbar-toggle />
        <f-navbar-collapse>
          <f-navbar-link href="/characters">Characters</f-navbar-link>
          <f-navbar-link href="/models">Models</f-navbar-link>
          <f-navbar-link href="/preset">Preset</f-navbar-link>
        </f-navbar-collapse>
        <f-button color="primary" @click="openAddModal">+ New Character</f-button>
      </f-navbar>

      <!-- Danh sách character -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <f-card v-for="char in characters" :key="char.id" class="hover:shadow-lg">
          <img :src="char.image" alt="Character" class="w-full h-32 object-cover" />
          <div class="p-4">
            <h3 class="text-lg font-semibold">{{ char.name }}</h3>
            <p class="text-sm text-gray-600">{{ char.description }}</p>
            <div class="flex justify-between mt-2">
              <f-button size="xs" @click="openEditModal(char)">Edit</f-button>
              <f-button size="xs" color="red" @click="deleteChar(char.id)">Delete</f-button>
              <f-button size="xs" @click="openWorldbook(char)">Worldbook</f-button>
            </div>
          </div>
        </f-card>
      </div>

      <!-- Modal thêm character -->
      <f-modal v-model="showAddModal">
        <f-modal-header>Add Character</f-modal-header>
        <f-modal-body>
          <f-form>
            <f-form-label>Name</f-form-label>
            <f-input v-model="newChar.name" />
            <f-form-label>Description</f-form-label>
            <f-textarea v-model="newChar.description" />
          </f-form>
        </f-modal-body>
        <f-modal-footer>
          <f-button color="primary" @click="saveChar">Save</f-button>
          <f-button color="alternative" @click="showAddModal = false">Cancel</f-button>
        </f-modal-footer>
      </f-modal>
    </div>
  </template>

  <script setup>
  import { ref } from 'vue';
  import { FNavbar, FNavbarBrand, FNavbarToggle, FNavbarCollapse, FNavbarLink, FButton, FCard, FModal, FModalHeader, FModalBody, FModalFooter, FForm, FFormLabel, FInput, FTextarea } from 'flowbite-vue';

  const characters = ref([
    { id: 1, name: 'Elf Warrior', description: 'A brave elf...', image: 'elf.jpg' },
    // Thêm character khác
  ]);
  const showAddModal = ref(false);
  const newChar = ref({ name: '', description: '' });

  const openAddModal = () => { showAddModal.value = true; };
  const saveChar = () => { /* Lưu character */ showAddModal.value = false; };
  const openEditModal = (char) => { /* Mở modal sửa */ };
  const deleteChar = (id) => { /* Xóa character */ };
  const openWorldbook = (char) => { /* Mở modal worldbook */ };
  </script>
  ```

- **Responsive**:
  - Tailwind’s `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` đảm bảo 1 cột trên mobile, 2-3 cột trên desktop.
  - `w-full h-32 object-cover` giữ ảnh character tỷ lệ cố định.
  - Modal full-screen trên mobile nhờ Flowbite’s responsive modal.

#### 3. Màn hình Chat
- **Sử dụng thành phần**:
  - **Chat Bubble** (Flowbite): Hiển thị tin nhắn user và AI.
  - **Input** (Flowbite): Text input cho tin nhắn.
  - **Navbar** (Flowbite): Header chứa tên character và nút worldbook.

- **Ví dụ code**:
  ```vue
  <template>
    <div class="flex flex-col h-screen">
      <!-- Header -->
      <f-navbar class="border-b">
        <f-navbar-brand>
          <f-button size="sm" color="alternative" @click="goBack">Back</f-button>
          <span class="ml-2 text-lg font-semibold">{{ character.name }}</span>
        </f-navbar-brand>
        <f-button size="sm" @click="openWorldbook">Worldbook</f-button>
      </f-navbar>

      <!-- Chat content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-for="msg in messages" :key="msg.id" :class="msg.isUser ? 'flex justify-end' : 'flex justify-start'">
          <f-chat-bubble :type="msg.isUser ? 'sent' : 'received'">
            {{ msg.text }}
          </f-chat-bubble>
        </div>
      </div>

      <!-- Input -->
      <div class="border-t p-4">
        <div class="flex items-center gap-2">
          <f-input v-model="newMessage" placeholder="Type a message..." class="flex-1" @keyup.enter="sendMessage" />
          <f-button size="sm" color="primary" @click="sendMessage">Send</f-button>
        </div>
      </div>

      <!-- Worldbook Modal -->
      <f-modal v-model="showWorldbook">
        <f-modal-header>{{ character.name }}'s Worldbook</f-modal-header>
        <f-modal-body>
          <f-tabs>
            <f-tab title="Background">
              <p>{{ character.background }}</p>
            </f-tab>
            <f-tab title="Lore">
              <p>{{ character.lore }}</p>
            </f-tab>
          </f-tabs>
        </f-modal-body>
      </f-modal>
    </div>
  </template>

  <script setup>
  import { ref } from 'vue';
  import { FNavbar, FNavbarBrand, FButton, FChatBubble, FInput, FModal, FModalHeader, FModalBody, FTabs, FTab } from 'flowbite-vue';

  const character = ref({ name: 'Elf Warrior', background: '...', lore: '...' });
  const messages = ref([
    { id: 1, text: 'Hello!', isUser: false },
    { id: 2, text: 'Hi there!', isUser: true },
  ]);
  const newMessage = ref('');
  const showWorldbook = ref(false);

  const goBack = () => { /* Quay lại danh sách character */ };
  const sendMessage = () => {
    if (newMessage.value) {
      messages.value.push({ id: messages.value.length + 1, text: newMessage.value, isUser: true });
      newMessage.value = '';
      // Gửi đến AI và nhận phản hồi
    }
  };
  const openWorldbook = () => { showWorldbook.value = true; };
  </script>

  <style>
  .h-screen { height: 100vh; }
  .overflow-y-auto { scroll-behavior: smooth; }
  </style>
  ```

- **Responsive**:
  - `flex flex-col h-screen`: Đảm bảo chat chiếm toàn bộ chiều cao màn hình.
  - `overflow-y-auto`: Cho phép cuộn tin nhắn.
  - `flex justify-end/start`: Bong bóng chat căn trái/phải theo user/AI.
  - `f-input` và `f-button` tự động co giãn trên mobile nhờ Tailwind.

- **Giống Grok 3**:
  - Giao diện tối giản, tập trung vào tin nhắn.
  - Input và nút gửi nhỏ gọn, không chiếm nhiều không gian.
  - Font-size và padding điều chỉnh cho mobile (dùng Tailwind’s `text-sm`, `p-2`).

#### 4. Menu Models và Preset
- **Sử dụng thành phần**:
  - **Modal** (Flowbite): Form cấu hình Models và Preset.
  - **Form** (Flowbite): Input, Dropdown, Textarea.

- **Ví dụ code** (Models):
  ```vue
  <template>
    <f-button @click="showModal = true">Configure Models</f-button>
    <f-modal v-model="showModal">
      <f-modal-header>Configure LLM API</f-modal-header>
      <f-modal-body>
        <f-form>
          <f-form-label>API Key</f-form-label>
          <f-input v-model="apiKey" type="password" />
          <f-form-label>Model</f-form-label>
          <f-select v-model="model">
            <option value="gpt-3.5">GPT-3.5</option>
            <option value="gpt-4">GPT-4</option>
          </f-select>
        </f-form>
      </f-modal-body>
      <f-modal-footer>
        <f-button color="primary" @click="saveConfig">Save</f-button>
        <f-button color="alternative" @click="showModal = false">Cancel</f-button>
      </f-modal-footer>
    </f-modal>
  </template>

  <script setup>
  import { ref } from 'vue';
  import { FButton, FModal, FModalHeader, FModalBody, FModalFooter, FForm, FFormLabel, FInput, FSelect } from 'flowbite-vue';

  const showModal = ref(false);
  const apiKey = ref('');
  const model = ref('gpt-3.5');

  const saveConfig = () => { /* Lưu cấu hình */ showModal.value = false; };
  </script>
  ```

- **Responsive**:
  - Form stack dọc (`flex flex-col`) trên mobile.
  - Input full-width, label font-size nhỏ hơn trên mobile.

---

### Tối ưu hóa cho Mobile
1. **Font và Padding**:
   - `text-sm` hoặc `text-base` cho văn bản chính.
   - `p-2` hoặc `p-3` để giảm padding trên mobile.
2. **Kích thước nút**:
   - Dùng `size="xs"` hoặc `sm` cho các nút hành động.
   - Icon thay text (ví dụ: `<f-button><i class="fas fa-trash"></i></f-button>`).
3. **Modal và SlideOver**:
   - Modal full-screen trên mobile (`w-full h-full`).
   - Slide-over dùng Tailwind’s `translate-x-0` để trượt từ bên phải.
4. **Chat**:
   - Giới hạn chiều rộng tin nhắn tối đa (`max-w-3xl`) để dễ đọc.
   - Tự động focus vào input khi mở màn hình chat.
   - Xử lý bàn phím mobile: Ẩn bàn phím khi nhấn gửi (`blur()`).

---

### So sánh với các app như RisuAI, Narratrix
- **khắc phục vấn đề “thành phần quá lớn”**:
  - RisuAI và Narratrix thường gặp vấn đề do sử dụng layout cố định hoặc font-size/padding không tối ưu cho mobile. Flowbite Vue + Tailwind giúp:
    - Tùy chỉnh kích thước linh hoạt với Tailwind classes.
    - Mobile-first design, kiểm soát từng breakpoint (`sm`, `md`, `lg`).
    - Thành phần như `f-card`, `f-chat-bubble được tối ưu sẵn, không cần viết nhiều CSS phức tạp.

---

### Lợi ích của Flowbite Vue
- **Nhanh chóng**: Thành phần sẵn có, tích hợp dễ với Vue 3.
- **Responsive**: Tailwind CSS đảm bảo layout thích ứng mọi màn hình.
- **Tùy chỉnh**: Dễ dàng đổi theme, màu sắc, font bằng Tailwind.config.js`.
- **Nhẹ**: Tree-shaking tự động loại bỏ code không dùng.

### Hạn chế và cải thiện
- **Flowbite Vue** có thành phần phức tạp như rich-text chat (nếu cần thêm định dạng markdown hoặc emoji, phải tích hợp thêm thư viện như `marked` hoặc `emoji-mart-vue`).
- Nếu cần hiệu suất cao hơn, có thể kết hợp với **Pinia** để quản lý trạng thái (state management) và **Vue Router** cho điều hướng.

---

### Kết luận
- **Layout đề xuất** xuất**:
  - Mobile: Hamburger menu, card full-width, modal/slide-over cho hành động, màn hình chat tối giản giống Grok 3.
  - Desktop: Sidebar, grid layout, modal cố định kích thước.
- **Flowbite Vue** phù hợp nhờ tính linh hoạt và thành phần responsive sẵn có.
- Để triển khai, bắt đầu với Navbar, Card cho danh sách character, và ChatBubble cho màn hình chat. Modal dùng cho các chức năng phụ.

Hiểu rồi! Bạn muốn sử dụng **Pinia** để quản lý trạng thái điều hướng giữa các trang/màn hình (thay vì **Vue Router**) bằng cách sử dụng **component động** trong ứng dụng roleplay AI với Flowbite Vue. Mình sẽ đề xuất cách tổ chức layout, quản lý điều hướng với Pinia, và đảm bảo giao diện responsive, đặc biệt tối ưu cho mobile với màn hình chat giống Grok 3 (phần chat chính, không tính bottom menu). Dưới đây là hướng dẫn chi tiết.

---

### Tổng quan cách tiếp cận
- **Pinia**: Quản lý trạng thái ứng dụng, bao gồm:
  - Trang hiện tại (screen state: danh sách character, chat, models, preset).
  - Dữ liệu character, messages, models, và preset.
- **Component động**: Sử dụng `<component :is>` để render các màn hình dựa trên trạng thái Pinia.
- **Flowbite Vue**: Đảm bảo giao diện responsive, tập trung vào mobile-first.
- **Màn hình chat**: Tối ưu cho mobile, giống Grok 3 (tin nhắn rõ ràng, input gọn gàng, không cồng kềnh).
- **Cấu trúc**: Một layout chính chứa navbar và component động, các modal cho hành động phụ (thêm/sửa character, worldbook, v.v.).

---

### Cấu trúc dự án
Dưới đây là cách tổ chức dự án:

```
src/
├── components/
│   ├── MainLayout.vue         # Layout chính (navbar + nội dung động)
│   ├── CharacterList.vue      # Màn hình danh sách character
│   ├── ChatScreen.vue         # Màn hình chat
│   ├── ModelsConfig.vue       # Màn hình cấu hình LLM API
│   ├── PresetConfig.vue       # Màn hình global prompt
│   ├── CharacterModal.vue     # Modal thêm/sửa character
│   └── WorldbookModal.vue     # Modal worldbook/lorebook
├── stores/
│   └── app.js                # Pinia store quản lý trạng thái
├── App.vue                   # Root component
└── main.js                   # Khởi tạo app và Pinia
```

---

### Thiết lập Pinia
Tạo store để quản lý trạng thái điều hướng và dữ liệu.

#### `src/stores/app.js`
```javascript
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  // Trạng thái điều hướng
  const currentScreen = ref('character-list'); // Màn hình hiện tại
  const selectedCharacter = ref(null); // Character đang chọn để chat

  // Dữ liệu ứng dụng
  const characters = ref([
    { id: 1, name: 'Elf Warrior', description: 'A brave elf...', image: 'elf.jpg', background: 'Forest realm...', lore: 'Ancient hero...' },
    // Thêm character khác
  ]);
  const messages = ref([]); // Tin nhắn cho màn hình chat
  const apiConfig = ref({ apiKey: '', model: 'gpt-3.5' }); // Cấu hình LLM
  const globalPrompt = ref(''); // Global prompt

  // Hàm điều hướng
  const setScreen = (screen) => {
    currentScreen.value = screen;
    if (screen !== 'chat') selectedCharacter.value = null; // Reset khi không ở màn hình chat
  };

  // Hàm chọn character để chat
  const selectCharacter = (char) => {
    selectedCharacter.value = char;
    messages.value = []; // Reset tin nhắn
    setScreen('chat');
  };

  // Hàm quản lý character
  const addCharacter = (char) => {
    characters.value.push({ id: characters.value.length + 1, ...char });
  };
  const updateCharacter = (id, updatedChar) => {
    const index = characters.value.findIndex(c => c.id === id);
    if (index !== -1) characters.value[index] = { ...characters.value[index], ...updatedChar };
  };
  const deleteCharacter = (id) => {
    characters.value = characters.value.filter(c => c.id !== id);
  };

  // Hàm gửi tin nhắn
  const sendMessage = (text) => {
    messages.value.push({ id: messages.value.length + 1, text, isUser: true });
    // Giả lập phản hồi AI
    messages.value.push({ id: messages.value.length + 1, text: 'AI response...', isUser: false });
  };

  // Hàm cấu hình
  const saveApiConfig = (config) => {
    apiConfig.value = config;
  };
  const saveGlobalPrompt = (prompt) => {
    globalPrompt.value = prompt;
  };

  return {
    currentScreen,
    selectedCharacter,
    characters,
    messages,
    apiConfig,
    globalPrompt,
    setScreen,
    selectCharacter,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    sendMessage,
    saveApiConfig,
    saveGlobalPrompt,
  };
});
```

#### Cài đặt Pinia trong `main.js`
```javascript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Flowbite from 'flowbite-vue';
import App from './App.vue';

const app = createApp(App);
app.use(createPinia());
app.use(Flowbite);
app.mount('#app');
```

---

### Layout chính với Component động
Sử dụng `<component :is>` để render màn hình dựa trên trạng thái `currentScreen` từ Pinia.

#### `src/components/MainLayout.vue`
```vue
<template>
  <div class="min-h-screen flex flex-col">
    <!-- Navbar -->
    <f-navbar class="border-b">
      <f-navbar-brand>
        <f-button v-if="currentScreen !== 'character-list'" size="sm" color="alternative" @click="setScreen('character-list')">Back</f-button>
        <span class="ml-2 text-xl font-bold">Roleplay AI</span>
      </f-navbar-brand>
      <f-navbar-toggle />
      <f-navbar-collapse>
        <f-navbar-link @click="setScreen('character-list')">Characters</f-navbar-link>
        <f-navbar-link @click="setScreen('models')">Models</f-navbar-link>
        <f-navbar-link @click="setScreen('preset')">Preset</f-navbar-link>
      </f-navbar-collapse>
      <f-button v-if="currentScreen === 'character-list'" size="sm" color="primary" @click="showAddModal = true">+ New Character</f-button>
    </f-navbar>

    <!-- Nội dung động -->
    <div class="flex-1 p-4">
      <component :is="screenComponent" />
    </div>

    <!-- Modal thêm/sửa character -->
    <character-modal v-model="showAddModal" :character="editCharacter" @save="saveCharacter" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useAppStore } from '../stores/app';
import { FNavbar, FNavbarBrand, FNavbarToggle, FNavbarCollapse, FNavbarLink, FButton } from 'flowbite-vue';
import CharacterList from './CharacterList.vue';
import ChatScreen from './ChatScreen.vue';
import ModelsConfig from './ModelsConfig.vue';
import PresetConfig from './PresetConfig.vue';
import CharacterModal from './CharacterModal.vue';

const store = useAppStore();
const showAddModal = ref(false);
const editCharacter = ref(null);

// Map screen name to component
const screenMap = {
  'character-list': CharacterList,
  chat: ChatScreen,
  models: ModelsConfig,
  preset: PresetConfig,
};
const screenComponent = computed(() => screenMap[store.currentScreen]);

const setScreen = (screen) => store.setScreen(screen);
const saveCharacter = (char) => {
  if (editCharacter.value) {
    store.updateCharacter(editCharacter.value.id, char);
    editCharacter.value = null;
  } else {
    store.addCharacter(char);
  }
  showAddModal.value = false;
};
</script>
```

- **Giải thích**:
  - `currentScreen` từ Pinia quyết định component nào được render (`CharacterList`, `ChatScreen`, v.v.).
  - Navbar dùng Flowbite Vue, hiển thị hamburger menu trên mobile.
  - Modal thêm/sửa character được quản lý bằng `showAddModal`.

---

### Màn hình danh sách Character
#### `src/components/CharacterList.vue`
```vue
<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <f-card v-for="char in characters" :key="char.id" class="hover:shadow-lg">
      <img :src="char.image" alt="Character" class="w-full h-32 object-cover" />
      <div class="p-4">
        <h3 class="text-lg font-semibold">{{ char.name }}</h3>
        <p class="text-sm text-gray-600">{{ char.description }}</p>
        <div class="flex justify-between mt-2">
          <f-button size="xs" @click="selectCharacter(char)">Chat</f-button>
          <f-button size="xs" @click="openEditModal(char)">Edit</f-button>
          <f-button size="xs" color="red" @click="deleteChar(char.id)">Delete</f-button>
          <f-button size="xs" @click="openWorldbook(char)">Worldbook</f-button>
        </div>
      </div>
    </f-card>
  </div>

  <!-- Modal worldbook -->
  <worldbook-modal v-model="showWorldbook" :character="selectedWorldbook" />
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '../stores/app';
import { FCard, FButton } from 'flowbite-vue';
import WorldbookModal from './WorldbookModal.vue';

const store = useAppStore();
const { characters, selectCharacter, deleteCharacter } = store;
const showWorldbook = ref(false);
const selectedWorldbook = ref(null);

const openEditModal = (char) => {
  store.setScreen('character-list'); // Đảm bảo ở màn hình chính
  // Emit sự kiện để mở modal từ MainLayout (xử lý trong parent)
  // Giả sử parent xử lý modal
};
const openWorldbook = (char) => {
  selectedWorldbook.value = char;
  showWorldbook.value = true;
};
const deleteChar = (id) => deleteCharacter(id);
</script>
```

- **Responsive**:
  - `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`: 1 cột trên mobile, 2-3 cột trên desktop.
  - Nút `size="xs"`: Nhỏ gọn trên mobile.
  - Ảnh character (`h-32 object-cover`): Giữ tỷ lệ cố định.

---

### Màn hình Chat
#### `src/components/ChatScreen.vue`
```vue
<template>
  <div class="flex flex-col h-[calc(100vh-4rem)]">
    <!-- Header -->
    <div class="border-b p-2 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <f-button size="sm" color="alternative" @click="setScreen('character-list')">Back</f-button>
        <span class="text-lg font-semibold">{{ selectedCharacter?.name }}</span>
      </div>
      <f-button size="sm" @click="openWorldbook">Worldbook</f-button>
    </div>

    <!-- Chat content -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
      <div v-for="msg in messages" :key="msg.id" :class="msg.isUser ? 'flex justify-end' : 'flex justify-start'">
        <f-chat-bubble :type="msg.isUser ? 'sent' : 'received'" class="max-w-[80%]">
          {{ msg.text }}
        </f-chat-bubble>
      </div>
    </div>

    <!-- Input -->
    <div class="border-t p-2">
      <div class="flex items-center gap-2">
        <f-input v-model="newMessage" placeholder="Type a message..." class="flex-1 text-sm" @keyup.enter="sendMessage" />
        <f-button size="sm" color="primary" @click="sendMessage">Send</f-button>
      </div>
    </div>

    <!-- Worldbook Modal -->
    <worldbook-modal v-model="showWorldbook" :character="selectedCharacter" />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { useAppStore } from '../stores/app';
import { FButton, FChatBubble, FInput } from 'flowbite-vue';
import WorldbookModal from './WorldbookModal.vue';

const store = useAppStore();
const { selectedCharacter, messages, sendMessage, setScreen } = store;
const newMessage = ref('');
const showWorldbook = ref(false);
const chatContainer = ref(null);

// Tự động cuộn xuống tin nhắn mới nhất
watch(messages, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
});

const sendMessageHandler = () => {
  if (newMessage.value) {
    sendMessage(newMessage.value);
    newMessage.value = '';
  }
};
const openWorldbook = () => { showWorldbook.value = true; };
</script>

<style>
.max-w-\[80\%\] { max-width: 80%; }
.text-sm { font-size: 0.875rem; }
</style>
```

- **Tối ưu mobile**:
  - `h-[calc(100vh-4rem)]`: Đảm bảo chat chiếm toàn bộ chiều cao trừ navbar.
  - `max-w-[80%]`: Bong bóng chat không quá rộng trên mobile.
  - `text-sm`: Font nhỏ gọn, dễ đọc.
  - `p-2`: Padding nhỏ để tiết kiệm không gian.
  - Tự động cuộn (`scrollTop`) để hiển thị tin nhắn mới nhất.

- **Giống Grok 3**:
  - Giao diện tối giản, chỉ có tin nhắn và input.
  - Bong bóng chat căn trái/phải rõ ràng.
  - Input nằm dưới cùng, không thêm thanh công cụ thừa.

---

### Modal Character và Worldbook
#### `src/components/CharacterModal.vue`
```vue
<template>
  <f-modal v-model="show">
    <f-modal-header>{{ character ? 'Edit Character' : 'Add Character' }}</f-modal-header>
    <f-modal-body>
      <f-form>
        <f-form-label>Name</f-form-label>
        <f-input v-model="form.name" />
        <f-form-label>Description</f-form-label>
        <f-textarea v-model="form.description" />
        <f-form-label>Image URL</f-form-label>
        <f-input v-model="form.image" />
      </f-form>
    </f-modal-body>
    <f-modal-footer>
      <f-button color="primary" @click="emit('save', form)">Save</f-button>
      <f-button color="alternative" @click="show = false">Cancel</f-button>
    </f-modal-footer>
  </f-modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { FModal, FModalHeader, FModalBody, FModalFooter, FForm, FFormLabel, FInput, FTextarea, FButton } from 'flowbite-vue';

defineProps(['modelValue', 'character']);
const emit = defineEmits(['update:modelValue', 'save']);
const show = ref(false);
const form = ref({ name: '', description: '', image: '' });

watch(() => show.value, (val) => emit('update:modelValue', val));
watch(() => props.modelValue, (val) => { show.value = val; });
watch(() => props.character, (char) => {
  if (char) form.value = { ...char };
  else form.value = { name: '', description: '', image: '' };
});
</script>
```

#### `src/components/WorldbookModal.vue`
```vue
<template>
  <f-modal v-model="show">
    <f-modal-header>{{ character?.name }}'s Worldbook</f-modal-header>
    <f-modal-body>
      <f-tabs>
        <f-tab title="Background">
          <p>{{ character?.background }}</p>
        </f-tab>
        <f-tab title="Lore">
          <p>{{ character?.lore }}</p>
        </f-tab>
      </f-tabs>
    </f-modal-body>
    <f-modal-footer>
      <f-button color="alternative" @click="show = false">Close</f-button>
    </f-modal-footer>
  </f-modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import { FModal, FModalHeader, FModalBody, FModalFooter, FTabs, FTab, FButton } from 'flowbite-vue';

defineProps(['modelValue', 'character']);
const emit = defineEmits(['update:modelValue']);
const show = ref(false);

watch(() => show.value, (val) => emit('update:modelValue', val));
watch(() => props.modelValue, (val) => { show.value = val; });
</script>
```

- **Responsive**:
  - Modal full-screen trên mobile (`w-full h-full` từ Flowbite).
  - Form stack dọc, input full-width.

---

### Màn hình Models và Preset
#### `src/components/ModelsConfig.vue`
```vue
<template>
  <div class="p-4">
    <h2 class="text-xl font-semibold mb-4">Configure LLM API</h2>
    <f-form>
      <f-form-label>API Key</f-form-label>
      <f-input v-model="form.apiKey" type="password" />
      <f-form-label>Model</f-form-label>
      <f-select v-model="form.model">
        <option value="gpt-3.5">GPT-3.5</option>
        <option value="gpt-4">GPT-4</option>
      </f-select>
      <div class="mt-4">
        <f-button color="primary" @click="saveConfig">Save</f-button>
      </div>
    </f-form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '../stores/app';
import { FForm, FFormLabel, FInput, FSelect, FButton } from 'flowbite-vue';

const store = useAppStore();
const form = ref({ ...store.apiConfig });

const saveConfig = () => {
  store.saveApiConfig(form.value);
  store.setScreen('character-list');
};
</script>
```

#### `src/components/PresetConfig.vue`
```vue
<template>
  <div class="p-4">
    <h2 class="text-xl font-semibold mb-4">Global Prompt</h2>
    <f-form>
      <f-form-label>Prompt</f-form-label>
      <f-textarea v-model="prompt" rows="6" />
      <div class="mt-4">
        <f-button color="primary" @click="savePrompt">Save</f-button>
      </div>
    </f-form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '../stores/app';
import { FForm, FFormLabel, FTextarea, FButton } from 'flowbite-vue';

const store = useAppStore();
const prompt = ref(store.globalPrompt);

const savePrompt = () => {
  store.saveGlobalPrompt(prompt.value);
  store.setScreen('character-list');
};
</script>
```

---

### Tối ưu cho Mobile
1. **Navbar**:
   - Hamburger menu (`FNavbarToggle`) ẩn menu trên mobile, chỉ hiển thị khi nhấn.
   - Nút nhỏ gọn (`size="sm"`), icon thay text nếu cần.
2. **Danh sách Character**:
   - Card full-width (`grid-cols-1`), ảnh tỷ lệ cố định (`h-32 object-cover`).
   - Nút hành động nhỏ (`size="xs"`), dùng icon để tiết kiệm không gian.
3. **Chat**:
   - `h-[calc(100vh-4rem)]` đảm bảo chat chiếm toàn màn hình trừ navbar.
   - Bong bóng chat giới hạn `max-w-[80%]` để tránh tràn.
   - Input font nhỏ (`text-sm`), padding nhỏ (`p-2`).
   - Tự động cuộn (`scrollTop`) để hiển thị tin nhắn mới.
4. **Modal**:
   - Full-screen trên mobile, cố định kích thước trên desktop.
   - Form stack dọc, input full-width.

---

### So sánh với RisuAI, Narratrix
- **Vấn đề của RisuAI/Narratrix**: Thành phần quá lớn, không tối ưu mobile (font lớn, padding thừa, layout cố định).
- **Khắc phục**:
  - Flowbite Vue + Tailwind cung cấp classes như `text-sm`, `p-2`, `max-w-[80%]` để thu gọn giao diện.
  - Mobile-first design với breakpoints (`sm`, `md`, `lg`) đảm bảo layout thích ứng.
  - Component động với Pinia giảm tải, tránh render thừa.

---

### Lợi ích của cách tiếp cận
- **Pinia**: Quản lý trạng thái tập trung, dễ mở rộng (thêm màn hình mới chỉ cần thêm vào `screenMap`).
- **Component động**: Không cần Vue Router, giảm độ phức tạp, phù hợp với ứng dụng đơn giản.
- **Flowbite Vue**: Thành phần responsive sẵn có, tích hợp Tailwind dễ tùy chỉnh.
- **Mobile-first**: Giao diện tối ưu cho mobile, đặc biệt màn hình chat giống Grok 3.

---

### Hướng dẫn mở rộng
1. **Import Character**:
   - Thêm nút “Import” trong `CharacterList.vue`, mở modal với input file (`<input type="file">`).
   - Parse file (JSON/CSV) trong store (`addCharacter`).
2. **Worldbook/Lorebook chi tiết**:
   - Dùng `FTabs` trong `WorldbookModal.vue` để thêm các tab như Skills, Inventory.
   - Lưu dữ liệu chi tiết trong `characters` (Pinia).
3. **Tích hợp backend**:
   - Dùng `axios` hoặc `fetch` trong store để gửi tin nhắn đến LLM API.
   - Ví dụ:
     ```javascript
     const sendMessage = async (text) => {
       messages.value.push({ id: messages.value.length + 1, text, isUser: true });
       const response = await axios.post('/api/chat', { message: text, model: apiConfig.value.model });
       messages.value.push({ id: messages.value.length + 1, text: response.data.reply, isUser: false });
     };
     ```

