import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX11-057.js";
import "../EX9/EX9-015.js";

describe("EX11-057 Suzune Kazuki", () => {
  it("preserves the printed dual-color Tamer and complete compiled coverage", () => {
    expect(getCardDefinition("EX11-057")).toMatchObject({
      nameEn: "Suzune Kazuki",
      colors: ["Blue", "Yellow"],
      kinds: ["Tamer"],
      playCost: 4,
      types: ["LIBERATOR"],
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("gains memory at the natural start of its main phase when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-057", as: "suzune" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.memory = 2;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.memory === 3);
    expect(s.state.memory).toBe(3);
    await loop;
  });

  it("plays itself from a real security check without paying its cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "EX11-057", as: "securitySuzune" }] },
      1: { battleArea: [{ card: "BT1-037", as: "attacker" }], security: [] },
    });
    s.state.turnSeat = 1;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-057")).toBe(true);
    await loop;
  });

  it("pays the All Turns watcher when a public inherited effect trashes an opponent stack card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-057", as: "suzune" },
            { card: "BT1-037", as: "attacker", under: ["EX9-015"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", under: ["BT1-013"] }], security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0 && s.perm("suzune").isSuspended);
    expect(s.perm("suzune").isSuspended).toBe(true);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("does not pay the watcher when its suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-057", as: "suzune" },
            { card: "BT1-037", as: "attacker", under: ["EX9-015"] },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", under: ["BT1-013"] }], security: [] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("suzune").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("trashes one freely chosen source per Ice-Snow Digimon across opposing stacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["EX11-014", "EX11-015"],
          hand: [{ card: "EX11-057", as: "suzune" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", under: ["BT1-013"], as: "first" },
            { card: "BT1-011", under: ["BT1-014"], as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suzune").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").stack.length === 0 && s.perm("second").stack.length === 0);

    expect(s.perm("first").stack).toHaveLength(0);
    expect(s.perm("second").stack).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("trashes exactly one source with a single Ice-Snow Digimon and none with a near-miss trait", async () => {
    const s = setupEngine(
      {
        0: {
          // EX11-015 has [Ice-Snow]; BT1-011's [Dinosaur] is the non-matching control.
          battleArea: ["EX11-015", "BT1-011"],
          hand: [{ card: "EX11-057", as: "suzune" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", under: ["BT1-013"], as: "first" },
            { card: "BT1-011", under: ["BT1-014"], as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suzune").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").stack.length + s.perm("second").stack.length === 1);

    expect(s.perm("first").stack.length + s.perm("second").stack.length).toBe(1);
    assertNoLoudGap(s);
  });

  it("trashes nothing when no Ice-Snow Digimon is on the board", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT1-011"], hand: [{ card: "EX11-057", as: "suzune" }] },
        1: { battleArea: [{ card: "BT1-010", under: ["BT1-013"], as: "first" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("suzune").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 60);

    expect(s.perm("first").stack).toHaveLength(1);
    assertNoLoudGap(s);
  });

  it("publishes exclusive full IR with pooled scaling and the paid opponent-source watcher", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions).toMatchObject([
      {
        kind: "TrashDigivolution",
        target: { filter: { controller: "opponent", digivolutionCards: "hasAny" }, count: "all" },
        amount: 1,
        scope: "acrossDigimon",
        choose: true,
      },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions).toMatchObject([
      {
        kind: "SubTrigger",
        event: "whenDigivolutionTrashed",
        sourceFilter: { controller: "opponent", kind: ["Digimon"] },
        actions: [{ kind: "GainMemory", cost: { kind: "suspend" }, abortOnDecline: true }],
      },
    ]);
  });
});
