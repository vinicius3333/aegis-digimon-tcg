import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX3-046.js";

const decoyText =
  "＜Decoy ([D-Brigade])＞ (When one of your other Digimon with [D-Brigade] in its traits would be deleted by an opponent's effect, you may delete this Digimon to prevent that deletion.)";

describe("EX3-046 Commandramon", () => {
  it("has the official metadata and digivolves from a black level 2 for 0", async () => {
    expect(getCardDefinition("EX3-046")).toMatchObject({
      cardId: "EX3-046",
      nameEn: "Commandramon",
      colors: ["Black"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Cyborg", "D-Brigade"],
      rarity: "C",
    });
    const s = setupEngine({
      0: {
        breeding: { card: "EX3-002", as: "base" },
        hand: [{ card: "EX3-046", as: "commandramon" }],
        deck: ["BT1-002"],
      },
    });
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("commandramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX3-046");

    expect(s.state.memory).toBe(1);
    expect(s.perm("base").topCard.cardId).toBe("EX3-046");
  });

  it("exposes the printed D-Brigade Decoy keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX3-046", as: "commandramon" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("commandramon"), "Decoy")).toBe(true);
    expect([...s.perm("commandramon").keywords]).toContain("Decoy");
  });

  it("deletes itself to prevent an opponent-effect deletion of another D-Brigade Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-046", as: "decoy" },
            { card: "EX3-049", as: "protected" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const protectedId = s.perm("protected").permanentId;

    await advance(s.engine).verb.deletePermanent([protectedId], "byEffect");
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "EX3-046"));

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-046")).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX3-046");
  });

  it("can decline Decoy through the public decision and lets the protected Digimon be deleted", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-046", as: "decoy" },
          { card: "EX3-049", as: "target" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const targetId = s.perm("target").permanentId;

    const deletion = advance(s.engine).verb.deletePermanent([targetId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    expect(s.decisions.at(-1)?.req).toMatchObject({
      kind: "selectCards",
      sourceCardId: "EX3-046",
      promptText: "＜Decoy＞: excluir este Digimon para impedir que o outro Digimon seja excluído?",
      options: { timing: "Static", effectText: decoyText, min: 0, max: 1 },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await deletion;

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX3-046")).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === targetId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("EX3-049");
  });

  it("does not protect an unrelated trait, itself, a battle loss, or its controller's own effect", async () => {
    for (const scenario of ["unrelated", "self", "battle", "ownEffect"] as const) {
      const s = setupEngine({
        0: {
          battleArea: [
            { card: "EX3-046", as: "decoy" },
            ...(scenario === "self" ? [] : [{ card: scenario === "unrelated" ? "BT1-028" : "EX3-049", as: "target" }]),
          ],
        },
      });
      s.state.turnSeat = scenario === "ownEffect" ? 0 : 1;
      await s.ready();
      const targetId = scenario === "self" ? s.perm("decoy").permanentId : s.perm("target").permanentId;

      await advance(s.engine).verb.deletePermanent([targetId], scenario === "battle" ? "byBattle" : "byEffect");
      await settle();

      expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === targetId)).toBe(false);
      expect(s.decisions).toHaveLength(0);
    }
  });

  it("two copies independently protect two D-Brigade Digimon and each is paid only once", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX3-046", as: "firstDecoy" },
            { card: "EX3-046", as: "secondDecoy" },
            { card: "EX3-049", as: "firstTarget" },
            { card: "BT4-063", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;

    await advance(s.engine).verb.deletePermanent([firstTargetId], "byEffect");
    await settle(() => s.state.players[0]!.trash.filter(({ cardId }) => cardId === "EX3-046").length === 1);
    await advance(s.engine).verb.deletePermanent([secondTargetId], "byEffect");
    await settle(() => s.state.players[0]!.trash.filter(({ cardId }) => cardId === "EX3-046").length === 2);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === firstTargetId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === secondTargetId)).toBe(true);
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId === "EX3-046")).toHaveLength(2);
    expect(s.decisions.filter(({ req }) => req.sourceCardId === "EX3-046")).toHaveLength(2);
  });

  it("offers every eligible Decoy copy and deletes only the one selected", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX3-046", as: "plainDecoy" },
          { card: "EX3-046", under: ["EX3-002"], as: "stackedDecoy" },
          { card: "EX3-049", as: "protected" },
        ],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const protectedId = s.perm("protected").permanentId;
    const plainId = s.perm("plainDecoy").permanentId;
    const stackedId = s.perm("stackedDecoy").permanentId;
    const stackedTopId = s.perm("stackedDecoy").topCard.instanceId;

    const deletion = advance(s.engine).verb.deletePermanent([protectedId], "byEffect");
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.at(-1)!.req;
    const options = request.options!;
    expect(options.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("plainDecoy").topCard.instanceId, stackedTopId]),
    );
    expect(options.candidateInstanceIds).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [stackedTopId] },
      }),
    ).toEqual({ ok: true });
    await deletion;

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === protectedId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === plainId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === stackedId)).toBe(false);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["EX3-046", "EX3-002"]),
    );
  });
});
