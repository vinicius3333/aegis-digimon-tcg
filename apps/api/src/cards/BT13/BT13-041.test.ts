import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-041.js";
import { advance } from "../../engine/testkit/advance.js";
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
          target: { filter: { controller: "mine", nameOrTrait: [{ match: "name", tokens: ["Kudamon"] }] }, count: 1 },
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
        security: [{ card: "BT1-001", as: "top-security" }],
      },
    });
    await s.ready();
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("chirin").permanentId]);
    await settle(() => s.events.some(({ kind }) => kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("chirin").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await deletion;

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(
      s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("top-security").instanceId),
    ).toBe(true);
  });

  it("the inherited deletion effect plays Kudamon from trash suspended and for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-045", as: "host", under: ["BT13-041"] }],
          trash: [{ card: "BT13-034", as: "kudamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const before = s.state.memory;
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
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
        },
        accept ? { autoAcceptOptional: true, autoSelectCards: true } : { autoDeclineOptional: true },
      );
      await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT13-034")).toBe(accept);
      expect(s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT13-034")).toBe(!accept);
    }
  });

  it("does not offer the inherited play for a non-Kudamon card", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT13-045", as: "host", under: ["BT13-041"] }], hand: ["BT13-036"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("digivolves from a yellow level 4 for exactly 3 memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-038", as: "base" }], hand: [{ card: "BT13-041", as: "chirin" }] },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirin").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT13-041");
    expect(s.state.memory).toBe(1);
  });
});
