import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-067.js";

describe("EX11-067 Dokuson Aruba", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-067")).toMatchObject({
      nameEn: "Dokuson Aruba",
      colors: ["Purple", "Yellow"],
      kinds: ["Tamer"],
      playCost: 5,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "Digivolve",
        target: {
          filter: {
            or: [{ zone: "battleArea" }, { zone: "breeding" }],
            nameOrTrait: [{ tokens: ["Lucemon"], match: "text" }],
          },
        },
        from: ["hand", "trash"],
        payCost: false,
      },
    ]);
  });

  it("sets memory to 3 at the start of your turn from 2 or less", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-067", as: "dokuson" }], deck: ["BT1-009"] },
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

  it("leaves memory unchanged at the start of your turn when it is already 3", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-067", as: "dokuson" }], deck: ["BT1-009"] },
      1: { deck: ["BT1-010"] },
    });
    s.state.memory = 3;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("publicly digivolves a battle-area Lucemon-text Digimon and gains memory (Q5935/Q5937)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX11-067", as: "dokuson" },
            { card: "BT18-101", as: "satanMode" },
          ],
          battleArea: [{ card: "AD1-018", as: "lucemonInText" }],
          deck: ["AD1-001"],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dokuson").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("dokuson").isSuspended);
    expect(s.perm("lucemonInText").topCard?.cardId).toBe("BT18-101");
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("publicly digivolves a Lucemon-named Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX11-067", as: "dokuson" }],
          battleArea: [{ card: "AD1-018", as: "lucemonInText" }],
          trash: [{ card: "BT18-101", as: "chaosMode" }],
          deck: ["AD1-001"],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dokuson").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("lucemonInText").topCard?.cardId === "BT18-101");
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("chaosMode").instanceId)).toBe(
      false,
    );
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("rejects a non-Lucemon source and permits declining a valid free digivolution", async () => {
    const invalid = setupEngine({
      0: {
        hand: [
          { card: "EX11-067", as: "dokuson" },
          { card: "BT18-101", as: "candidate" },
        ],
        battleArea: [{ card: "BT1-009", as: "notLucemon" }],
        deck: ["AD1-001"],
      },
      1: { deck: ["BT1-010"] },
    });
    invalid.state.memory = 5;
    expect(invalid.engine.applyIntent(0, { type: "playCard", instanceId: invalid.inst("dokuson").instanceId })).toEqual(
      { ok: true },
    );
    await settle(() => invalid.state.pendingDecision === undefined);
    expect(invalid.perm("notLucemon").topCard?.cardId).toBe("BT1-009");
    expect(
      invalid.state.players[0]!.hand.some(({ instanceId }) => instanceId === invalid.inst("candidate").instanceId),
    ).toBe(true);
    expect(invalid.state.memory).toBe(0);
    assertNoLoudGap(invalid);

    const declined = setupEngine(
      {
        0: {
          hand: [
            { card: "EX11-067", as: "dokuson" },
            { card: "BT18-101", as: "candidate" },
          ],
          battleArea: [{ card: "AD1-018", as: "lucemonInText" }],
          deck: ["AD1-001"],
        },
        1: { deck: ["BT1-010"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    declined.state.memory = 5;
    expect(
      declined.engine.applyIntent(0, { type: "playCard", instanceId: declined.inst("dokuson").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.pendingDecision === undefined);
    expect(declined.perm("lucemonInText").topCard?.cardId).toBe("AD1-018");
    expect(
      declined.state.players[0]!.hand.some(({ instanceId }) => instanceId === declined.inst("candidate").instanceId),
    ).toBe(true);
    expect(declined.state.memory).toBe(0);
    assertNoLoudGap(declined);
  });

  it("publicly digivolves a breeding-area Lucemon without firing the watcher (Q5933/Q5934/Q5936)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX11-067", as: "dokuson" },
            { card: "BT18-082", as: "chaosMode" },
          ],
          breeding: { card: "BT18-034", as: "breedingLucemon" },
          deck: ["AD1-001"],
        },
        1: { deck: ["BT1-010"], battleArea: [{ card: "BT1-080", as: "victim" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dokuson").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("breedingLucemon").topCard?.cardId === "BT18-082");
    expect(s.perm("dokuson").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("victim").permanentId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("plays itself from security through a public security check", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-067", as: "dokuson", faceUp: false }] },
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
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "EX11-067"));
    expect(s.state.players[0]!.security).toHaveLength(0);
    assertNoLoudGap(s);
  });
});
