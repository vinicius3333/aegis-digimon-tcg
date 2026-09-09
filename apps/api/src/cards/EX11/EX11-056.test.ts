import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-056.js";

describe("EX11-056 Ryutaro Williams", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-056")).toMatchObject({
      nameEn: "Ryutaro Williams",
      colors: ["Red", "Green"],
      kinds: ["Tamer"],
      playCost: 5,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("does not hatch or evolve when the suspend payment is declined (Q5910)", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: ["BT1-001"],
          battleArea: [
            { card: "EX11-009", as: "triggerBase" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          hand: [{ card: "EX11-010", as: "masterTyrannomon" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("triggerBase").permanentId,
      instanceId: s.inst("masterTyrannomon").instanceId,
    });
    await settle(() => s.decisions.some((decision) => decision.req.kind === "optional"));
    expect(s.perm("ryutaro").isSuspended).toBe(false);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-056", as: "ryutaro" }], deck: ["BT1-009"] },
      1: { deck: ["BT1-010"] },
    });
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("does not reset memory above 2 at the start of your turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-056", as: "ryutaro" }], deck: ["BT1-009"] },
      1: { deck: ["BT1-010"] },
    });
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("hatches from the legal egg deck after a Tyrannomon digivolution", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: ["BT1-001"],
          battleArea: [
            { card: "EX11-009", as: "triggerBase" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          hand: [
            { card: "EX11-010", as: "masterTyrannomon" },
            { card: "EX11-010", as: "breedingTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("triggerBase").permanentId,
        instanceId: s.inst("masterTyrannomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ryutaro").isSuspended);
    expect(s.state.players[0]!.breeding).toBeDefined();
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-001");
    expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "EX11-010")).toBe(true);
    expect(s.perm("ryutaro").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not hatch for a level-4 destination", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: ["BT1-001"],
          battleArea: [
            { card: "EX11-008", as: "triggerBase" },
            { card: "EX11-056", as: "ryutaro" },
          ],
          hand: [{ card: "EX11-009", as: "levelFour" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("triggerBase").permanentId,
        instanceId: s.inst("levelFour").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("triggerBase").topCard.cardId === "EX11-009");
    expect(s.perm("ryutaro").isSuspended).toBe(false);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-056", as: "ryutaro", faceUp: false }] },
      1: { battleArea: [{ card: "BT1-080", as: "attacker", dp: 20_000 }], security: ["BT1-013"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-056"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("encodes the Q5909 destination filter as Tyrannomon OR Dinosaur and targets breeding exactly", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const subTrigger = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
    expect(subTrigger).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      sourceFilter: { controller: "mine", kind: ["Digimon"] },
      digivolveIntoFilter: {
        levelComparison: { op: "gte", value: 5 },
        nameOrTrait: [
          { tokens: ["Tyrannomon"], match: "name" },
          { tokens: ["Dinosaur"], match: "trait", orPrevious: true },
        ],
      },
      actions: [
        { kind: "Hatch", cost: { kind: "suspend" }, abortOnDecline: true },
        { kind: "Digivolve", target: { filter: { zone: "breeding" } }, payCost: false },
      ],
    });
  });
});
