import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-054.js";
import "../index.js";

const CARD_ID = "EX10-054";

describe("EX10-054 VenomMyotismon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Green"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 4 },
        { color: "Green", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Dark Animal"],
    });
  });

  it("proves trash-main cost reduction, independent target choices, mandatory restriction tail, and deletion", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Main")).toMatchObject({
      isFromTrash: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { isSelf: true },
          from: ["trash"],
          payCost: true,
          reduceCostBy: 7,
          cost: {
            kind: "deleteOwn",
            target: { filter: { controller: "mine", kind: ["Digimon"], levels: [5] }, count: 1 },
          },
        },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Suspend",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
            optional: true,
          },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2 },
            restriction: "unsuspend",
            duration: "untilOpponentTurnEnd",
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", suspended: true, kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("Q5137 activates from trash, deletes a level-5 Myotismon-text Digimon, and plays for 5", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-047", as: "cost" }],
          trash: [{ card: CARD_ID, as: "venom" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as unknown as { mainPhase: { isOpen: boolean } }).mainPhase;
    await settle(() => mainPhase.isOpen);
    await s.engine.recomputeContinuousEffects();
    const [entry] = JSON.parse(s.inst("venom").activatableEffectsJson || "[]") as Array<{ effectKey: string }>;
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.inst("venom").instanceId,
        effectKey: entry!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("venom").instanceId),
    );
    expect(s.events).toContainEqual({ kind: "memoryChanged", from: 5, to: 0, reason: "playCard" });
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    if (mainPhase.isOpen) s.engine.applyIntent(0, { type: "endPhase" });
    await turn;
  });

  it("Q5138 independently suspends 2 and restricts 2 opposing Digimon or Tamers", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "venom" }] },
        1: {
          battleArea: [
            { card: "EX10-040", as: "first" },
            { card: "EX10-043", as: "second" },
            { card: "EX10-065", as: "third" },
            { card: "EX10-064", as: "fourth" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(
      s.perm("first").permanentId,
      s.perm("second").permanentId,
      s.perm("third").permanentId,
      s.perm("fourth").permanentId,
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("venom"));
    expect(s.state.players[1]!.battleArea.filter(({ isSuspended }) => isSuspended)).toHaveLength(2);
    expect(
      s.state.players[1]!.battleArea.filter((permanent) => observe(s.engine).isRestricted(permanent, "unsuspend")),
    ).toHaveLength(2);
  });

  it("On Deletion deletes only an opposing suspended Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "venom" }] },
        1: {
          battleArea: [
            { card: "EX10-040", as: "suspended", suspended: true },
            { card: "EX10-040", as: "standing" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("standing").permanentId, s.perm("suspended").permanentId);
    await s.ready();
    const suspendedId = s.perm("suspended").permanentId;
    const standingId = s.perm("standing").permanentId;
    await advance(s.engine).verb.deletePermanent([s.perm("venom").permanentId], "byEffect");
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === suspendedId));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(standingId);
  });
});
