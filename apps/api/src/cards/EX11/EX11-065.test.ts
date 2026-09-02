import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-065.js";

describe("EX11-065 Close", () => {
  it("preserves the printed Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-065")).toMatchObject({
      nameEn: "Close",
      colors: ["Black"],
      kinds: ["Tamer"],
      playCost: 3,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("trashes a Mineral card from a digivolution stack to gain memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-065", as: "close" },
            { card: "BT13-061", as: "host", under: [{ card: "EX8-051", as: "stackCost" }] },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("close"));
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-051")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("accepts a [Rock] Digi-Egg from a digivolution stack as the memory cost", async () => {
    // EX8-005 Tumblemon is a [Rock] Digi-Egg — the catalog kind is `DigiEgg`, not `Digimon`,
    // and it is the card sitting at the bottom of every stack raised out of the breeding area.
    // A `kind: ["Digimon"]` cost filter would reject it and leave the clause unpayable here.
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-065", as: "close" },
            { card: "BT13-061", as: "host", under: [{ card: "EX8-005", as: "digiEgg" }] },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("close"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX8-005")).toBe(true);
    expect(s.perm("host").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("places a [Rock] Digi-Egg from hand under the triggering Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-061", as: "gotsumon" },
            { card: "EX11-065", as: "close" },
          ],
          // BT1-090 carries neither trait, so it is never a legal placement even though the
          // clause names a "card" rather than a Digimon card.
          hand: ["EX8-005", "BT1-090"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gotsumon").permanentId });
    await settle(() => s.perm("close").isSuspended);

    expect(s.perm("gotsumon").stack.map(({ cardId }) => cardId)).toEqual(["EX8-005"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-090"]);
    assertNoLoudGap(s);
  });

  it("suspends to place a Mineral or Rock card under a played Mineral Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-061", as: "gotsumon" },
            { card: "EX11-065", as: "close" },
          ],
          hand: ["EX8-051"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gotsumon").permanentId });
    await settle(() => s.perm("close").isSuspended);

    expect(s.perm("close").isSuspended).toBe(true);
    expect(s.perm("gotsumon").stack.some((card) => card.cardId === "EX8-051")).toBe(true);
    assertNoLoudGap(s);
  });

  it("leaves Close unsuspended and places nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-061", as: "gotsumon" },
            { card: "EX11-065", as: "close" },
          ],
          hand: ["EX8-051"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenPlayed", { subjectPermanentId: s.perm("gotsumon").permanentId });
    await settle(() => false, 30);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("close").isSuspended).toBe(false);
    expect(s.perm("gotsumon").stack).toHaveLength(0);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "EX8-051")).toBe(true);
    assertNoLoudGap(s);
  });

  it("places from trash under the Mineral Digimon that just digivolved", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-061", as: "base" },
            { card: "EX11-065", as: "close" },
          ],
          hand: [{ card: "BT10-062", as: "evolution" }],
          trash: [{ card: "EX8-051", as: "material" }],
          deck: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("close").isSuspended);

    expect(s.perm("base").topCard?.cardId).toBe("BT10-062");
    // "as any of those Digimon's BOTTOM digivolution card": index 0 is the bottom of the stack,
    // beneath the BT13-061 the digivolution itself pushed down.
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["EX8-051", "BT13-061"]);
    expect(s.perm("base").stack[0]!.instanceId).toBe(s.inst("material").instanceId);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR for both trait-gated trigger events", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    expect(allTurns.actions).toHaveLength(2);
    for (const event of ["whenPlayed", "whenOneOfYoursDigivolves"]) {
      expect(allTurns.actions).toContainEqual(
        expect.objectContaining({
          kind: "SubTrigger",
          event,
          sourceFilter: expect.objectContaining({ nameOrTrait: [{ tokens: ["Mineral", "Rock"], match: "trait" }] }),
          actions: [
            expect.objectContaining({
              kind: "PlaceUnder",
              underFilter: { isTriggerSource: true },
              from: ["hand", "trash"],
              cost: { kind: "suspend", target: expect.any(Object), raw: expect.any(String) },
            }),
          ],
        }),
      );
    }
  });

  it("keeps both card pools free of a Digimon-kind restriction so Digi-Eggs qualify", () => {
    const mainPhase = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")!;
    const gainMemory = mainPhase.actions[0] as { cost?: { target?: { filter?: { kind?: unknown } } } };
    expect(gainMemory.cost?.target?.filter?.kind).toBeUndefined();

    const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns")!;
    for (const watcher of allTurns.actions as { actions?: { target?: { filter?: { kind?: unknown } } }[] }[]) {
      expect(watcher.actions?.[0]?.target?.filter?.kind).toBeUndefined();
    }
  });
});
