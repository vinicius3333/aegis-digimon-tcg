import { readRelative, readStylesheet } from "./stylesheetSource";

/**
 * jsdom has no layout engine and ignores `@media` when it computes styles, so a
 * test cannot ask it what a phone would render. This module is a small stand-in:
 * it evaluates the match stylesheets' media queries for a named viewport and runs
 * the cascade (importance, specificity, source order) over the rules whose
 * selectors match a real rendered element. It answers "which declared value wins
 * for this element on this phone", not "where does it paint": sizes, overflow in
 * pixels and `@container` queries still need a real browser.
 */

export interface Viewport {
  name: string;
  width: number;
  height: number;
}

export const PHONE_VIEWPORTS: readonly Viewport[] = [
  { name: "360x640 portrait", width: 360, height: 640 },
  { name: "390x844 portrait", width: 390, height: 844 },
  { name: "844x390 landscape", width: 844, height: 390 },
];

const ROOT_FONT_SIZE_PX = 16;

function lengthInPixels(value: string): number {
  const match = /^(-?[\d.]+)(px|rem|em)?$/.exec(value.trim());
  if (!match) throw new Error(`unsupported media length: ${value}`);
  const amount = Number(match[1]);
  return match[2] === "rem" || match[2] === "em" ? amount * ROOT_FONT_SIZE_PX : amount;
}

function compare(actual: number, operator: string, expected: number): boolean {
  switch (operator) {
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
    default:
      throw new Error(`unsupported media operator: ${operator}`);
  }
}

/** A phone: a finger, no hover, no reduced-motion preference. */
function matchesFeature(feature: string, viewport: Viewport): boolean {
  const range = /^(width|height)\s*(<=|>=|<|>)\s*(.+)$/.exec(feature);
  if (range) {
    const actual = range[1] === "width" ? viewport.width : viewport.height;
    return compare(actual, range[2]!, lengthInPixels(range[3]!));
  }
  const [name, rawValue] = feature.split(":").map((part) => part.trim());
  const value = rawValue ?? "";
  switch (name) {
    case "min-width":
      return viewport.width >= lengthInPixels(value);
    case "max-width":
      return viewport.width <= lengthInPixels(value);
    case "min-height":
      return viewport.height >= lengthInPixels(value);
    case "max-height":
      return viewport.height <= lengthInPixels(value);
    case "orientation":
      return value === (viewport.height >= viewport.width ? "portrait" : "landscape");
    case "pointer":
    case "any-pointer":
      return value === "coarse";
    case "hover":
    case "any-hover":
      return value === "none";
    case "prefers-reduced-motion":
      return value === "no-preference";
    case "prefers-color-scheme":
      return value === "dark";
    default:
      throw new Error(`unsupported media feature: ${feature}`);
  }
}

/** Evaluates a media query list the way a phone at `viewport` would. */
export function matchesMediaQuery(query: string, viewport: Viewport): boolean {
  return query.split(",").some((alternative) => {
    const trimmed = alternative.trim();
    const negated = trimmed.startsWith("not ");
    const features = [...trimmed.matchAll(/\(([^()]+)\)/g)].map((match) => match[1]!.trim());
    const matches = features.every((feature) => matchesFeature(feature, viewport));
    return negated ? !matches : matches;
  });
}

interface StyleRule {
  selectors: string[];
  declarations: { property: string; value: string; important: boolean }[];
  mediaQueries: string[];
  order: number;
}

/** `overflow` sets both axes, so it competes in the cascade with each longhand. */
function expandShorthand(declaration: StyleRule["declarations"][number]): StyleRule["declarations"] {
  if (declaration.property !== "overflow") return [declaration];
  const [horizontal, vertical = horizontal] = declaration.value.split(/\s+/);
  return [
    declaration,
    { ...declaration, property: "overflow-x", value: horizontal! },
    { ...declaration, property: "overflow-y", value: vertical! },
  ];
}

function parseDeclarations(body: string): StyleRule["declarations"] {
  return body
    .split(";")
    .map((declaration) => declaration.trim())
    .filter((declaration) => declaration.includes(":"))
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      const rawValue = declaration.slice(colon + 1).trim();
      const important = /!important$/.test(rawValue);
      return {
        property: declaration.slice(0, colon).trim(),
        value: rawValue.replace(/\s*!important$/, ""),
        important,
      };
    })
    .flatMap(expandShorthand);
}

