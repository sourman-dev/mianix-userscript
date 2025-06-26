// file: src/core/Character.ts

import type {
  CharacterCardData,
  RawSillyTavernData,
  WorldBookEntry,
} from "@/types/character";

/**
 * Class Character đại diện cho một nhân vật trong ứng dụng.
 * Nhiệm vụ chính là nhận dữ liệu thô từ character card và chuẩn hóa nó
 * thành một cấu trúc dữ liệu nhất quán (CharacterData) để toàn bộ ứng dụng sử dụng.
 * Class này được thiết kế để xử lý nhiều biến thể của định dạng SillyTavern card.
 */
export class Character {
  public readonly data: CharacterCardData;

  constructor(
    rawData: RawSillyTavernData
  ) {
    if (!rawData) {
      throw new Error(
        "Character ID and raw data are required to create a Character instance."
      );
    }

    this.data = this.normalize(rawData);
  }

  /**
   * Phương thức chính để chuẩn hóa dữ liệu từ thô sang cấu trúc CharacterData.
   * Đây là nơi xử lý các cấu trúc dữ liệu không nhất quán.
   * @param characterId - ID duy nhất cho nhân vật.
   * @param imageFile - File chứa avatar.
   * @param rawData - Dữ liệu thô đọc từ card.
   * @returns Một object CharacterData đã được chuẩn hóa.
   */
  /**
   * Helper method to sanitize and fix common JSON formatting issues
   * @param jsonString - The potentially malformed JSON string
   * @returns A sanitized JSON string that's more likely to be parsed successfully
   */
  private sanitizeJson(jsonString: string): string {
    let result = jsonString.trim();

    // Remove comments
    result = result.replace(/\/\/[^\n]*/g, '');
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');

    // Replace single quotes with double quotes
    result = result.replace(/'/g, '"');

    // Add quotes to unquoted keys
    result = result.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

    // Add quotes to unquoted values, being careful not to quote numbers, booleans, or null
    result = result.replace(/:\s*([^"]{[\],}, \n\r\t]+)/g, (match, p1) => {
      if (p1 === 'null' || p1 === 'true' || p1 === 'false' || !isNaN(parseFloat(p1))) {
        return `: ${p1}`;
      }
      return `: "${p1}"`;
    });

    // Remove trailing commas
    result = result.replace(/,(\s*[}\]])/g, '$1');

    // Add missing commas between properties
    result = result.replace(/"(\s*\n\s*)"/g, '",$1"');

    return result;
  }

