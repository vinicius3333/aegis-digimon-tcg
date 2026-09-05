import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT18/BT18-077.js";
import "../ST15/ST15-15.js";
import "./EX1-063.js";

describe("EX1-063 VenomMyotismon", () => {
  it("has Retaliation and once per turn may play a purple level-4 Retaliation Digimon from trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-063", as: "venom" }], trash: [{ card: "EX1-056", as: "played" }] },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("venom"), "Retaliation")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venom").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-056"));
    expect(s.state.players[0]!.trash.some((c) => c.cardId === "EX1-056")).toBe(false);
  });

  it("suppresses the played Digimon's On Play effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-063", as: "venom" }],
          trash: [{ card: "BT18-077", as: "kaiserLeomon" }],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "levelFour" }],
          security: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venom").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("kaiserLeomon").instanceId,
      ),
    );

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("levelFour").permanentId),
    ).toBe(true);
  });

  it("does not treat an inherited-only Retaliation clause as a playable Retaliation card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-063", as: "venom" }], trash: [{ card: "BT12-076", as: "inheritedOnly" }] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venom").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT12-076")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT12-076")).toBe(false);
  });

  it("does not play a level-5 Retaliation Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-063", as: "venom" }], trash: [{ card: "BT11-084", as: "tooHigh" }] },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venom").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tooHigh").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT11-084")).toBe(false);
  });

  it("may decline the optional Retaliation play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-063", as: "venom" }], trash: [{ card: "EX1-056", as: "candidate" }] },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venom").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("candidate").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX1-056")).toBe(false);
  });

  it("enforces once per turn across two attacks by the same VenomMyotismon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-063", as: "venom" },
            { card: "BT1-085", as: "tai" },
          ],
          hand: [{ card: "ST15-15", as: "unsuspendOption" }],
          trash: [
            { card: "EX1-056", as: "first" },
            { card: "EX1-057", as: "second" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("venom").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venom").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.phase === Phase.Main &&
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "EX1-056"),
    );

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspendOption").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.phase === Phase.Main && !s.perm("venom").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("venom").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("second").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("second").instanceId)).toBe(true);
  });
});