function closingBrace(css: string, openIndex: number): number {
  let depth = 0;
  for (let index = openIndex; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error("unbalanced stylesheet");
}

function parseRules(css: string, mediaQueries: string[], rules: StyleRule[]): void {
  let cursor = 0;
  while (cursor < css.length) {
    const open = css.indexOf("{", cursor);
    if (open === -1) return;
    const prelude = css.slice(cursor, open).split(";").at(-1)!.trim();
    const close = closingBrace(css, open);
    const body = css.slice(open + 1, close);
    if (prelude.startsWith("@media")) {
      parseRules(body, [...mediaQueries, prelude.slice("@media".length).trim()], rules);
    } else if (prelude.startsWith("@supports")) {
      parseRules(body, mediaQueries, rules);
    } else if (!prelude.startsWith("@")) {
      rules.push({
        selectors: prelude
          .split(",")
          .map((selector) => selector.trim())
          .filter(Boolean),
        declarations: parseDeclarations(body),
        mediaQueries,
        order: rules.length,
      });
    }
    cursor = close + 1;
  }
}

/** The stylesheets a live match loads, in the order the browser receives them. */
function matchStylesheets(): string {
  return [
    readRelative("../overlay/effectPromptFamily.css"),
    readRelative("../overlay/fieldDecisionRail.css"),
    readStylesheet("game.css"),
    readStylesheet("arena.css"),
    readStylesheet("arenaMobile.css"),
  ]
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

let cachedRules: StyleRule[] | undefined;
function allRules(): StyleRule[] {
  if (!cachedRules) {
    const rules: StyleRule[] = [];
    parseRules(matchStylesheets(), [], rules);
    cachedRules = rules;
  }
  return cachedRules;
}

/** [ids, classes/attributes/pseudo-classes, types], counted loosely but enough for this cascade. */
function specificity(selector: string): [number, number, number] {
  const withoutStrings = selector.replace(/"[^"]*"|'[^']*'/g, "");
  const ids = (withoutStrings.match(/#[\w-]+/g) ?? []).length;
  const classes = (withoutStrings.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)(?!not\(|is\(|where\(|has\()[\w-]+/g) ?? []).length;
  const types = (
    withoutStrings.replace(/[.#][\w-]+|\[[^\]]+\]|::?[\w-]+/g, " ").match(/(^|[\s>+~(])([a-z][\w-]*)/gi) ?? []
  ).length;
  return [ids, classes, types];
}

function elementMatches(element: Element, selector: string): boolean {
  if (/::/.test(selector)) return false;
  try {
    return element.matches(selector);
  } catch {
    return false;
  }
}

/**
 * The value that wins the cascade for `property` on `element` at `viewport`, or
 * undefined when no rule in the match stylesheets declares it. Inline styles are
 * read first, as the browser would, unless a stylesheet declaration is `!important`.
 */
export function cascadedValue(element: Element, property: string, viewport: Viewport): string | undefined {
  return cascadeWinner(element, property, viewport)?.value;
}

/** The winning declaration and where it came from, for readable failure messages. */
export function cascadeWinner(
  element: Element,
  property: string,
  viewport: Viewport,
): { value: string; source: string } | undefined {
  let winner:
    | {
        value: string;
        important: boolean;
        specificity: [number, number, number];
        order: number;
        source: string;
      }
    | undefined;
  for (const rule of allRules()) {
    if (!rule.mediaQueries.every((query) => matchesMediaQuery(query, viewport))) continue;
    const matching = rule.selectors.filter((selector) => elementMatches(element, selector));
    if (matching.length === 0) continue;
    const ruleSpecificity = matching
      .map(specificity)
      .reduce((best, next) => (compareSpecificity(next, best) > 0 ? next : best));
    for (const declaration of rule.declarations) {
      if (declaration.property !== property) continue;
      const candidate = {
        value: declaration.value,
        important: declaration.important,
        specificity: ruleSpecificity,
        order: rule.order,
        source: [...rule.mediaQueries.map((query) => `@media ${query}`), matching.join(", ")].join(" "),
      };
      if (!winner || beats(candidate, winner)) winner = candidate;
    }
  }
  const inline = (element as HTMLElement).style?.getPropertyValue(property);
  if (inline && !winner?.important) return { value: inline, source: "inline style" };
  return winner && { value: winner.value, source: winner.source };
}

function compareSpecificity(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index]! - right[index]!;
  }
  return 0;
}

function beats(
  candidate: { important: boolean; specificity: [number, number, number]; order: number },
  current: { important: boolean; specificity: [number, number, number]; order: number },
): boolean {
  if (candidate.important !== current.important) return candidate.important;
  const bySpecificity = compareSpecificity(candidate.specificity, current.specificity);
  if (bySpecificity !== 0) return bySpecificity > 0;
  return candidate.order > current.order;
}
