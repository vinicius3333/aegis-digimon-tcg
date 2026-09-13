import "../ST1/ST1-10.js";
import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-041.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";

describe("BT13-041 Chirinmon", () => {
  it("keeps Barrier and plays inherited Kudamon suspended", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Barrier" })],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          suspended: true,
          optional: true,
          target: {
            filter: { controller: "mine", nameOrTrait: [{ match: "nameExact", tokens: ["Kudamon"] }] },
            count: 1,
          },
        },
      ],
    });
  });

  it("exposes Barrier on the live Chirinmon permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-041", as: "chirin" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("chirin"), "Barrier")).toBe(true);
  });

  it("Barrier trashes the exact top security card and prevents deletion when accepted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT13-041", as: "chirin" }],
        security: [{ card: "BT1-009", as: "top-security" }],
      },
      1: { battleArea: [{ card: "ST1-10", as: "phoenix", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("chirin").permanentId,
        target: { kind: "permanent", permanentId: s.perm("phoenix").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("chirin").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("top-security").instanceId)).toBe(
      true,
    );
  });

  it("the inherited deletion effect plays Kudamon from trash suspended and for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-045", as: "host", under: ["BT13-041"] }],
          trash: [{ card: "BT13-034", as: "kudamon" }],
        },
        1: { battleArea: [{ card: "ST1-10", as: "phoenix", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("phoenix").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT13-034"));
    const played = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT13-034")!;
    expect(played.isSuspended).toBe(true);
    expect(s.state.memory).toBe(before);
  });

  it("the inherited deletion effect may play Kudamon from hand and may be declined", async () => {
    for (const accept of [true, false]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT13-045", as: "host", under: ["BT13-041"] }],
            hand: [{ card: "BT13-034", as: "kudamon" }],
          },
          1: { battleArea: [{ card: "ST1-10", as: "phoenix", suspended: true }] },
        },
        accept ? { autoAcceptOptional: true, autoSelectCards: true } : { autoDeclineOptional: true },
      );
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("host").permanentId,
          target: { kind: "permanent", permanentId: s.perm("phoenix").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT13-034")).toBe(accept);
      expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT13-034")).toBe(!accept);
    }
  });

  it("does not offer the inherited play for a non-Kudamon card", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-045", as: "host", under: ["BT13-041"] }], hand: ["BT13-036"] },
        1: { battleArea: [{ card: "ST1-10", as: "phoenix", suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "permanent", permanentId: s.perm("phoenix").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("digivolves from a yellow level 4 for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-038", as: "base" }], hand: [{ card: "BT13-041", as: "chirin" }] },
    });
    s.state.memory = 4;
    const evolutionMaterialId1 = s.perm("base").topCard!.instanceId;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").stack.some((card) => card.instanceId === evolutionMaterialId1));
    expect(s.perm("base").stack.map((card) => card.instanceId)).toContain(evolutionMaterialId1);
    await settle(() => s.perm("base").topCard.cardId === "BT13-041");
    expect(s.state.memory).toBe(1);
  });
});
