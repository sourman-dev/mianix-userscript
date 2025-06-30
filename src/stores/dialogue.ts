// src/stores/dialogue.ts
import { defineStore } from "pinia";
import {
  CharacterCard,
  db,
  type Dialogue,
  type DialogueMessageType,
} from "@/db";
import { adaptText } from "@/utils/msg-process";
import { LLMOptions } from "@/db";

interface DialogueState {
  currentDialogue: Dialogue | null;
  currentMessages: DialogueMessageType[];
  suggestedPrompts: Record<string, string[]>;
  currentLLMOptions: Record<string, LLMOptions>;
}

export const useDialogueStore = defineStore("dialogue", {
  state: (): DialogueState => ({
    currentDialogue: null,
    currentMessages: [],
    suggestedPrompts: {},
    currentLLMOptions: {}
  }),
  getters: {
    // Getter quan trọng: Lấy đường dẫn từ node hiện tại về gốc
    currentPath(state): DialogueMessageType[] {
      if (!state.currentDialogue || state.currentMessages.length === 0)
        return [];

      const path: DialogueMessageType[] = [];
      const messagesMap = new Map(state.currentMessages.map((m) => [m.id, m]));
      let currentNodeId: string | null = state.currentDialogue.currentNodeId;

      // // Debug logs
      // console.log("🔍 Debug currentPath:");
      // console.log("currentNodeId:", currentNodeId);
      // console.log("messagesMap size:", messagesMap.size);
      // console.log(
      //   "all messages:",
      //   Array.from(messagesMap.values()).map((m) => ({
      //     id: m.id,
      //     parentId: m.parentId,
      //   }))
      // );

      while (currentNodeId && currentNodeId !== "root") {
        const node = messagesMap.get(currentNodeId);
        // console.log("Processing node:", currentNodeId, "found:", !!node);

        if (node) {
          path.unshift(node);
          currentNodeId = node.parentId;
          // console.log("Added to path, next parentId:", currentNodeId);
        } else {
          console.log("❌ Node not found, breaking");
          break;
        }
      }

      console.log("✅ Final path length:", path.length);
      return path;
    },
    // Getter chỉ lấy tối đa 10 tin nhắn mới nhất cho việc hiển thị, 
    currentMessagesForDisplay(_state): DialogueMessageType[] {
      return (this as any).currentPath.slice(-10);
    },
    // Getter để lấy lịch sử chat dưới dạng chuỗi cho prompt
    completedPath(_state): DialogueMessageType[] {
      return (this as any).currentPath.filter(
        (node: DialogueMessageType) => node.status === "completed"
      );
    },

    chatHistoryForPrompt(_state): string {
      const path = (this as any).completedPath as DialogueMessageType[];
      return path
        .map((node) => {
          let history = "";
          if (node.userInput) {
            history += `User: ${node.userInput}\n`;
          }
          if (node.assistantResponse) {
            history += `AI: ${node.assistantResponse}\n`;
          }
          return history;
        })
        .join("\n");
    },
  },
  actions: {
    // Tải dữ liệu của một cuộc hội thoại vào store
    loadDialogue(characterId: string) {
      this.currentDialogue = db.Dialogues.findOne({
        id: characterId,
      }) as Dialogue | null;
      if (this.currentDialogue) {
        this.currentMessages = db.DialogueMessages.find({
          dialogueId: characterId,
        }).fetch() as DialogueMessageType[];
        console.log(
          "📥 Loaded dialogue:",
          characterId,
          "messages:",
          this.currentMessages.length
        );
        this.suggestedPrompts[characterId] = [];
        this.currentLLMOptions[characterId] = Object.assign({
          top_p: 0.9,
          responseLength: 800
        }, this.currentDialogue.llmOptions);
      } else {
        // Nếu chưa có, tạo mới
        const newDialogue: Dialogue = {
          id: characterId,
          createdAt: Date.now(),
          llmOptions: {
            top_p: 0.9,
            temperature: 0.7,
            maxTokens: 1000,
            contextWindow: 4000,
            responseLength: 800
          },
          currentNodeId: "root",
        };
        db.Dialogues.insert(newDialogue);
        this.suggestedPrompts[characterId] = [];
        this.currentLLMOptions[characterId] = newDialogue.llmOptions;
        const characterCard = db.CharacterCards.findOne({
          id: characterId,
        }) as CharacterCard;
        characterCard.getData();
        let firstGreeting = characterCard.getGreeting() as string;
        firstGreeting = adaptText(firstGreeting);

        // Tạo message đầu tiên
        const firstMessageId = crypto.randomUUID();
        db.DialogueMessages.insert({
          id: firstMessageId,
          dialogueId: newDialogue.id,
          parentId: "root",
          userInput: "",
          assistantResponse: firstGreeting,
          status: "completed",
          createdAt: Date.now(),
        });

        // 🔧 FIX: Cập nhật currentNodeId để trỏ đến message vừa tạo
        db.Dialogues.updateOne(
          { id: characterId },
          { $set: { currentNodeId: firstMessageId } }
        );

        // Cập nhật state
        newDialogue.currentNodeId = firstMessageId;
        this.currentDialogue = newDialogue;
        this.currentMessages = db.DialogueMessages.find({
          dialogueId: characterId,
        }).fetch() as DialogueMessageType[];
        console.log("🆕 Created new dialogue:", characterId);
      }
    },

    // Thêm một node mới vào cây
    addMessage(userInput: string, assistantResponse: string) {
      if (!this.currentDialogue) return;

      const newNode: DialogueMessageType = {
        id: crypto.randomUUID(),
        dialogueId: this.currentDialogue.id,
        parentId: this.currentDialogue.currentNodeId,
        userInput,
        assistantResponse,
        createdAt: Date.now(),
      };

      console.log("➕ Adding message:", {
        id: newNode.id,
        parentId: newNode.parentId,
      });

      db.DialogueMessages.insert(newNode);

      // Cập nhật currentNodeId trong Dialogue
      db.Dialogues.updateOne(
        { id: this.currentDialogue.id },
        {
          $set: { currentNodeId: newNode.id },
        }
      );

      // Cập nhật state
      this.currentMessages.push(newNode);
      this.currentDialogue.currentNodeId = newNode.id;

      console.log("✅ Message added, new currentNodeId:", newNode.id);
    },

    // Chuyển nhánh
    switchBranch(nodeId: string) {
      if (!this.currentDialogue) return;

      db.Dialogues.updateOne(
        { id: this.currentDialogue.id },
        {
          $set: { currentNodeId: nodeId },
        }
      );

      this.currentDialogue.currentNodeId = nodeId;
    },

    // Tái tạo phản hồi
    regenerate() {
      if (
        !this.currentDialogue ||
        this.currentDialogue.currentNodeId === "root"
      )
        return;

      const currentNode = this.currentMessages.find(
        (m) => m.id === this.currentDialogue?.currentNodeId
      );
      if (!currentNode || !currentNode.parentId) return null;

      // 🆕 Kiểm tra status của node hiện tại
      if (currentNode.status === "pending") {
        // Nếu đang pending, chỉ cần cancel và xóa
        console.log("🚫 Canceling pending request");

        db.DialogueMessages.removeOne({ id: currentNode.id });
        this.currentMessages = this.currentMessages.filter(
          (m) => m.id !== currentNode.id
        );
        this.switchBranch(currentNode.parentId);

        return null; // Không cần regenerate
      }

      // 🆕 Nếu completed hoặc failed, regenerate như cũ
      if (
        currentNode.status === "completed" ||
        currentNode.status === "failed"
      ) {
        console.log("🔄 Regenerating response for:", currentNode.userInput);

        db.DialogueMessages.removeOne({ id: currentNode.id });
        this.currentMessages = this.currentMessages.filter(
          (m) => m.id !== currentNode.id
        );
        this.switchBranch(currentNode.parentId);

        return currentNode.userInput; // Trả về để gửi lại
      }

      return null;
    },

    // 🗑️ Action mới: Xóa toàn bộ dữ liệu dialogue
    clearAllData(characterId: string) {
      console.log("🗑️ Clearing all data for:", characterId);

      // Xóa tất cả messages
      db.DialogueMessages.removeOne({ id: characterId });

      // Xóa dialogue
      db.Dialogues.removeOne({ id: characterId });

      // Reset state
      this.currentDialogue = null;
      this.currentMessages = [];
      this.suggestedPrompts = {
        [characterId]: [],
      };

      console.log("✅ All data cleared");
    },

    // 🔄 Action mới: Reset dialogue về trạng thái ban đầu
    resetDialogue(characterId: string) {
      this.clearAllData(characterId);
      this.loadDialogue(characterId);
    },

    // 🆕 Action mới: Thêm user input với status pending
    addInput(input: string, isUserInput: boolean = true) {
      if (!this.currentDialogue) return;

      const newNode: DialogueMessageType = {
        id: crypto.randomUUID(),
        dialogueId: this.currentDialogue.id,
        parentId: this.currentDialogue.currentNodeId,
        userInput: isUserInput ? input : "",
        assistantResponse: !isUserInput ? input : "", // Để trống
        status: "pending", // Đánh dấu đang chờ
        createdAt: Date.now(),
      };

      console.log("➕ Adding pending user input:", {
        id: newNode.id,
        parentId: newNode.parentId,
      });

      db.DialogueMessages.insert(newNode);

      // Cập nhật currentNodeId trong Dialogue
      db.Dialogues.updateOne(
        { id: this.currentDialogue.id },
        {
          $set: { currentNodeId: newNode.id },
        }
      );

      // Cập nhật state
      this.currentMessages.push(newNode);
      this.currentDialogue.currentNodeId = newNode.id;

      console.log(
        "✅ Pending user input added, new currentNodeId:",
        newNode.id
      );
      return newNode.id; // Trả về ID để update sau
    },

    // 🆕 Action mới: Cập nhật AI response
    updateAIResponse(nodeId: string, assistantResponse: string) {
      if (!this.currentDialogue) return;

      console.log("🔄 Updating AI response for node:", nodeId);

      // Update trong database
      db.DialogueMessages.updateOne(
        { id: nodeId },
        {
          $set: {
            assistantResponse,
            status: "completed",
          },
        }
      );

      // Update trong state
      const messageIndex = this.currentMessages.findIndex(
        (m) => m.id === nodeId
      );
      if (messageIndex !== -1) {
        this.currentMessages[messageIndex].assistantResponse =
          assistantResponse;
        this.currentMessages[messageIndex].status = "completed";
      }

      console.log("✅ AI response updated");
    },

    // 🆕 Action mới: Đánh dấu failed khi có lỗi
    markAsFailed(nodeId: string) {
      if (!this.currentDialogue) return;

      db.DialogueMessages.updateOne(
        { id: nodeId },
        {
          $set: { status: "failed" },
        }
      );

      const messageIndex = this.currentMessages.findIndex(
        (m) => m.id === nodeId
      );
      if (messageIndex !== -1) {
        this.currentMessages[messageIndex].status = "failed";
      }
    },

    // 🆕 Function mới: Retry message bị failed
    retryMessage(nodeId: string) {
      const node = this.currentMessages.find((m) => m.id === nodeId);
      if (!node) return null;

      // console.log("🔄 Retrying failed message:", node.userInput);

      // Reset về pending
      db.DialogueMessages.updateOne(
        { id: nodeId },
        {
          $set: {
            status: "pending",
            assistantResponse: "", // Clear response cũ
          },
        }
      );

      // Update state
      const messageIndex = this.currentMessages.findIndex(
        (m) => m.id === nodeId
      );
      if (messageIndex !== -1) {
        this.currentMessages[messageIndex].status = "pending";
        this.currentMessages[messageIndex].assistantResponse = "";
      }

      return node.userInput; // Trả về để gửi lại
    },
    updateMessage(messageId: string, content: string, isAssistant: boolean) {
      db.DialogueMessages.updateOne({ id: messageId }, {
        $set: {
          [isAssistant ? 'assistantResponse' : 'userInput']: content,
        }
      })
      this.currentMessages.find(m => m.id === messageId)![isAssistant ? 'assistantResponse' : 'userInput'] = content
    },
    updateLLMOptions(characterId: string, options: LLMOptions) {
      this.currentLLMOptions[characterId] = options;
      db.Dialogues.updateOne(
        { id: characterId },
        {
          $set: {
            llmOptions: options,
          },
        }
      );
    },
  },
  persist: {
    storage: localStorage,
    pick: ["suggestedPrompts"],
  },
});
