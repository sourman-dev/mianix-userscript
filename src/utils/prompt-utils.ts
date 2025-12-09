// file: src/utils/prompt-utils.ts

import type { WorldBookEntry } from '@/types/character';
import { CharacterCard } from '@/db';
import { adaptText } from './msg-process';
import { getEmbeddingModel } from '@/utils/model-helpers';
import { getMergedWorldbook } from './worldbook-merge';

/**
 * Options for worldbook retrieval with hybrid search
 */
export interface WorldbookRetrievalOptions {
  limit?: number;              // Max entries to return (default: 5)
  semanticThreshold?: number;  // Min similarity (default: 0.5)
  useSemanticSearch?: boolean; // Enable semantic ranking (default: true)
  characterId?: string;        // Required for semantic search
}

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
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
}

/**
 * Hybrid retrieval: keyword pre-filter + semantic ranking + Top-K selection
 * Falls back to keyword-only if no embeddings available
 *
 * @param worldBook - Toàn bộ World Book của nhân vật
 * @param chatHistoryString - Lịch sử trò chuyện gần đây dưới dạng chuỗi
 * @param currentUserInput - Tin nhắn hiện tại của người dùng
 * @param options - Retrieval options (limit, threshold, etc.)
 * @returns Promise<WorldBookEntry[]> - Các entry phù hợp đã được xếp hạng
 */
