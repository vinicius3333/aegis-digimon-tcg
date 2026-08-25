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
 * ranges: the same name appearing twice links twice, but no character is ever
 * claimed by two cards.
 */
export function logSegments(text: string, cards: ReadonlyMap<string, string>): LogSegment[] {
  const names = [...cards.entries()].sort(([a], [b]) => b.length - a.length);
  const hits: Hit[] = [];
  const claimed: boolean[] = new Array(text.length).fill(false);
  for (const [name, cardId] of names) {
    if (!name) continue;
    for (let from = text.indexOf(name); from !== -1; from = text.indexOf(name, from + 1)) {
      const end = from + name.length;
      let free = true;
      for (let i = from; i < end; i += 1) if (claimed[i]) free = false;
      if (!free) continue;
      for (let i = from; i < end; i += 1) claimed[i] = true;
      hits.push({ start: from, end, cardId });
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
