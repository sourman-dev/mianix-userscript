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

  // Bước 1: Chuẩn hóa tất cả các dạng <br> thành \n
  formattedContent = formattedContent.replace(/<br\s*\/?>/gi, "\n");

  // Bước 2: Xử lý các dòng mới - thay thế \n\n thành rỗng
  formattedContent = formattedContent.replace(/\n\n/g, '');

  // Bước 3: Áp dụng định dạng màu sắc
  // Lời nói (quotes) - màu xanh dương nhẹ
  formattedContent = formattedContent.replace(
    /([""](.*?)[""]) /g,
    '<span class="text-blue-600 dark:text-blue-400">$1</span>'
  );
  // Hành động (*text*) - màu cam nhẹ
  formattedContent = formattedContent.replace(
    /(\*(.*?)\*)/g,
    '<span class="text-orange-600 dark:text-orange-400 italic">$1</span>'
  );
  // Nhấn mạnh (**text**) - màu tím nhẹ
  formattedContent = formattedContent.replace(
    /(\*\*(.*?)\*\*)/g,
    '<span class="text-purple-600 dark:text-purple-400 font-semibold">$1</span>'
  );
  // Suy nghĩ [text] - màu xám
  formattedContent = formattedContent.replace(
    /(\[(.*?)\])/g,
    '<span class="text-gray-500 dark:text-gray-400">$1</span>'
  );
  
  // --- BƯỚC 3: CHUYỂN ĐỔI KÝ TỰ XUỐNG DÒNG SANG <br> ---
  // Bây giờ chúng ta mới chuyển đổi, đảm bảo rằng sẽ không có nhiều hơn hai thẻ <br> liên tiếp.
  formattedContent = formattedContent.replace(/\n/g, '<br>');

  return formattedContent;
}