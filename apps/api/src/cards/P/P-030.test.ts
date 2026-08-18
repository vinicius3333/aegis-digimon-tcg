import { describe, expect, it } from "vitest";
import { EffectTiming, type Seat } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-030.js";

async function driveTurn(
  s: ReturnType<typeof setupEngine>,
  seat: Seat,
  duringMain: () => Promise<void>,
): Promise<void> {
  const turn = s.engine.runOneTurn();
  const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
  await settle(() => mainPhase.isOpen, 600);
  expect(mainPhase.isOpen).toBe(true);
  await duringMain();
  expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
  await turn;
}

describe("P-030 Lobomon", () => {
  it("can decline the optional AncientGarurumon digivolution without scheduling deletion", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-027", as: "base" }],
        hand: [
          { card: "P-030", as: "lobomon" },
          { card: "BT4-114", as: "ancient" },
        ],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("lobomon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("P-030");
    expect(decision.kind).toBe("optional");

    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "optional", accept: false },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("base").topCard.cardId).toBe("P-030");
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("ancient").instanceId)).toBe(true);
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("base"));
    expect(s.state.players[0]!.battleArea.some((permanent) =>
      permanent.permanentId === s.perm("base").permanentId
    )).toBe(true);
  });

  it("digivolves into AncientGarurumon for exactly 1 memory, ignoring requirements", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-027", as: "base" }],
          hand: [
            { card: "P-030", as: "lobomon" },
            { card: "BT4-114", as: "ancient" },
          ],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("ancient").instanceId);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lobomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-114");

    expect(s.perm("base").topCard?.cardId).toBe("BT4-114");
    expect(s.state.memory).toBe(7); // Lobomon costs 2, its effect digivolution costs 1.
  });

  it("deletes that Digimon at end of turn even after it digivolves again (Q4141)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-027", as: "base" }],
          hand: [
            { card: "P-030", as: "lobomon" },
            { card: "BT4-114", as: "ancient" },
            { card: "BT5-086", as: "omnimon" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
        },
      },
      {
        autoSelectCards: true,
        autoAcceptOptional: true,
        autoChooseOption: true,
        autoOrderTriggers: true,
      },
    );
    s.state.memory = 10;
    const permanentId = s.perm("base").permanentId;

    await driveTurn(s, 0, async () => {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId,
          instanceId: s.inst("lobomon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT4-114");

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId,
          instanceId: s.inst("omnimon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "BT5-086");
    });

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT5-086")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT4-114")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "P-030")).toBe(true);
  });

  it("its inherited effect reduces a normal AncientGarurumon digivolution cost by 2", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-011", as: "base", under: ["P-030"] }],
        hand: [{ card: "BT4-114", as: "ancient" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ancient").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-114");

    expect(s.state.memory).toBe(7); // Printed cost 5, reduced by 2.
  });

  it("does not reduce an unrelated digivolution from its inherited host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-025", as: "host", under: ["P-030"] }],
        hand: [{ card: "BT5-086", as: "omnimon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("host").permanentId,
      instanceId: s.inst("omnimon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT5-086");

    expect(s.state.memory).toBe(6);
  });
});
