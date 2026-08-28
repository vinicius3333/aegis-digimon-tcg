/* Card names in the play log are links (`PlayLog.cs`): clicking one opens the
   card. The log lines are already built as translated sentences, so rather than
   rebuilding every line as a template, each line carries the cards it names and
   this module finds those names inside the finished text.

   Pure string work: the caller renders the segments, and a segment with a
   `cardId` is the clickable one. */

export interface LogSegment {
  text: string;
  /** Set when this run of text is a card name the reader can open. */
  cardId?: string;
}

/**
 * One card a line names, in the order the line names it.
 *
 * An ordered list rather than a name -> id map: two different cards can share a
 * printed name (Agumon ST1-03 and Agumon BT1-010), and a map collapses them so
 * both occurrences link to whichever id was written last. Order is what tells
 * them apart, so "You revealed Agumon with Agumon" links each half to its own card.
 */
export interface NamedCard {
  name: string;
  cardId: string;
}

interface Hit {
  start: number;
  end: number;
  cardId: string;
}

/**
 * Split a log line into plain runs and the card names inside it.
 *
 * Longer names are matched first so a card whose name contains another card's
 * name links as itself. Overlapping and repeated matches are handled by claiming
 * ranges: no character is ever claimed by two cards.
 *
 * Cards sharing a name are matched positionally — the first such card claims the
 * first occurrence, the second the next one. An occurrence beyond the supplied
 * cards falls back to the last card with that name, which keeps a line that names
 * one card twice linking both times.
 */
export function logSegments(text: string, cards: readonly NamedCard[]): LogSegment[] {
  const byName = new Map<string, string[]>();
  for (const { name, cardId } of cards) {
    if (!name) continue;
    const ids = byName.get(name);
    if (ids) ids.push(cardId);
    else byName.set(name, [cardId]);
  }
  const names = [...byName.keys()].sort((a, b) => b.length - a.length);
  const hits: Hit[] = [];
  const claimed: boolean[] = new Array(text.length).fill(false);
  for (const name of names) {
    const ids = byName.get(name)!;
    let occurrence = 0;
    for (let from = text.indexOf(name); from !== -1; from = text.indexOf(name, from + 1)) {
      const end = from + name.length;
      let free = true;
      for (let i = from; i < end; i += 1) if (claimed[i]) free = false;
      if (!free) continue;
      for (let i = from; i < end; i += 1) claimed[i] = true;
      hits.push({ start: from, end, cardId: ids[Math.min(occurrence, ids.length - 1)]! });
      occurrence += 1;
    }
  }
  if (hits.length === 0) return [{ text }];
  hits.sort((a, b) => a.start - b.start);
  const segments: LogSegment[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start > cursor) segments.push({ text: text.slice(cursor, hit.start) });
    segments.push({ text: text.slice(hit.start, hit.end), cardId: hit.cardId });
    cursor = hit.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
