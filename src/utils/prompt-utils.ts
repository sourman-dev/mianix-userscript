// file: src/utils/promptUtils.ts

import type { WorldBookEntry } from '@/types/character';
import { CharacterCard } from '@/db';
import type { DialogueMessage } from '@/db'; // Giả sử bạn có file này
// import {
//   VIETNAMESE_MULTI_MODE_PROMPT,
//   VIETNAMESE_MULTI_MODE_CHAIN_OF_THOUGHT,
//   VIETNAMESE_OUTPUT_STRUCTURE_GUIDE,
// } from '@/prompts/presetPrompts'; // Import các prompt đã dịch
import { adaptText } from './msg-process';

/**
 * Thay thế các placeholder động trong một chuỗi văn bản.
 * @param text - Chuỗi cần xử lý.
 * @param context - Object chứa các giá trị để thay thế.
 * @returns Chuỗi đã được thay thế.
 */
function applyPlaceholders(text: string, context: { user: string; char: string }): string {
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
      const content = applyPlaceholders(entry.content, context);
      return `<world_information tag="${tagName}">\n${content}\n</world_information>`;
    })
    .join('\n\n');
}

/**
 * Lọc và chọn các entry World Book phù hợp với ngữ cảnh hiện tại.
 * @param worldBook - Toàn bộ World Book của nhân vật.
 * @param chatHistory - Lịch sử trò chuyện gần đây.
 * @param currentUserInput - Tin nhắn hiện tại của người dùng.
 * @returns Một mảng các WorldBookEntry phù hợp.
 */
function getRelevantWorldBookEntries(
  worldBook: WorldBookEntry[],
  chatHistory: DialogueMessage[],
  currentUserInput: string
): WorldBookEntry[] {
  if (!worldBook) return [];

  // Lấy toàn bộ nội dung chat gần đây để tìm kiếm key
  const contextText = [...chatHistory.map(m => m.content), currentUserInput].join('\n').toLowerCase();

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
    return entry.keys.some(key => contextText.includes(key.toLowerCase()));
  });

  // Sắp xếp các entry theo ưu tiên (insertionOrder)
  return relevantEntries.sort((a, b) => (a.insertionOrder || 0) - (b.insertionOrder || 0));
}

/**
 * Xây dựng prompt cuối cùng để gửi đến LLM.
 * Đây là hàm tổng hợp chính.
 * @param characterData - Dữ liệu nhân vật đã được chuẩn hóa.
 * @param chatHistory - Lịch sử các tin nhắn gần đây (đã được lọc theo context window).
 * @param currentUserInput - Tin nhắn mới nhất của người dùng.
 * @param userProfile - Hồ sơ của người dùng (tên, etc.).
 * @returns Một object chứa systemPrompt và userPrompt hoàn chỉnh.
 */
export function buildFinalPrompt(
  characterData: CharacterCard,
  chatHistory: DialogueMessage[],
  currentUserInput: string,
  userProfile: { name: string },
  prompts: {
    multiModePrompt: string;
    multiModeChainOfThoughtPrompt: string;
    outputStructureSoftGuidePrompt: string;
  },
): { systemPrompt: string; userPrompt: string } {

    characterData.getData();
  const context = {
    user: userProfile.name,
    char: characterData.data.name,
  };

  // 1. Lấy các entry World Book phù hợp
  const relevantWorldBook = getRelevantWorldBookEntries(
    characterData.data.worldBook || [],
    chatHistory,
    currentUserInput
  );

  // Phân loại entry theo vị trí chèn
  const worldBookBeforeChar = formatWorldBookEntries(
    relevantWorldBook.filter(e => e.position === 'before_char'),
{ user: context.user, char: context.char || '' }
  );
  const worldBookAfterChar = formatWorldBookEntries(
    relevantWorldBook.filter(e => e.position === 'after_char'),
    { user: context.user, char: context.char || '' }
  );
  const worldBookBeforeInput = formatWorldBookEntries(
    relevantWorldBook.filter(e => e.position === 'before_input'),
{ user: context.user, char: context.char || '' }
  );
  const worldBookAfterInput = formatWorldBookEntries(
    relevantWorldBook.filter(e => e.position === 'after_input'),
    { user: context.user, char: context.char || '' }
  );

  // 2. Xây dựng System Prompt
  let systemPrompt = applyPlaceholders(prompts.multiModePrompt, { user: context.user, char: context.char || '' });
  
  const charDescription = applyPlaceholders(characterData.data.description || '', { user: context.user, char: context.char || '' });
  const charPersonality = applyPlaceholders(characterData.data.personality || '', { user: context.user, char: context.char || '' });
  const scenario = applyPlaceholders(characterData.data.scenario || '', { user: context.user, char: context.char || '' });

  systemPrompt += `
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
  const dialogueExamples = applyPlaceholders(characterData.data.messageExamples || '', { user: context.user, char: context.char || '' });
  
  // Định dạng lịch sử chat
  const historyString = chatHistory
    .map(msg => {
      const speaker = msg.role === 'user' ? context.user : context.char;
      return `${speaker}: ${msg.content}`;
    })
    .join('\n');

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
    ${historyString}
    </chat_history>
    
    <user_input_section>
    ${worldBookBeforeInput}
    ${context.user}: ${currentUserInput}
    ${worldBookAfterInput}
    </user_input_section>
  `;

  return {
    systemPrompt: systemPrompt.trim(),
    userPrompt: userPrompt.trim(),
  };
}