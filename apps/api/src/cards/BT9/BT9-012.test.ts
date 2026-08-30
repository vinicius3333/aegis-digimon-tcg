import { getCardDefinition, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST1/ST1-16.js";
import { compiled } from "./BT9-012.js";

describe("BT9-012 Greymon (X Antibody)", () => {
  it("matches the complete catalog, replacement, and alternate evolution IR", () => {
    expect(getCardDefinition("BT9-012")).toMatchObject({
      cardId: "BT9-012",
      nameEn: "Greymon (X Antibody)",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dinosaur", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      effects: [
        {
          trigger: "AllTurns",
          isInherited: true,
          actions: [
            {
              kind: "Replacement",
              event: "wouldLeavePlay",
              mode: "prevent",
              leaveCause: "byEffect",
              optional: true,
              sourceFilter: { isSelfRef: true },
              condition: {
                kind: "selfHasNameContaining",
                names: ["Greymon", "Omnimon"],
              },
              cost: {
                kind: "trash",
                target: { filter: { zone: "digivolutionCards", isSelfRef: true, sameLevelPair: true }, count: 2 },
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Greymon"], cost: 0, isAlternate: true }],
    });
  });

  it("uses Q1803/Q1804 on a legal stack to prevent a public Gaia Force deletion", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-001", as: "host" },
          hand: [
            { card: "BT9-008", as: "agumon" },
            { card: "BT1-015", as: "greymon" },
            { card: "BT9-012", as: "greymonX" },
            { card: "BT1-021", as: "metalGreymon" },
          ],
        },
        1: { battleArea: [{ card: "BT9-007", as: "redSource" }], hand: [{ card: "ST1-16", as: "gaiaForce" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    for (const alias of ["agumon", "greymon"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("host").permanentId,
          instanceId: s.inst(alias).instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("host").topCard.instanceId === s.inst(alias).instanceId);
    }
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("greymonX").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT9-012");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT1-021");
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.breeding === undefined);
    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    s.state.memory = 8;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("gaiaForce").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-001", "BT9-008"]);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-015", "BT9-012"]),
    );
  });

  it("prevents effect-driven return to hand and deck with the same-level cost", async () => {
    for (const destination of ["hand", "deck"] as const) {
      const s = setupEngine(
        { 0: { battleArea: [{ card: "BT9-015", as: "host", under: ["BT9-012", "BT1-016"] }] } },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      const topId = s.perm("host").topCard.instanceId;
      if (destination === "hand") await advance(s.engine).verb.returnToHand([topId]);
      else await advance(s.engine).verb.returnToDeck([topId], { toTop: false });
      expect(s.state.players[0]!.battleArea).toHaveLength(1);
      expect(s.state.players[0]!.trash).toHaveLength(2);
    }
  });

  it("does not let one inherited replacement protect a neighboring matching Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT9-015", as: "protected", under: ["BT9-012", "BT1-016"] },
            { card: "BT1-021", as: "neighbor", under: ["BT1-016", "BT1-016"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent(
      [s.perm("protected").permanentId, s.perm("neighbor").permanentId],
      "byEffect",
    );
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([
      s.perm("protected").permanentId,
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(5);
  });

  it("does not prevent rule deletion even when the same-level cost is available", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT9-015", as: "host", under: ["BT9-012", "BT1-016"] }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byRule");
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });

  it("requires both a matching host name and two sources sharing a level", async () => {
    for (const battleArea of [
      [{ card: "BT9-015", as: "host", under: ["BT9-012", "BT1-010"] }],
      [{ card: "BT1-028", as: "host", under: ["BT9-012", "BT1-016"] }],
    ]) {
      const s = setupEngine({ 0: { battleArea } }, { autoAcceptOptional: true, autoSelectCards: true });
      await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
    }
  });

  it("may decline prevention and leave its digivolution cards unpaid", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT9-015", as: "host", under: ["BT9-012", "BT1-016"] }] },
    });
    const deleting = advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    await new Promise((resolve) => setTimeout(resolve, 0));
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await deleting;
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(3);
  });
});
