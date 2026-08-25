import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-061.js";

describe("EX11-061 Mirai Kinosaki", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-061")).toMatchObject({
      nameEn: "Mirai Kinosaki",
      colors: ["Yellow", "Purple"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains memory at the start of the main phase when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-061", as: "mirai" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("mirai"));
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("plays a level 3 Puppet after a Puppet digivolution and deletes exactly it at turn end (Q5915/Q5916)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-061", as: "mirai" },
            { card: "EX11-019", as: "base" },
          ],
          hand: [
            { card: "EX11-021", as: "digivolveTarget" },
            { card: "EX11-020", as: "playedByMirai" },
          ],
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
        instanceId: s.inst("digivolveTarget").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-020"));

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard?.cardId === "EX11-020");
    expect(played).toBeDefined();
    expect(s.perm("mirai").isSuspended).toBe(true);
    expect(s.perm("base").topCard?.cardId).toBe("EX11-021");

    // DelayedDelete joins the production end-of-turn SubTrigger window, so it is ordered
    // with every other pending end-of-turn effect rather than running during the digivolve.
    await advance(s.engine).fireSubTrigger("endOfTurn", { turnSeat: 0 });

    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX11-020")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX11-021")).toBe(true);
    assertNoLoudGap(s);
  });

  it("publishes full exclusive IR with the delayed delete inside the digivolve watcher", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "YourTurn")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenOneOfYoursDigivolves",
        sourceFilter: { nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] },
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            target: { filter: { levels: [3], nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] } },
            cost: { kind: "suspend" },
          },
          { kind: "DelayedDelete" },
        ],
      },
    ]);
  });
});
