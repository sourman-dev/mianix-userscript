import type { WorldBookEntry } from '@/types/character';

/**
 * Token validation and estimation utilities for worldbook optimization
 */

/**
 * Estimate token count for worldbook entries
 * Using ~4 chars per token approximation (GPT-like tokenization)
 */
export function estimateTokenCount(entries: WorldBookEntry[]): number {
  return entries.reduce((total, entry) => {
    const content = entry.content || '';
    const comment = entry.comment || '';
    // Include XML wrapper overhead
    const overhead = 50; // <world_information tag="...">...</world_information>
    return total + Math.ceil((content.length + comment.length + overhead) / 4);
  }, 0);
}

/**
 * Compare token usage between full and filtered worldbook
 */
export function compareTokenUsage(
  fullWorldbook: WorldBookEntry[],
  filteredWorldbook: WorldBookEntry[]
): {
  fullTokens: number;
  filteredTokens: number;
  reduction: number;
  reductionPercent: string;
} {
  const fullTokens = estimateTokenCount(fullWorldbook);
  const filteredTokens = estimateTokenCount(filteredWorldbook);
  const reduction = fullTokens - filteredTokens;
  const reductionPercent = fullTokens > 0
    ? ((reduction / fullTokens) * 100).toFixed(1)
    : '0';

  return {
    fullTokens,
    filteredTokens,
    reduction,
    reductionPercent: `${reductionPercent}%`,
  };
}

/**
 * Log token comparison for debugging
 */
export function logTokenComparison(
  characterName: string,
  fullWorldbook: WorldBookEntry[],
  filteredWorldbook: WorldBookEntry[]
): void {
  const comparison = compareTokenUsage(fullWorldbook, filteredWorldbook);
  console.log(`[Worldbook Token Usage] ${characterName}:`);
  console.log(`  Full: ${comparison.fullTokens} tokens (${fullWorldbook.length} entries)`);
  console.log(`  Filtered: ${comparison.filteredTokens} tokens (${filteredWorldbook.length} entries)`);
  console.log(`  Reduction: ${comparison.reduction} tokens (${comparison.reductionPercent})`);
}
