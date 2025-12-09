import { db, CharacterCard } from '@/db';
import type { WorldBookEntry, GlobalWorldbookType } from '@/types/character';

/**
 * Get merged worldbook entries from global + character-specific
 * Global entries come first, character entries can override by matching comment/keys
 */
export function getMergedWorldbook(characterId: string): WorldBookEntry[] {
  const character = db.CharacterCards.findOne({ id: characterId }) as CharacterCard & {
    linkedGlobalWorldbooks?: string[];
  };

  if (!character) return [];

  // Get linked global worldbooks
  const linkedIds = character.linkedGlobalWorldbooks || [];
  const globalEntries: WorldBookEntry[] = [];

  for (const globalId of linkedIds) {
    const globalWb = db.GlobalWorldbooks.findOne({ id: globalId }) as GlobalWorldbookType | undefined;
    if (globalWb?.entries) {
      globalEntries.push(...globalWb.entries);
    }
  }

  // Get character-specific entries
  const characterEntries = character.data?.worldBook || [];

  // Merge: global first, then character (character can override)
  return [...globalEntries, ...characterEntries];
}

/**
 * Check if a character has linked global worldbooks
 */
export function hasLinkedGlobalWorldbooks(characterId: string): boolean {
  const character = db.CharacterCards.findOne({ id: characterId }) as CharacterCard & {
    linkedGlobalWorldbooks?: string[];
  };
  return (character?.linkedGlobalWorldbooks?.length || 0) > 0;
}
