export interface ParsedLLMResponse {
  mainContent: string;
  nextPrompts: string[];
  events: string;
}

export function parseLLMResponse(rawResponse: string): ParsedLLMResponse {
  const cleaned = rawResponse.replace(/<\/?outputFormat>/g, '').trim();

  let mainContent = cleaned;
  let nextPrompts: string[] = [];
  let events = '';

  const promptsMatch = mainContent.match(/<next_prompts>([\s\S]*?)<\/next_prompts>/);
  if (promptsMatch && promptsMatch[1]) {
    nextPrompts = promptsMatch[1]
      .split('\n')
      .map(line => line.trim().replace(/^[-*]\s*\[|\]\s*$/g, '').trim())
      .filter(line => line.length > 0);
    mainContent = mainContent.replace(promptsMatch[0], '');
  }

  const eventsMatch = mainContent.match(/<events>([\s\S]*?)<\/events>/);
  if (eventsMatch && eventsMatch[1]) {
    events = eventsMatch[1].trim();
    mainContent = mainContent.replace(eventsMatch[0], '');
  }
  
  // Lấy nội dung bên trong thẻ <output> nếu có
  const outputMatch = mainContent.match(/<output>([\s\S]*?)<\/output>/);
  if (outputMatch && outputMatch[1]) {
    mainContent = outputMatch[1].trim();
  } else {
    mainContent = mainContent.trim();
  }

  return { mainContent, nextPrompts, events };
}