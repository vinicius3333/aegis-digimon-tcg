import { getCardDefinition, Zone } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX11-072.js";
import "../BT12/BT12-057.js";

describe("EX11-072 Unique Emblem: Guardian Vortex", () => {
  it("preserves the printed Option and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-072")).toMatchObject({
      nameEn: "Unique Emblem: Guardian Vortex",
      colors: ["Green"],
      kinds: ["Option"],
      playCost: 3,
      types: ["Vortex Warriors", "LIBERATOR"],
      securityEffectText: "[Security] Activate this card's [Main] effects.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("publishes one Main clause and Delay's exact destination gates", () => {
    expect(compiled.effects.filter((effect) => effect.trigger === "Main")).toHaveLength(1);
    const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(watcher.keywords).toMatchObject([{ keyword: "Delay" }]);
    expect(watcher.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenSuspended",
        sourceFilter: { controller: "mine", nameOrTrait: [{ tokens: ["Shoto Kazama"] }] },
        actions: [
          {
            kind: "Digivolve",
            payCost: true,
            reduceCost: 3,
            into: { nameOrTrait: [{ tokens: ["Bird Dragon"], match: "trait" }], traits: ["LIBERATOR"] },
          },
        ],
      },
    ]);
    expect(compiled.effects.some((effect) => effect.actions.some((action) => "requiresDelayArmed" in action))).toBe(
      false,
    );
  });

  it("publicly plays a named card and places the emblem in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX11-026", as: "source" }],
          hand: [
            { card: "EX11-072", as: "emblem" },
            { card: "EX11-026", as: "pteromon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emblem").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-072"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-026")).toBe(true);
    assertNoLoudGap(s);
  });

  it("activates Main from a public security check and places the emblem", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "EX11-072", as: "emblem", faceUp: false }], deck: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-072"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("reaches Delay through public Main and later publicly suspends Shoto", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-080", as: "quartzBase" },
            { card: "EX11-035", as: "birdDragonBase" },
          ],
          hand: [
            { card: "EX11-072", as: "emblem" },
            { card: "EX11-026", as: "pteromon" },
            { card: "BT12-057", as: "quartz" },
            { card: "EX11-074", as: "vortexdramon" },
          ],
          security: ["BT1-013", "BT1-014"],
          deck: ["BT1-009", "BT1-013", "BT1-019"],
        },
        1: {
          security: ["BT1-013", "BT1-014"],
          deck: ["BT1-009", "BT1-013", "BT1-019"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds },
    );
    s.state.memory = 3;
    const emblemInstanceId = s.inst("emblem").instanceId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("emblem").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-072"));

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === emblemInstanceId)).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === emblemInstanceId)).toBe(true);
    const emblemPermanent = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard?.instanceId === emblemInstanceId,
    );
    expect(emblemPermanent).toBeDefined();
    expect(observe(s.engine).activatableEffects(emblemPermanent!)).toEqual([]);

    s.state.memory = 5;
    s.give(0, Zone.Hand, { card: "EX11-062", as: "shoto" });
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shoto").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-062"));
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("quartzBase").permanentId,
        instanceId: s.inst("quartz").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shoto").isSuspended);
    expect(s.perm("shoto").isSuspended).toBe(true);
    // The public suspension is reactive; the intrinsic Delay watcher resolves at the event
    // itself when a legal Bird Dragon + LIBERATOR base remains on the field.
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX11-072")).toBe(true);
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX11-074")).toBe(false);
    expect(s.perm("birdDragonBase").topCard?.cardId).toBe("EX11-074");
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
