import { ALL_FAMOUS_DECKS, allCards } from "@aegis/shared";
import {
  asteriskCensorStrategy,
  DataSet,
  englishDataset,
  englishRecommendedTransformers,
  pattern,
  RegExpMatcher,
  TextCensor,
  type MatchPayload,
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

// Players name cards in deck names and in chat, and some cards hide a blocked word inside them
// (Vulcanusmon). Every word of a card name or a famous archetype that the base filter flags is
// allowed back, so a new set cannot make its own Digimon unsayable.
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
const censor = new TextCensor().setStrategy(asteriskCensorStrategy());

/**
 * Drops accents one character at a time so every index still lines up with `text`, which
 * lets matches found here be masked in the original. A character whose accent-free form
 * would change length is left as it is.
 */
function withoutAccents(text: string): string {
  return text.replace(/./gsu, (character) => {
    const stripped = character.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return stripped.length === character.length ? stripped : character;
  });
}

function blockedMatches(text: string): MatchPayload[] {
  return [...matcher.getAllMatches(text), ...matcher.getAllMatches(withoutAccents(text))];
}

export function hasBlockedWord(text: string): boolean {
  return matcher.hasMatch(text) || matcher.hasMatch(withoutAccents(text));
}

/** Replaces every blocked word with asterisks and keeps the rest of the text. */
export function maskBlockedWords(text: string): string {
  const matches = blockedMatches(text);
  return matches.length === 0 ? text : censor.applyTo(text, matches);
}
