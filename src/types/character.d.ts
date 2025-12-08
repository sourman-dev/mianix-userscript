// file: src/types/character.d.ts

/**
 * Interface cho một mục trong World Book.
 * Đại diện cho một mẩu thông tin về thế giới, nhân vật, hoặc sự kiện.
 */
export interface WorldBookEntry {
  // Các thuộc tính cơ bản
  keys: string[];
  content: string;
  comment?: string; // Ghi chú hoặc tiêu đề của entry
  enabled?: boolean;

  // Thuộc tính nâng cao để kiểm soát việc chèn vào prompt
  position?: 'before_char' | 'after_char' | 'before_input' | 'after_input';
  insertionOrder?: number; // Ưu tiên chèn, số nhỏ hơn được ưu tiên

  // Thuộc tính cho logic nâng cao
  selective?: boolean; // Chỉ kích hoạt nếu key được tìm thấy trong ngữ cảnh gần đây
  constant?: boolean;  // Luôn được chèn vào prompt nếu enabled
  useRegex?: boolean;  // Sử dụng keys như các biểu thức chính quy (regex)

  // Các thuộc tính kế thừa từ SillyTavern để tương thích
  depth?: number;
  secondaryKeys?: string[];

  // RAG embedding for semantic search
  embedding?: number[]; // Vector for semantic search
}

/**
 * Interface cho dữ liệu nhân vật đã được chuẩn hóa (sử dụng camelCase).
 * Đây là cấu trúc dữ liệu chính mà ứng dụng của bạn sẽ làm việc sau khi đã xử lý dữ liệu thô.
 */
export interface CharacterCardData {
  // id: string;
  // imageFile?: File; // Đường dẫn tới ảnh avatar lưu trong IndexedDB/local storage

  // Thông tin cốt lõi cho prompt
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  messageExamples: string;
  alternateGreetings: string[];
  
  // Thông tin bổ sung
  creatorNotes?: string;
  tags?: string[];
  creator?: string;

  // Dữ liệu cấu trúc
  worldBook: WorldBookEntry[];
  // Bạn có thể thêm các trường khác như regexScripts ở đây nếu cần
  // regexScripts?: any[]; 
}

/**
 * Interface cho dữ liệu thô đọc từ file PNG của SillyTavern.
 * Sử dụng snake_case để khớp với định dạng gốc.
 * Có cấu trúc lồng nhau để tương thích với nhiều phiên bản card.
 */
export interface RawSillyTavernData {
  // Dữ liệu có thể ở cấp cao nhất
  name?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  creatorcomment?: string; // Chú ý tên này không theo quy tắc
  
  // Hoặc lồng trong một object 'data'
  data?: {
    name?: string;
    description?: string;
    personality?: string;
    scenario?: string;
    first_mes?: string;
    mes_example?: string;
    
    // Các trường chi tiết hơn
    creator_notes?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    tags?: string[];
    creator?: string;
    character_version?: string;
    alternate_greetings?: string[];
    
    // World Book gốc
    character_book?: {
      entries: WorldBookEntry[] | Record<string, any>;
    };

    // Các phần mở rộng
    extensions?: {
      [key: string]: any; // Để bắt các trường mở rộng như regex_scripts
    };
  };
}