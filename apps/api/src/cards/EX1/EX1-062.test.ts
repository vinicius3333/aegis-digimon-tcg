import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT2/BT2-105.js";
import "./EX1-062.js";

describe("EX1-062 SkullGreymon", () => {
  it("has Security Attack +1, deletes itself after attacking, then may play exactly Agumon from trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-062", as: "skull" }], trash: [{ card: "BT1-010", as: "agumon" }] },
        1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("skull"), "SecurityAttack")).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT1-010"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-062")).toBe(false);
    expect(s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT1-010")?.isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("can play Agumon from its own stack after deleting itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "EX1-062",
              as: "skull",
              under: [{ card: "BT1-010", as: "stackAgumon" }],
            },
          ],
        },
        1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const stackAgumonId = s.inst("stackAgumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === stackAgumonId),
    );

    expect(
      s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.instanceId === stackAgumonId)?.isSuspended,
    ).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === stackAgumonId)).toBe(false);
  });

  it("does not resolve End of Attack after Spider Shooter de-digivolves it during security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-062", as: "skull", under: [{ card: "BT2-071", as: "wizard" }] }],
          trash: [{ card: "BT1-010", as: "agumon" }],
        },
        1: { security: ["BT2-105"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("skull").topCard.cardId === "BT2-071");

    expect(s.perm("skull").topCard.cardId).toBe("BT2-071");
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "EX1-062")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-010")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-010")).toBe(false);
  });

  it("only plays the specifically named Agumon, not Agumon Expert or Bond of Bravery", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-062", as: "skull" }],
          trash: [
            { card: "BT1-011", as: "expert" },
            { card: "BT6-018", as: "bond" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("expert").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("bond").instanceId)).toBe(true);
  });

  it("may decline playing Agumon from the trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX1-062", as: "skull" }], trash: [{ card: "BT1-010", as: "agumon" }] },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("skull").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("agumon").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