async function getRelevantWorldBookEntries(
  worldBook: WorldBookEntry[],
  chatHistoryString: string,
  currentUserInput: string,
  options: WorldbookRetrievalOptions = {}
): Promise<WorldBookEntry[]> {
  const {
    limit = 5,
    semanticThreshold = 0.5,
    useSemanticSearch = true,
  } = options;

  if (!worldBook || worldBook.length === 0) return [];

  const contextText = `${chatHistoryString}\nUser: ${currentUserInput}`.toLowerCase();

  // Step 1: Extract constant entries (always included)
  const constantEntries = worldBook.filter(
    entry => entry.constant && entry.enabled !== false
  );

  // Step 2: Keyword pre-filter for non-constant entries
  const keywordCandidates = worldBook.filter(entry => {
    if (entry.constant) return false; // Already in constantEntries
    if (!entry.enabled || entry.selective === false) return false;

    return Array.isArray(entry.keys) && entry.keys.some(key => {
      if (entry.useRegex) {
        try {
          return new RegExp(key, 'i').test(contextText);
        } catch {
          return false;
        }
      }
      return contextText.includes(key.toLowerCase());
    });
  });

  // Step 3: Check if semantic search is possible
  const hasEmbeddingModel = !!getEmbeddingModel();
  const hasEmbeddings = keywordCandidates.some(e => e.embedding?.length);

  // If no semantic search capability, fall back to keyword-only
  if (!useSemanticSearch || !hasEmbeddingModel || !hasEmbeddings) {
    console.log('Worldbook: Using keyword-only retrieval');
    const result = [...constantEntries, ...keywordCandidates];
    return result.sort((a, b) => (a.insertionOrder || 0) - (b.insertionOrder || 0));
  }

  // Step 4: Semantic ranking
  const query = `${chatHistoryString.slice(-500)}\n${currentUserInput}`;
  let queryEmbedding: number[] = [];

  try {
    // Generate query embedding
    const embeddingModel = getEmbeddingModel()!;
    let embedUrl = embeddingModel.baseUrl;
    if (embedUrl.endsWith('/')) embedUrl = embedUrl.slice(0, -1);
    if (!embedUrl.includes('/embeddings')) embedUrl = `${embedUrl}/embeddings`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(embedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${embeddingModel.apiKey}`,
        },
        body: JSON.stringify({
          input: query,
          model: embeddingModel.modelName,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        queryEmbedding = data.data?.[0]?.embedding || [];
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.warn('Worldbook: Query embedding timeout (30s)');
      }
    }
  } catch (e) {
    console.warn('Worldbook: Failed to generate query embedding, using keyword-only');
  }

  // Fallback if embedding generation failed
  if (!queryEmbedding.length) {
    const result = [...constantEntries, ...keywordCandidates];
    return result.sort((a, b) => (a.insertionOrder || 0) - (b.insertionOrder || 0));
  }

  // Score candidates by cosine similarity
  const scored = keywordCandidates
    .filter(e => e.embedding?.length) // Only score entries with embeddings
    .map(entry => ({
      entry,
      score: cosineSimilarity(queryEmbedding, entry.embedding!),
    }));

  // Step 5: Top-K selection
  const topK = scored
    .filter(s => s.score >= semanticThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.entry);

  // Include keyword matches without embeddings (don't penalize unembedded entries)
  const unembeddedKeywordMatches = keywordCandidates.filter(e => !e.embedding?.length);

  // Merge: constants + topK semantic + unembedded keyword matches
  const merged = [...constantEntries, ...topK, ...unembeddedKeywordMatches];

  // Dedupe (in case constant entries also matched keywords)
  const seen = new Set<string>();
  const deduped = merged.filter(entry => {
    const key = entry.comment || entry.content?.slice(0, 50) || '';
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Worldbook: Hybrid retrieval selected ${deduped.length} entries (${topK.length} semantic + ${constantEntries.length} constant)`);

  return deduped.sort((a, b) => (a.insertionOrder || 0) - (b.insertionOrder || 0));
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
export async function buildFinalPrompt(
  characterData: CharacterCard,
  chatHistoryString: string, // <-- Chỉ chứa 10 tin nhắn gần nhất
  currentUserInput: string,
  userProfile: {
    name: string;
    appearance?: string;
    personality?: string;
    background?: string;
    currentStatus?: string;
    inventory?: string[];
  },
  prompts: {
    multiModePrompt: string;
    multiModeChainOfThoughtPrompt: string;
    outputStructureSoftGuidePrompt: string;
    outputFormatPrompt: string;
  },
  responseInstructionHint?: string,
  responseLength? : number,
  relevantMemories?: string, // <-- Ký ức liên quan từ RAG
  worldbookOptions?: WorldbookRetrievalOptions // <-- NEW: Worldbook retrieval options
): Promise<{ systemPrompt: string; userPrompt: string }> {

  // Đảm bảo dữ liệu nhân vật được xử lý đúng cách
  characterData.getData();

  const context = {
    user: userProfile.name,
    char: characterData.data.name || 'Character', // Thêm fallback
  };

  // 1. Lấy các entry World Book phù hợp với hybrid retrieval
  // Use merged worldbook (global + character-specific)
  const mergedWorldBook = getMergedWorldbook(characterData.id);
  const relevantWorldBook = await getRelevantWorldBookEntries(
    mergedWorldBook,
    chatHistoryString,
    currentUserInput,
    {
      characterId: characterData.id,
      ...worldbookOptions,
    }
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
  
  // 🆕 Thêm thông tin user profile (chỉ khi có data)
  const buildUserProfileSection = () => {
    const sections = [];
    
    if (userProfile.appearance?.trim()) {
      sections.push(`**Ngoại hình:** ${userProfile.appearance}`);
    }
    if (userProfile.personality?.trim()) {
      sections.push(`**Tính cách:** ${userProfile.personality}`);
    }
    if (userProfile.background?.trim()) {
      sections.push(`**Lý lịch:** ${userProfile.background}`);
    }
    if (userProfile.currentStatus?.trim()) {
      sections.push(`**Trạng thái hiện tại:** ${userProfile.currentStatus}`);
    }
    if (userProfile.inventory && userProfile.inventory.length > 0) {
      sections.push(`**Đồ đạc:** ${userProfile.inventory.join(', ')}`);
    }
    
    if (sections.length === 0) return '';
    
    return `
    <user_profile name="${userProfile.name}">
    ${sections.join('\n    ')}
    </user_profile>
    `;
  };
  
  const userProfileSection = buildUserProfileSection();
  
  systemPrompt += `
    ${longTermMemory}
    ${userProfileSection}

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