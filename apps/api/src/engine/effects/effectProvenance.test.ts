import { describe, expect, it } from "vitest";
import { CardKind } from "@aegis/shared";
import type { EffectContext } from "./EffectContext.js";
import { effectProvenanceKinds } from "./effectProvenance.js";

function contextFor(options: {
  printedKinds: CardKind[];
  host?: { topInstanceId: string; effectiveKinds: CardKind[] };
}): EffectContext {
  const host =
    options.host === undefined
      ? undefined
      : { permanentId: "host", topCard: { instanceId: options.host.topInstanceId } };
  return {
    source: {
      instanceId: "source",
      definition: { kinds: options.printedKinds },
      permanent: () => host,
    },
    game: { effectiveKinds: () => options.host?.effectiveKinds ?? [] },
  } as unknown as EffectContext;
}

describe("effectProvenanceKinds", () => {
  it("counts a top Tamer treated as a Digimon as both (CR 15-12-1-6, Q6104)", () => {
    const ctx = contextFor({
      printedKinds: [CardKind.Tamer],
      host: { topInstanceId: "source", effectiveKinds: [CardKind.Tamer, CardKind.Digimon] },
    });
    expect(effectProvenanceKinds(ctx).sort()).toEqual([CardKind.Digimon, CardKind.Tamer]);
  });

  it.each([CardKind.Tamer, CardKind.Option])(
    "counts an inherited effect under a Digimon only as a Digimon effect, even from a %s card (CR 15-3-2)",
    (printedKind) => {
      const ctx = contextFor({
        printedKinds: [printedKind],
        host: { topInstanceId: "top", effectiveKinds: [CardKind.Digimon] },
      });
      expect(effectProvenanceKinds(ctx)).toEqual([CardKind.Digimon]);
    },
  );

  it("counts an inherited effect under a Tamer treated as a Digimon as both (Q5980)", () => {
    const ctx = contextFor({
      printedKinds: [CardKind.Tamer],
      host: { topInstanceId: "top", effectiveKinds: [CardKind.Tamer, CardKind.Digimon] },
    });
    expect(effectProvenanceKinds(ctx).sort()).toEqual([CardKind.Digimon, CardKind.Tamer]);
  });

  it("keeps printed kinds for a card off the field", () => {
    expect(effectProvenanceKinds(contextFor({ printedKinds: [CardKind.Option] }))).toEqual([CardKind.Option]);
  });

  it("counts a linked card's clause only as a Digimon effect (Q6471)", () => {
    const ctx = contextFor({
      printedKinds: [CardKind.Option],
      host: { topInstanceId: "top", effectiveKinds: [CardKind.Digimon] },
    });
    expect(effectProvenanceKinds(ctx, { isLinked: true })).toEqual([CardKind.Digimon]);
  });
});

describe("Discord 1555938104404348949 — DUAL effect kinds", () => {
  it.each(["Main", "WhenDigivolving", "WhenAttacking", "Counter"])(
    "classifies the %s face without the catalog union",
    (timing) => {
      const ctx = contextFor({ printedKinds: [CardKind.Digimon, CardKind.Option] });
      Object.assign(ctx.source.definition, { isDualCard: true });
      ctx.activeTiming = timing;
      expect(effectProvenanceKinds(ctx)).toEqual([timing === "Main" ? CardKind.Option : CardKind.Digimon]);
    },
  );
});

it("1555938104404348949: an inherited effect on a DUAL host is only a Digimon effect", () => {
  const ctx = contextFor({
    printedKinds: [CardKind.Digimon],
    host: { topInstanceId: "top", effectiveKinds: [CardKind.Digimon, CardKind.Option] },
  });
  Object.assign(ctx.game, { definitionOf: () => ({ isDualCard: true }) });
  expect(effectProvenanceKinds(ctx)).toEqual([CardKind.Digimon]);
});
