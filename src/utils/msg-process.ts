export function adaptText(text: string, username?: string, charName?: string): string {
  let parsed = text.replace(/<br\s*\/?>/gi, "\n"); // Chuyển đổi <br> thành dòng mới
  const userReplacement = username ?? 'Tôi';
  const charReplacement = charName ?? "";
  
  // Thay thế cả hai định dạng placeholder cho user
  parsed = parsed.replace(/{{user}}/g, userReplacement);
  parsed = parsed.replace(/{user}/g, userReplacement);
  
  // Thay thế cả hai định dạng placeholder cho char
  parsed = parsed.replace(/{{char}}/g, charReplacement);
  parsed = parsed.replace(/{char}/g, charReplacement);
  
  return parsed;
}

export function formatMessageContent(content: string): string {
  if (!content) {
    return '';
  }

  let formattedContent = content;

  // --- BƯỚC 1: DỌN DẸP KÝ TỰ XUỐNG DÒNG ---
  // Thay thế ba hoặc nhiều ký tự xuống dòng liên tiếp bằng đúng hai ký tự.
  // Điều này tạo ra một khoảng trống tương đương một đoạn văn mới.
  formattedContent = formattedContent.replace(/\n{3,}/g, '\n\n');

  // Xóa các ký tự xuống dòng ở đầu và cuối chuỗi để tránh khoảng trống thừa.
  formattedContent = formattedContent.trim();
  
  // --- BƯỚC 2: ÁP DỤNG ĐỊNH DẠNG MÀU SẮC (giữ nguyên như cũ) ---
  formattedContent = formattedContent.replace(
    /(["“](.*?)[”"])/g,
    '<span class="text-cyan-300">$1</span>'
  );
  formattedContent = formattedContent.replace(
    /(\*(.*?)\*)/g,
    '<span class="text-amber-300 italic">$1</span>'
  );
  formattedContent = formattedContent.replace(
    /(\*\*(.*?)\*\*)/g,
    '<span class="text-purple-300 font-semibold">$1</span>'
  );
  formattedContent = formattedContent.replace(
    /(\[(.*?)\])/g,
    '<span class="text-gray-400">$1</span>'
  );
  
  // --- BƯỚC 3: CHUYỂN ĐỔI KÝ TỰ XUỐNG DÒNG SANG <br> ---
  // Bây giờ chúng ta mới chuyển đổi, đảm bảo rằng sẽ không có nhiều hơn hai thẻ <br> liên tiếp.
  formattedContent = formattedContent.replace(/\n/g, '<br>');

  return formattedContent;
}