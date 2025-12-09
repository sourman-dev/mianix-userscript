import { db, CharacterCard } from '@/db';
import type { WorldBookEntry } from '@/types/character';

/**
 * Migration and validation utilities for worldbook optimization
 */

/**
 * Validate all character cards have valid worldbook structure
 * No actual migration needed - just validation
 */
export function validateWorldbooks(): {
  total: number;
  valid: number;
  issues: Array<{ characterId: string; issue: string }>;
} {
  const characters = db.CharacterCards.find().fetch() as CharacterCard[];
  const issues: Array<{ characterId: string; issue: string }> = [];

  for (const char of characters) {
    const worldbook = char.data?.worldBook;

    if (!worldbook) continue; // OK - no worldbook

    if (!Array.isArray(worldbook)) {
      issues.push({
        characterId: char.id,
        issue: 'worldBook is not an array',
      });
      continue;
    }

    for (let i = 0; i < worldbook.length; i++) {
      const entry = worldbook[i];

      if (!entry.keys || !Array.isArray(entry.keys)) {
        issues.push({
          characterId: char.id,
          issue: `Entry ${i}: keys is not an array`,
        });
      }

      if (typeof entry.content !== 'string') {
        issues.push({
          characterId: char.id,
          issue: `Entry ${i}: content is not a string`,
        });
      }
    }
  }

  return {
    total: characters.length,
    valid: characters.length - issues.length,
    issues,
  };
}

/**
 * Get embedding status for all characters
 */
export function getEmbeddingStatus(): Array<{
  characterId: string;
  characterName: string;
  totalEntries: number;
  embeddedEntries: number;
  percentage: string;
}> {
  const characters = db.CharacterCards.find().fetch() as CharacterCard[];

  return characters.map(char => {
    const worldbook = char.data?.worldBook || [];
    const embedded = worldbook.filter(e => e.embedding?.length).length;
    const percentage = worldbook.length > 0
      ? ((embedded / worldbook.length) * 100).toFixed(1)
      : '0';

    return {
      characterId: char.id,
      characterName: char.data?.name || 'Unknown',
      totalEntries: worldbook.length,
      embeddedEntries: embedded,
      percentage: `${percentage}%`,
    };
  });
}

/**
 * Get summary statistics for all worldbooks
 */
export function getWorldbookStats(): {
  totalCharacters: number;
  totalEntries: number;
  embeddedEntries: number;
  embeddingCoverage: string;
  averageEntriesPerCharacter: number;
} {
  const characters = db.CharacterCards.find().fetch() as CharacterCard[];
  let totalEntries = 0;
  let embeddedEntries = 0;

  for (const char of characters) {
    const worldbook = char.data?.worldBook || [];
    totalEntries += worldbook.length;
    embeddedEntries += worldbook.filter(e => e.embedding?.length).length;
  }

  const embeddingCoverage = totalEntries > 0
    ? ((embeddedEntries / totalEntries) * 100).toFixed(1)
    : '0';

  const averageEntriesPerCharacter = characters.length > 0
    ? Math.round(totalEntries / characters.length)
    : 0;

  return {
    totalCharacters: characters.length,
    totalEntries,
    embeddedEntries,
    embeddingCoverage: `${embeddingCoverage}%`,
    averageEntriesPerCharacter,
  };
}
