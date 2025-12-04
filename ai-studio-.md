// src/components/chat_screen/ChatScreen.vue

const handleSendMessage = async () => {
    if (isSending.value || !userInput.value.trim()) return;
    
    const newUserInput = userInput.value;
    userInput.value = ''; 

    // 1. Retrieval: Tìm ký ức liên quan trước
    await dialogueStore.prepareContext(newUserInput);

    const pendingNodeId = dialogueStore.addInput(newUserInput);

    try {
        // ... gửi request ...
        const aiResponseRaw = await sendRequestToLLM(newUserInput);
        
        if (aiResponseRaw) {
             const parsed = parseLLMResponse(aiResponseRaw);
             
             // ... xử lý update UI ...
             
             // 2. Extraction: Lưu ký ức mới (Chạy background)
             dialogueStore.handlePostResponseProcess(newUserInput, parsed.mainContent);
        }
    } catch (error) {
        // ...
    }
};

// src/utils/prompt-utils.ts
import { useDialogueStore } from "@/stores/dialogue"; // Import store

export function buildFinalPrompt(
  // ... params cũ
): { systemPrompt: string; userPrompt: string } {
  
  // Lấy ký ức từ store
  const dialogueStore = useDialogueStore();
  const memories = dialogueStore.relevantMemories;
  
  // ... logic cũ ...

  // Chèn ký ức vào userPrompt hoặc systemPrompt
  let memorySection = "";
  if (memories) {
    memorySection = `
    <relevant_memories>
    ${memories}
    </relevant_memories>
    `;
  }

  let userPrompt = `
    ${memorySection} <!-- Chèn ký ức vào đây -->
    
    <chat_history>
    ${chatHistoryString} <!-- Lịch sử chat bây giờ có thể ngắn lại, ví dụ chỉ 5-10 tin -->
    </chat_history>
    
    <user_input_section>
    ${context.user}: ${currentUserInput}
    </user_input_section>
    
    // ...
  `;

  return { systemPrompt, userPrompt };
}