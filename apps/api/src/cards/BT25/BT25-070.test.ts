import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_070 } from "./BT25-070.js";

describe("BT25-070 Logamon", () => {
  it("matches the complete catalog, App Fusion, evolution, link, and printed effect contract", () => {
    expect(getCardDefinition("BT25-070")).toMatchObject({
      nameEn: "Logamon",
      colors: ["Black", "Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 6000,
      evoCosts: [
        { color: "Black", level: 3, memoryCost: 3 },
        { color: "Purple", level: 3, memoryCost: 3 },
      ],
      forms: ["Sup.", "Appmon"],
      attributes: ["Social"],
      types: ["Logoff"],
      linkDp: 3000,
      linkRequirement: "[Link] [Appmon] trait: Cost 2",
      linkEffect: "[When Linking] 1 of your opponent's Digimon or Tamers can't unsuspend until their turn ends.",
      dualEffect: "Logamon",
    });
    expect(BT25_070.appFusionRequirement).toEqual([{ names: ["Offmon", "Hackmon"], cost: 0 }]);
  });

  it("maps the once-per-turn Link and self-link deletion clauses exactly", () => {
    const main = BT25_070.effects?.find((entry) => entry.trigger === "Main");
    expect(main).toMatchObject({ frequency: "OncePerTurn" });
    expect(main?.actions?.[0]).toMatchObject({
      kind: "Link",
      from: ["trash", "digivolutionCards"],
      costDelta: -1,
      optional: true,
      target: {
        filter: {
          controller: "mine",
          kind: ["Digimon"],
          hasLinkRequirement: true,
          hostFilter: { isSelfRef: true },
          nameOrTrait: [{ tokens: ["Social", "Tool", "Game"], match: "trait" }],
        },
        count: 1,
      },
    });
    const yourTurn = BT25_070.effects?.find((entry) => entry.trigger === "YourTurn");
    expect(yourTurn).toMatchObject({ frequency: "OncePerTurn" });
    expect(yourTurn?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      on: { filter: { isSelfRef: true } },
    });
    expect((yourTurn?.actions?.[0] as { actions?: unknown[] }).actions?.[0]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
    });
  });

  it("links a valid Social Digimon from trash for zero net cost and deletes only play-cost 4 or less", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-070", as: "logamon" }],
          trash: [
            { card: "BT21-009", as: "link" },
            { card: "BT21-041", as: "secondLink" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT25-079", as: "cheap" },
            { card: "BT25-081", as: "expensive" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("logamon"));

    expect(s.perm("logamon").linked.map((card) => card.instanceId)).toContain(s.inst("link").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondLink").instanceId);
    expect(s.state.memory).toBe(1); // printed Link cost 1 reduced by 1
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT25-081"]);

    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("logamon"));
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("secondLink").instanceId);
  });

  it("accepts a valid Link card from this Logamon's stack, but never another Digimon's stack", async () => {
    const valid = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-070", as: "logamon", under: [{ card: "BT21-009", as: "stackLink" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await valid.ready();
    await advance(valid.engine).fire(EffectTiming.OnDeclaration, valid.perm("logamon"));
    expect(valid.perm("logamon").linked.map((card) => card.instanceId)).toContain(valid.inst("stackLink").instanceId);
    expect(valid.perm("logamon").stack).toHaveLength(0);

    const wrongHost = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-070", as: "logamon" },
            { card: "BT25-071", as: "other", under: [{ card: "BT21-009", as: "wrongStack" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await wrongHost.ready();
    await advance(wrongHost.engine).fire(EffectTiming.OnDeclaration, wrongHost.perm("logamon"));
    expect(wrongHost.perm("logamon").linked).toHaveLength(0);
    expect(wrongHost.perm("other").stack.map((card) => card.instanceId)).toContain(
      wrongHost.inst("wrongStack").instanceId,
    );
  });

  it("rejects a trait-looking card without its own Link requirement (Q6367)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-070", as: "logamon" }],
          trash: [{ card: "BT21-005", as: "noLink" }], // Social attribute, but a Digi-Egg with no <Link>
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnDeclaration, s.perm("logamon"));
    expect(s.perm("logamon").linked).toHaveLength(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("noLink").instanceId);
  });

  it("applies Logamon's printed When Linking unsuspend restriction to one opposing Digimon or Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT21-009", as: "host" }],
          hand: [{ card: "BT25-070", as: "logamonLink" }],
        },
        1: {
          battleArea: [
            { card: "BT25-081", as: "opponentDigimon" },
            { card: "BT1-087", as: "otherTamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("logamonLink").instanceId,
        targetPermanentId: s.perm("host").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("host").linked.some((card) => card.cardId === "BT25-070") &&
        observe(s.engine).hasRestriction(s.perm("opponentDigimon"), "unsuspend"),
    );

    expect(s.perm("host").linked.map((card) => card.cardId)).toEqual(["BT25-070"]);
    expect(s.state.memory).toBe(0); // printed Link cost 2
    expect(observe(s.engine).hasRestriction(s.perm("opponentDigimon"), "unsuspend")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("otherTamer"), "unsuspend")).toBe(false);
  });
});