  private normalize(
    // characterId: string,
    // imageFile: File,
    rawData: RawSillyTavernData
  ): CharacterCardData {
    // Ưu tiên lấy dữ liệu từ object 'data' lồng nhau, nếu không có thì lấy từ cấp cao nhất.
    const source = rawData.data || (rawData as any);
    const topLevelSource = rawData as any;

    // 1. Trích xuất thông tin từ các trường chuẩn trước
    let description = source.description || topLevelSource.description || "";
    let personality = source.personality || topLevelSource.personality || "";
    const creatorNotes =
      source.creator_notes || topLevelSource.creatorcomment || "";

    // 2. Chuẩn hóa World Book
    const worldBookEntries = this.normalizeWorldBook(source.character_book);

    // 3. Xử lý các card "bất thường" nhồi JSON vào content hoặc các trường khác
    // Cố gắng tìm và phân tích cú pháp JSON trong World Book content
    const entryWithJson = worldBookEntries.find((e) =>
      e.content.trim().startsWith("{")
    );
    if (entryWithJson) {
      try {
        // Sanitize the JSON content before parsing
        const jsonContent = this.sanitizeJson(entryWithJson.content);
        let embeddedJson;
        try {
          embeddedJson = JSON.parse(jsonContent);
        } catch (parseError) {
          console.warn(
            "JSON parsing failed even after sanitization:",
            parseError
          );
          console.debug(
            "Sanitized content that failed to parse:",
            jsonContent.substring(0, 300) + "..."
          );

          // Last resort: try to extract a valid JSON object using regex
          try {
            const jsonObjectMatch = jsonContent.match(/\{[^\{\}]*\}/g);
            if (jsonObjectMatch && jsonObjectMatch.length > 0) {
              console.debug(
                "Attempting to parse extracted JSON object:",
                jsonObjectMatch[0]
              );
              embeddedJson = JSON.parse(jsonObjectMatch[0]);
            } else {
              // Skip this entry if extraction fails, continue with normal processing
              embeddedJson = null; // Set to null to indicate extraction failed
              embeddedJson = null; // Set to null and skip further JSON processing
            }
          } catch (extractError) {
            console.warn("Failed to extract valid JSON:", extractError);
            // Skip this entry if all parsing attempts fail, continue with normal processing
            embeddedJson = null; // Set to null and skip further JSON processing
          }
        }
        // Skip processing if JSON extraction failed
        if (embeddedJson === null) {
          // Do nothing, continue with normal processing
        } else {
          // Card "Haru Saki" có cấu trúc `haru_profile`
          const embeddedProfile = embeddedJson.haru_profile || embeddedJson;

          // Nối thông tin đã giải nén vào các trường chính
          if (
            embeddedProfile.backstory &&
            Array.isArray(embeddedProfile.backstory)
          ) {
            const backstoryText = embeddedProfile.backstory.join("\n");
            description =
              `${description}\n\n**Backstory:**\n${backstoryText}`.trim();
          }

          if (embeddedProfile.traits?.personality) {
            let personalityText = "";
            for (const key in embeddedProfile.traits.personality) {
              const traits = embeddedProfile.traits.personality[key];
              if (Array.isArray(traits) && traits.length > 0) {
                personalityText += `\nAs ${key}: ${traits.join(", ")}.`;
              }
            }
            personality = `${personality}${personalityText}`.trim();
          }
        }
      } catch (e) {
        console.warn("Could not parse JSON content from world book entry.", e);
        // Log the problematic content for debugging
        console.debug(
          "Problematic JSON content:",
          entryWithJson.content.substring(0, 300) + "..."
        );
      }
    }

    // Một số card nhồi JSON vào thẳng trường description
    if (description.trim().startsWith("{")) {
      try {
        // Sanitize the JSON content before parsing
        const jsonContent = this.sanitizeJson(description);
        let embeddedJsonInDesc;
        try {
          embeddedJsonInDesc = JSON.parse(jsonContent);
        } catch (parseError) {
          console.warn(
            "JSON parsing in description failed even after sanitization:",
            parseError
          );
          console.debug(
            "Sanitized description that failed to parse:",
            jsonContent.substring(0, 300) + "..."
          );

          // Last resort: try to extract a valid JSON object using regex
          try {
            const jsonObjectMatch = jsonContent.match(/\{[^\{\}]*\}/g);
            if (jsonObjectMatch && jsonObjectMatch.length > 0) {
              console.debug(
                "Attempting to parse extracted JSON object from description:",
                jsonObjectMatch[0]
              );
              embeddedJsonInDesc = JSON.parse(jsonObjectMatch[0]);
            } else {
              // Skip JSON extraction if it fails, continue with normal processing
              embeddedJsonInDesc = null; // Set to null to indicate extraction failed
              embeddedJsonInDesc = null; // Set to null and continue normal processing
            }
          } catch (extractError) {
            console.warn(
              "Failed to extract valid JSON from description:",
              extractError
            );
            // Skip this processing if all parsing attempts fail, continue with normal processing
          }
        }
        // Skip processing if JSON extraction failed
        if (embeddedJsonInDesc === null) {
          // Do nothing, continue with normal processing
        } else {
          // Giả sử có cấu trúc roleplay_instruction như trong ví dụ của bạn
          if (embeddedJsonInDesc && embeddedJsonInDesc.roleplay_instruction) {
            // Bạn có thể chọn giữ lại hoặc loại bỏ nó. Ở đây ta loại bỏ để giữ description sạch sẽ.
            description = creatorNotes; // Thay thế bằng creator_notes vì nó chứa mô tả dễ đọc hơn
          }
        }
      } catch (e) {
        /* Bỏ qua lỗi parsing, giữ nguyên description */
        console.debug("Could not parse JSON in description:", e);
      }
    }

    // 4. Xây dựng object CharacterData cuối cùng
    const normalizedData: CharacterCardData = {
    //   id: characterId,
    //   imageFile: imageFile,

      name: source.name || topLevelSource.name || "Unnamed Character",
      description: description.trim(),
      personality: personality.trim(),
      scenario: source.scenario || topLevelSource.scenario || "",

      firstMessage: source.first_mes || topLevelSource.first_mes || "",
      alternateGreetings: source.alternate_greetings || [],
      messageExamples: source.mes_example || topLevelSource.mes_example || "",

      creatorNotes: creatorNotes,
      tags: source.tags || [],
      creator: source.creator || "",

      worldBook: worldBookEntries,
    };

    return normalizedData;
  }

  /**
   * Chuẩn hóa dữ liệu World Book từ các định dạng khác nhau (array hoặc object).
   * @param characterBook - Object character_book từ dữ liệu thô.
   * @returns Một mảng các WorldBookEntry đã được chuẩn hóa.
   */
  private normalizeWorldBook(characterBook: any): WorldBookEntry[] {
    if (!characterBook || !characterBook.entries) {
      return [];
    }

    const entriesSource = characterBook.entries;
    let entriesArray: any[] = [];

    if (Array.isArray(entriesSource)) {
      entriesArray = entriesSource;
    } else if (typeof entriesSource === "object" && entriesSource !== null) {
      entriesArray = Object.values(entriesSource);
    }

    return entriesArray.map((entry) => ({
      // Xử lý keys, đảm bảo luôn là một mảng chuỗi
      keys:
        entry.keys ||
        (entry.key ? (Array.isArray(entry.key) ? entry.key : [entry.key]) : []),
      content: entry.content || "",
      comment: entry.comment || "",
      // Xử lý enabled/disable, ưu tiên `disable` nếu có
      enabled: entry.disable === true ? false : entry.enabled !== false,
      // Xử lý position
      position: this.normalizePosition(entry.position),
      // Xử lý insertion_order, hỗ trợ cả `order`
      insertionOrder: entry.insertion_order ?? entry.order ?? 0,
      // Các thuộc tính boolean khác
      selective: entry.selective === true,
      constant: entry.constant === true,
      useRegex: entry.use_regex === true,
      // Các thuộc tính số
      depth: entry.depth ?? 1,
      // Xử lý secondary_keys, hỗ trợ cả `keysecondary`
      secondaryKeys: entry.secondary_keys || entry.keysecondary || [],
    }));
  }

  /**
   * Chuẩn hóa giá trị 'position' của World Book sang một định dạng chuỗi dễ đọc.
   */
  private normalizePosition(
    position: number | string | undefined
  ): WorldBookEntry["position"] {
    const posNum = Number(position);
    if (isNaN(posNum)) return "after_char"; // Mặc định an toàn

    switch (posNum) {
      case 0:
        return "before_char";
      case 1:
        return "after_char";
      case 2:
        return "before_input";
      case 3:
        return "after_input";
      default:
        return "after_char";
    }
  }

  /**
   * Lấy lời chào đầu tiên, ưu tiên alternate greetings.
   */

}
