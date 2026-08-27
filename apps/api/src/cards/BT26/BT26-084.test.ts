import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { irNode } from "../../engine/testkit/irNode.js";
import { compiled } from "./BT26-084.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT26-084 compiled behavior", () => {
  it("proves Appmon evolution/link, Detach, once-per-turn linked reveal, and Digimon play branch", () => {
    expect(getCardDefinition("BT26-084")).toMatchObject({
      nameEn: "Copipemon",
      colors: ["White"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 4,
      dp: 4000,
      types: ["Copy & Paste (App Name)", "Seven Code"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 3 }]);
    expect(compiled.keywords).toEqual([{ keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }]);
    expect(compiled.effects.find((effect) => effect.trigger === "WhenLinking")).toMatchObject({
      isLinked: true,
      actions: [
        {
          kind: "Link",
          from: ["trash"],
          payCost: false,
          optional: true,
          recipient: { isSelf: true },
          target: {
            filter: {
              excludeColors: ["White"],
              levelComparison: { op: "lte", value: 4 },
              hasLinkRequirement: true,
              nameOrTrait: [
                { tokens: ["System"], match: "trait" },
                { tokens: ["Seven Code"], match: "trait" },
              ],
            },
            count: 1,
          },
        },
      ],
    });
    const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn")!;
    expect(yourTurn).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckTopOrBottom" }],
        },
      ],
    });
    expect(irNode(yourTurn.actions[0]!).actions[0]!.add[0]).toMatchObject({
      to: "play",
      costDelta: 3,
      optional: true,
      filter: { kind: ["Digimon", "Option"], nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }] },
      orDispositions: [{ filter: { kind: ["Option"] }, to: "useOption" }],
    });
    expect(irNode(yourTurn.actions[0]!).actions[0]!.add).toHaveLength(1);
  });

  it("digivolves from an Appmon level 2 for 0 and links to an Appmon for 3", async () => {
    const evolution = setupEngine({
      0: {
        battleArea: [{ card: "BT26-007", as: "appmon" }],
        hand: [{ card: "BT26-084", as: "copipemon" }],
        deck: ["BT1-001"],
      },
    });
    await evolution.ready();
    expect(
      evolution.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: evolution.perm("appmon").permanentId,
        instanceId: evolution.inst("copipemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => evolution.perm("appmon").topCard.cardId === "BT26-084");
    expect(evolution.state.memory).toBe(0);

    const linking = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT26-084", as: "copipemon" }],
      },
    });
    linking.state.memory = 3;
    await linking.ready();
    expect(
      linking.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: linking.inst("copipemon").instanceId,
        targetPermanentId: linking.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => linking.perm("host").linked.length === 1);
    expect(linking.state.memory).toBe(0);
    expect(linking.perm("host").linked[0]).toMatchObject({
      instanceId: linking.inst("copipemon").instanceId,
      faceUp: true,
    });
  });

  it("Q7125 links only an eligible card with Link text from trash through its linked face", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-079", as: "host" }],
          hand: [{ card: "BT26-084", as: "copipemon" }],
          trash: [
            { card: "BT26-019", as: "eligible" },
            { card: "BT26-102", as: "noLinkText" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("eligible").instanceId);
    s.state.memory = 3;
    await s.ready();
    expect(observe(s.engine).linkMaxDelta(s.perm("host"))).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("copipemon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 2);

    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("copipemon").instanceId, s.inst("eligible").instanceId]),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("noLinkText").instanceId);
  });

  it("may decline Copipemon's optional link-from-trash effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT24-079", as: "host" }],
          hand: [{ card: "BT26-084", as: "copipemon" }],
          trash: [{ card: "BT26-019", as: "eligible" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("copipemon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.length === 1);

    expect(s.perm("host").linked.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("copipemon").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("eligible").instanceId);
  });

  it("selects only one Seven Code card when both a Digimon and Option are revealed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "copipemon", linked: [{ card: "BT26-102" }] }],
          deck: ["BT26-010", "BT26-102", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("copipemon").permanentId });

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT26-010")).toBe(true);
    expect(s.state.players[0]!.deck.some(({ cardId }) => cardId === "BT26-102")).toBe(true);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-102")).toBe(false);
  });

  it("uses a revealed Seven Code Option instead of trying to play it as a permanent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "copipemon", linked: [{ card: "BT26-102" }] }],
          deck: ["BT26-102", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 4;

    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("copipemon").permanentId });

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-102")).toBe(true);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("reveals three linked-trigger cards and plays a revealed Seven Code Digimon for 3 less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "copipemon", linked: [{ card: "BT26-102", as: "pad" }] }],
          deck: ["BT26-010", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("copipemon").permanentId,
    });

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT26-010")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
  });

  it("triggers its reveal from a real link to Copipemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "copipemon" }],
          hand: [{ card: "BT26-010", as: "linkCard" }],
          deck: [{ card: "BT26-019", as: "revealed" }, "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linkCard").instanceId,
        targetPermanentId: s.perm("copipemon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "BT26-019"));

    expect(s.perm("copipemon").linked.map(({ instanceId }) => instanceId)).toContain(s.inst("linkCard").instanceId);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT26-019");
  });

  it("uses the linked reveal only once per turn and never on the opponent's turn", async () => {
    const yourTurn = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "copipemon" }],
          deck: ["BT26-010", "BT26-019", "BT26-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await yourTurn.ready();

    await advance(yourTurn.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: yourTurn.perm("copipemon").permanentId,
    });
    await advance(yourTurn.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: yourTurn.perm("copipemon").permanentId,
    });

    expect(yourTurn.state.players[0]!.battleArea.filter(({ topCard }) => topCard.cardId !== "BT26-084")).toHaveLength(
      1,
    );
    expect(yourTurn.state.players[0]!.deck).toHaveLength(2);

    const opponentsTurn = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "copipemon" }],
          deck: ["BT26-010", "BT26-019", "BT26-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    opponentsTurn.state.turnSeat = 1;
    await opponentsTurn.ready();

    await advance(opponentsTurn.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: opponentsTurn.perm("copipemon").permanentId,
    });

    expect(opponentsTurn.state.players[0]!.battleArea).toHaveLength(1);
    expect(opponentsTurn.state.players[0]!.deck).toHaveLength(3);
  });

  it("uses Detach to trash a linked Seven Code card and survive equal-DP battle deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-084", as: "copipemon", dp: 4000, linked: [{ card: "BT26-019", as: "link" }] }],
        },
        1: { battleArea: [{ card: "BT26-019", as: "defender", dp: 4000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("copipemon"), "Detach")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("copipemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(
      s.perm("copipemon").permanentId,
    );
    expect(s.perm("copipemon").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("link").instanceId);
  });

  it("Q7127 resolves Seven Code PAD and draws the digivolution bonus from the unrevealed deck", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-084", as: "copipemon" },
            { card: "BT26-010", as: "host" },
          ],
          hand: [
            { card: "BT26-019", as: "mailmon" },
            { card: "BT26-086", as: "dantemon" },
          ],
          trash: [
            { card: "BT26-028", as: "material1" },
            { card: "BT26-037", as: "material2" },
            { card: "BT26-051", as: "material3" },
            { card: "BT26-063", as: "material4" },
            { card: "BT26-028", as: "material5" },
          ],
          deck: ["BT26-102", "BT1-001", "BT1-002", { card: "BT1-003", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT1-010", as: "deleteTarget" },
            { card: "BT1-089", as: "restrictionTarget" },
          ],
          security: ["BT1-004"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        autoOrderCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(
      s.perm("host").permanentId,
      s.perm("deleteTarget").permanentId,
      s.inst("copipemon").instanceId,
      s.inst("mailmon").instanceId,
      s.inst("material1").instanceId,
      s.inst("material2").instanceId,
      s.inst("material3").instanceId,
      s.inst("material4").instanceId,
      s.inst("material5").instanceId,
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("mailmon").instanceId,
        targetPermanentId: s.perm("copipemon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.cardId === "BT26-086", 2000);
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ cardId }) => cardId === "BT1-003") &&
        s.state.players[1]!.security.length === 0,
      2000,
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("host").linked.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063"]),
    );
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-003");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-102");
  });

  it("Q7128 drops Mailmon's pending linked face after PAD moves it under another Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-084", as: "copipemon" },
            { card: "BT26-010", as: "host" },
          ],
          hand: [{ card: "BT26-019", as: "mailmon" }],
          trash: [
            { card: "BT26-028", as: "material1" },
            { card: "BT26-037", as: "material2" },
            { card: "BT26-051", as: "material3" },
            { card: "BT26-063", as: "material4" },
            { card: "BT26-028", as: "material5" },
          ],
          deck: ["BT26-102", "BT1-001", "BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-089", as: "restrictionTarget" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        autoOrderCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferred,
      },
    );
    preferred.push(
      s.perm("host").permanentId,
      s.inst("mailmon").instanceId,
      s.inst("material1").instanceId,
      s.inst("material2").instanceId,
      s.inst("material3").instanceId,
      s.inst("material4").instanceId,
      s.inst("material5").instanceId,
    );
    s.state.memory = 7;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("mailmon").instanceId,
        targetPermanentId: s.perm("copipemon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").stack.some(({ cardId }) => cardId === "BT26-019"), 2000);

    expect(s.perm("copipemon").topCard.cardId).toBe("BT26-084");
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063"]),
    );
    expect(observe(s.engine).isRestricted(s.perm("restrictionTarget"), "suspend")).toBe(false);
  });
});
