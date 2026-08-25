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
    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("material").instanceId)).toBe(true);
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
});
