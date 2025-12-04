// file: src/utils/prompt-utils.ts

import type { WorldBookEntry } from '@/types/character';
import { CharacterCard } from '@/db';
import { adaptText } from './msg-process';

/**
 * Thay thế các placeholder động trong một chuỗi văn bản.
 * @param text - Chuỗi cần xử lý.
 * @param context - Object chứa các giá trị để thay thế.
 * @returns Chuỗi đã được thay thế.
 */
function applyPlaceholders(text: string, context: { user: string; char: string }): string {
  // Hàm adaptText của bạn đã xử lý việc này
  return adaptText(text, context.user, context.char);
}

/**
 * Định dạng các entry của World Book để chèn vào prompt.
 * @param entries - Mảng các WorldBookEntry.
 * @param context - Ngữ cảnh chứa tên user và char.
 * @returns Một chuỗi đã định dạng chứa thông tin World Book.
 */
function formatWorldBookEntries(entries: WorldBookEntry[], context: { user: string; char: string }): string {
  if (!entries || entries.length === 0) return '';
  return entries
    .map(entry => {
      const tagName = entry.comment || 'world_info';
      const content = applyPlaceholders(entry.content || '', context);
      return `<world_information tag="${tagName}">\n${content}\n</world_information>`;
    })
    .join('\n\n');
}

/**
 * Lọc và chọn các entry World Book phù hợp với ngữ cảnh hiện tại.
 * @param worldBook - Toàn bộ World Book của nhân vật.
 * @param chatHistoryString - Lịch sử trò chuyện gần đây dưới dạng chuỗi.
 * @param currentUserInput - Tin nhắn hiện tại của người dùng.
 * @returns Một mảng các WorldBookEntry phù hợp.
 */
function getRelevantWorldBookEntries(
  worldBook: WorldBookEntry[],
  chatHistoryString: string,
  currentUserInput: string
): WorldBookEntry[] {
  if (!worldBook || worldBook.length === 0) return [];

  // Kết hợp lịch sử chat và input hiện tại để tạo ngữ cảnh tìm kiếm
  const contextText = `${chatHistoryString}\nUser: ${currentUserInput}`.toLowerCase();

  const relevantEntries = worldBook.filter(entry => {
    // Luôn bao gồm các entry 'constant' và 'enabled'
    if (entry.constant && entry.enabled) {
      return true;
    }

    // Nếu entry bị vô hiệu hóa hoặc không phải 'selective', bỏ qua
    if (!entry.enabled || entry.selective === false) {
      return false;
    }

    // Kiểm tra xem có key nào khớp với ngữ cảnh không
    // Đảm bảo keys là một mảng trước khi dùng `some`
    return Array.isArray(entry.keys) && entry.keys.some(key => contextText.includes(key.toLowerCase()));
  });

  // Sắp xếp các entry theo ưu tiên (insertionOrder)
  return relevantEntries.sort((a, b) => (a.insertionOrder || 0) - (b.insertionOrder || 0));
}

/**
 * Xây dựng prompt cuối cùng để gửi đến LLM.
 * Đây là hàm tổng hợp chính, đã được cập nhật để nhận `chatHistoryString` và `relevantMemories`.
 * @param characterData - Dữ liệu nhân vật đã được chuẩn hóa.
 * @param chatHistoryString - Lịch sử các tin nhắn gần đây (10 tin nhắn) dưới dạng một chuỗi duy nhất.
 * @param currentUserInput - Tin nhắn mới nhất của người dùng.
 * @param userProfile - Hồ sơ của người dùng (tên, etc.).
 * @param prompts - Các prompt mẫu từ resources.
 * @param relevantMemories - Các ký ức liên quan được trích xuất từ RAG (optional).
 * @returns Một object chứa systemPrompt và userPrompt hoàn chỉnh.
 */
export function buildFinalPrompt(
  characterData: CharacterCard,
  chatHistoryString: string, // <-- Chỉ chứa 10 tin nhắn gần nhất
  currentUserInput: string,
  userProfile: { name: string },
  prompts: {
    multiModePrompt: string;
    multiModeChainOfThoughtPrompt: string;
    outputStructureSoftGuidePrompt: string;
    outputFormatPrompt: string;
  },
  responseInstructionHint?: string,
  responseLength? : number,
  relevantMemories?: string // <-- THÊM MỚI: Ký ức liên quan từ RAG
): { systemPrompt: string; userPrompt: string } {
  
  // Đảm bảo dữ liệu nhân vật được xử lý đúng cách
  characterData.getData();

  const context = {
    user: userProfile.name,
    char: characterData.data.name || 'Character', // Thêm fallback
  };

  // 1. Lấy các entry World Book phù hợp dựa trên lịch sử dạng chuỗi
  const relevantWorldBook = getRelevantWorldBookEntries(
    characterData.data.worldBook || [],
    chatHistoryString,
    currentUserInput
  );

  // Phân loại entry theo vị trí chèn
  const worldBookBeforeChar = formatWorldBookEntries(
    relevantWorldBook.filter(e => e.position === 'before_char'),
    context
  );
  const worldBookAfterChar = formatWorldBookEntries(
    relevantWorldBook.filter(e => e.position === 'after_char'),
    context
  );
  const worldBookBeforeInput = formatWorldBookEntries(
    relevantWorldBook.filter(e => e.position === 'before_input'),
    context
  );
  const worldBookAfterInput = formatWorldBookEntries(
    relevantWorldBook.filter(e => e.position === 'after_input'),
    context
  );

  // 2. Xây dựng System Prompt
  let systemPrompt = applyPlaceholders(prompts.multiModePrompt, context);
  
  const charDescription = applyPlaceholders(characterData.data.description || '', context);
  const charPersonality = applyPlaceholders(characterData.data.personality || '', context);
  const scenario = applyPlaceholders(characterData.data.scenario || '', context);

  const responseInstructions = responseInstructionHint ? `
    <response_instructions>
    **Hướng dẫn phản hồi:** ${responseInstructionHint}
    </response_instructions>
  ` : '';
  
  // 🆕 Thêm phần ký ức dài hạn nếu có
  const longTermMemory = relevantMemories ? `
    <long_term_memory>
    **Thông tin quan trọng từ các cuộc trò chuyện trước:**
    ${relevantMemories}
    </long_term_memory>
  ` : '';
  
  systemPrompt += `
    ${longTermMemory}

    <character_description>
    ${worldBookBeforeChar}
    ${charDescription}
    ${worldBookAfterChar}
    </character_description>

    <character_personality>
    ${charPersonality}
    </character_personality>
    
    <scenario>
    ${scenario}
    </scenario>
  `;

  // 3. Xây dựng User Prompt
  const dialogueExamples = applyPlaceholders(characterData.data.messageExamples || '', context);
  
  let userPrompt = `
    <dialogue_examples>
    ${dialogueExamples}
    </dialogue_examples>
    
    <chain_of_thought_instructions>
    ${prompts.multiModeChainOfThoughtPrompt}
    </chain_of_thought_instructions>

    <output_format_guide>
    ${prompts.outputStructureSoftGuidePrompt}
    </output_format_guide>

    <chat_history>
    ${chatHistoryString}
    </chat_history>
    
    <user_input_section>
    ${worldBookBeforeInput}
    ${context.user}: ${currentUserInput}
    ${worldBookAfterInput}
    </user_input_section>

    ${responseInstructions}

    ${prompts.outputFormatPrompt.replace('${responseLength}', `${responseLength || 800}`)}
  `;

  return {
    systemPrompt: systemPrompt.trim(),
    userPrompt: userPrompt.trim(),
  };
}