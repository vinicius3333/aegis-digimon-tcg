import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT21-009.js";
import "../index.js";

describe("BT21-009 Gatchmon", () => {
  it("encodes every Digivolve, Link, linked Raid, and linked-trigger clause", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 2, traits: ["Appmon", "Hero"], cost: 0, isAlternate: true },
    ]);
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isLinked: true,
        keywords: [{ keyword: "Raid", raw: "＜Raid＞" }],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenLinked",
            sourceFilter: { isSelfRef: true },
            actions: [
              expect.objectContaining({
                kind: "PlayWithoutCost",
                from: ["hand"],
                payCost: false,
                optional: true,
                condition: expect.objectContaining({ kind: "permanentCount", seat: "mine", op: "lte", value: 1 }),
              }),
            ],
          },
        ],
      }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it.each([
    ["zero", []],
    ["one", ["BT1-085"]],
  ])("plays Haru for free when this stack gets linked with %s existing Tamers", async (_label, tamers) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "gatchmon", under: ["BT21-005"] },
            ...tamers.map((card, index) => ({ card, as: `tamer${index}` })),
          ],
          hand: [{ card: "BT21-084", as: "haru" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenLinked", { subjectPermanentId: s.perm("gatchmon").permanentId });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT21-084"));
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("does not play Haru with two Tamers or when another Digimon gets linked", async () => {
    const twoTamers = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "gatchmon" },
            { card: "BT1-085", as: "first" },
            { card: "BT1-087", as: "second" },
          ],
          hand: [{ card: "BT21-084", as: "haru" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await twoTamers.ready();
    await advance(twoTamers.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: twoTamers.perm("gatchmon").permanentId,
    });
    expect(twoTamers.state.players[0]!.hand).toHaveLength(1);

    const other = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", as: "gatchmon" },
            { card: "BT21-018", as: "other" },
          ],
          hand: [{ card: "BT21-084", as: "haru" }],
        },
      },
      { autoDeclineOptional: true },
    );
    await other.ready();
    await advance(other.engine).fireSubTrigger("whenLinked", { subjectPermanentId: other.perm("other").permanentId });
    expect(other.state.players[0]!.hand).toHaveLength(1);
  });

  it("may decline and plays at most one Haru across repeated link events", async () => {
    const declined = setupEngine(
      { 0: { battleArea: [{ card: "BT21-009", as: "gatchmon" }], hand: [{ card: "BT21-084", as: "haru" }] } },
      { autoDeclineOptional: true },
    );
    await declined.ready();
    await advance(declined.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: declined.perm("gatchmon").permanentId,
    });
    expect(declined.state.players[0]!.hand).toHaveLength(1);

    const once = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "gatchmon" }],
          hand: [
            { card: "BT21-084", as: "firstHaru" },
            { card: "BT21-084", as: "secondHaru" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await once.ready();
    await advance(once.engine).fireSubTrigger("whenLinked", { subjectPermanentId: once.perm("gatchmon").permanentId });
    await advance(once.engine).fireSubTrigger("whenLinked", { subjectPermanentId: once.perm("gatchmon").permanentId });
    expect(once.state.players[0]!.hand).toHaveLength(1);
  });

  it("links to an Appmon for 1 memory, adds 2000 DP, and grants Raid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-018", as: "host" }],
          hand: [{ card: "BT21-009", as: "link" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;
    await s.ready();
    const beforeDP = s.perm("host").currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").linked.some((card) => card.instanceId === s.inst("link").instanceId));
    expect(s.state.memory).toBe(4);
    expect(s.perm("host").currentDP).toBe(beforeDP + 2000);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Raid")).toBe(true);
  });
});
