import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-016.js";

describe("BT23-016 Dokamon", () => {
  it("matches the catalog and carries its main, evolution, Link, DP, and linked-effect clauses", () => {
    expect(getCardDefinition("BT23-016")).toMatchObject({
      cardId: "BT23-016",
      nameEn: "Dokamon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Stnd.", "Appmon"],
      attributes: ["Game"],
      types: ["Action"],
      effectText:
        "[Digivolve] Lv.2 w/[Appmon]\u00a0trait: Cost 0 \n\n[Your Turn] [Once Per Turn] When this Digimon gets linked, if you have 1 or fewer Tamers, you may play 1 [Eri Karan] from your hand without paying the cost.",
      linkDp: 2000,
      linkEffect: "[When Linking] ＜Draw 1＞",
      linkRequirement: "[Link] [Appmon]\u00a0trait: Cost 1",
    });
    const watcher = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(watcher).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: { controller: "mine", nameOrTrait: [{ tokens: ["Eri Karan"], match: "name" }] },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              condition: {
                kind: "permanentCount",
                op: "lte",
                value: 1,
                filter: { controllerDefault: "mine", kind: ["Tamer"] },
              },
              optional: true,
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "WhenLinking")).toMatchObject({
      isLinked: true,
      actions: [{ kind: "Draw", amount: 1, controller: "mine" }],
    });
    expect(compiled.linkRequirement).toEqual([{ traits: ["Appmon"], cost: 1 }]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("links to an Appmon for 1, contributes exactly 2000 DP, and draws exactly 1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT21-009", as: "host" }],
        hand: [{ card: "BT23-016", as: "dokamon" }],
        deck: [{ card: "BT1-009", as: "drawn" }, "BT1-009"],
      },
    });
    s.state.memory = 5;
    const baseDp = s.perm("host").currentDP;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("dokamon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.state.memory).toBe(4);
    expect(s.perm("host").currentDP).toBe(baseDp + 2000);
    expect(s.perm("host").linked.map((card) => card.instanceId)).toContain(s.inst("dokamon").instanceId);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("plays Eri Karan for free at the exact one-Tamer boundary when Dokamon gets linked", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-016", as: "dokamon" },
            { card: "BT1-085", as: "existingTamer" },
          ],
          hand: [
            { card: "BT23-007", as: "link" },
            { card: "BT23-079", as: "eri" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("dokamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("eri").instanceId),
    );

    expect(s.state.memory).toBe(4);
    expect(
      s.state.players[0]!.battleArea.filter(
        (permanent) =>
          permanent.topCard && getCardDefinition(permanent.topCard.cardId)?.kinds.includes("Tamer" as never),
      ),
    ).toHaveLength(2);
  });

  it("does not offer Eri with two Tamers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-016", as: "dokamon" },
            { card: "BT1-085", as: "firstTamer" },
            { card: "BT23-086", as: "secondTamer" },
          ],
          hand: [
            { card: "BT23-007", as: "firstLink" },
            { card: "BT23-079", as: "eri" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("firstLink").instanceId,
        targetPermanentId: s.perm("dokamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("dokamon").linked.some((card) => card.instanceId === s.inst("firstLink").instanceId));
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eri").instanceId);
    expect(s.state.memory).toBe(4);
  });

  it("allows the optional Eri play to be refused", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-016", as: "dokamon" }],
          hand: [
            { card: "BT23-007", as: "link" },
            { card: "BT23-079", as: "eri" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("link").instanceId,
        targetPermanentId: s.perm("dokamon").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("eri").instanceId);
    expect(s.state.memory).toBe(4);
  });

  it("rejects linking to a non-Appmon without spending memory or moving Dokamon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host" }], hand: [{ card: "BT23-016", as: "dokamon" }] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("dokamon").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: false, reason: "link-requirement-unmet" });
    expect(s.state.memory).toBe(5);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("dokamon").instanceId);
    expect(s.perm("host").linked).toHaveLength(0);
  });

  it("digivolves for 0 from an off-color level-2 Appmon and rejects an off-color non-Appmon", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT21-005", as: "base" }],
        hand: [{ card: "BT23-016", as: "dokamon" }],
        deck: ["BT1-009"],
      },
    });
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("dokamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.instanceId === legal.inst("dokamon").instanceId);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT23-002", as: "base" }], hand: [{ card: "BT23-016", as: "dokamon" }] },
    });
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("dokamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
