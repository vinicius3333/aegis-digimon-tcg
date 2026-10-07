import { ALL_FAMOUS_DECKS, allCards, COMMUNITY_DECK_NAME_MAX } from "@aegis/shared";
import {
  DataSet,
  englishDataset,
  englishRecommendedTransformers,
  pattern,
  RegExpMatcher,
  type ParsedPattern,
} from "obscenity";

type PhraseMetadata = { originalWord: string };

// Terms the English preset does not know. Players here write mostly in Portuguese, English and
// Spanish. A `|` marks a word boundary; short words carry one so they do not match inside longer,
// innocent words. The matcher collapses repeated letters before it compares, so a pattern is
// written with single letters: `pora` is what "porra" becomes.
const PORTUGUESE_PATTERNS: readonly ParsedPattern[] = [
  pattern`caralh`,
  pattern`|pora`,
  pattern`buceta`,
  pattern`boceta`,
  pattern`|puta`,
  pattern`|puto|`,
  pattern`putinh`,
  pattern`viad`,
  pattern`|foda`,
  pattern`|fodid`,
  pattern`fdp`,
  pattern`merda`,
  pattern`arombad`,
  pattern`piroc`,
  pattern`|pica|`,
  pattern`xoxot`,
  pattern`xereca`,
  pattern`punhet`,
  pattern`vagabund`,
  pattern`|corno|`,
  pattern`cuzao`,
  pattern`|cu|`,
  pattern`|bosta|`,
  pattern`|pau no`,
  pattern`|rola|`,
  pattern`|traveco`,
  pattern`|macaco|`,
  pattern`|crioul`,
  pattern`|sapatao`,
  pattern`|bicha|`,
  pattern`estupr`,
  pattern`pedofil`,
];

const SPANISH_PATTERNS: readonly ParsedPattern[] = [
  pattern`mierda`,
  pattern`pendej`,
  pattern`|verga|`,
  pattern`culer`,
  pattern`maric`,
  pattern`|cono|`,
  pattern`chinga`,
  pattern`|joder`,
  pattern`gilipola`,
];

const OTHER_PATTERNS: readonly ParsedPattern[] = [pattern`nazi`, pattern`hitler`, pattern`|kkk|`];

// Deck names are mostly card names, and some cards hide a blocked word inside them (Vulcanusmon).
// Every word of a card name or a famous archetype that the base filter flags is allowed back, so
// a new set cannot make its own Digimon unusable as a deck name.
function catalogWords(): string[] {
  const names = [...allCards().map((card) => card.nameEn), ...ALL_FAMOUS_DECKS.map((deck) => deck.archetype)];
  return [...new Set(names.flatMap((name) => name.toLowerCase().split(/[^\p{L}\p{N}]+/u)))].filter(Boolean);
}

function buildMatcher(allowedWords: readonly string[]): RegExpMatcher {
  const dataset = new DataSet<PhraseMetadata>().addAll(englishDataset);
  for (const term of [...PORTUGUESE_PATTERNS, ...SPANISH_PATTERNS, ...OTHER_PATTERNS])
    dataset.addPhrase((phrase) => phrase.addPattern(term));
  const built = dataset.build();
  return new RegExpMatcher({
    ...built,
    whitelistedTerms: [...(built.whitelistedTerms ?? []), ...allowedWords],
    ...englishRecommendedTransformers,
  });
}

const baseMatcher = buildMatcher([]);
const matcher = buildMatcher(catalogWords().filter((word) => baseMatcher.hasMatch(word)));

export type DeckNameReview = { allowed: true; name: string } | { allowed: false };

/** The public form of a deck name, or a refusal when it is empty or contains a blocked word. */
export function reviewDeckName(raw: string): DeckNameReview {
  const name = raw.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, COMMUNITY_DECK_NAME_MAX).trim();
  if (name.length === 0) return { allowed: false };
  const withoutAccents = name.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (matcher.hasMatch(name) || matcher.hasMatch(withoutAccents)) return { allowed: false };
  return { allowed: true, name };
}
