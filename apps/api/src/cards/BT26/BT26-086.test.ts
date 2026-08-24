import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT26-086.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-086 compiled behavior", () => {
  it("proves Assembly, Link +6, intrinsic keywords, and the link-then-attack windows", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.assemblyRequirement).toEqual([
      { reduceCost: 7, materials: [{ kinds: ["Digimon"], traits: ["Seven Code"], count: 7, differentNames: true }] },
    ]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")?.keywords).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keyword: "Rush" }),
        expect.objectContaining({ keyword: "Reboot" }),
        expect.objectContaining({ keyword: "Blocker" }),
        expect.objectContaining({ keyword: "Link", amount: 6 }),
      ]),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toEqual([
        expect.objectContaining({
          kind: "Link",
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
          target: expect.objectContaining({
            count: 7,
            upTo: true,
            filter: expect.objectContaining({
              hasLinkRequirement: true,
              hostFilter: { isSelfRef: true },
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            }),
          }),
        }),
        expect.objectContaining({ kind: "Attack", withoutSuspending: true, optional: true }),
      ]);
    }
  });

  it("rejects Seven Code PAD as an Assembly material because the header requires Digimon cards", () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-086", as: "dantemon" }],
        trash: [
          { card: "BT26-010", as: "first" },
          { card: "BT26-019", as: "second" },
          { card: "BT26-028", as: "third" },
          { card: "BT26-037", as: "fourth" },
          { card: "BT26-051", as: "fifth" },
          { card: "BT26-063", as: "sixth" },
          { card: "BT26-102", as: "option" },
        ],
      },
    });
    s.state.memory = 20;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("dantemon").instanceId,
        assembly: {
          materialInstanceIds: ["first", "second", "third", "fourth", "fifth", "sixth", "option"].map(
            (alias) => s.inst(alias).instanceId,
          ),
        },
      } as never),
    ).toEqual({ ok: false, reason: "invalid-material" });
  });

  it("keeps the different-name and seven-link conditional seams explicit", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions[0]).toMatchObject({
      differentNames: true,
    });
    expect(compiled.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "Delete", optional: true },
            {
              kind: "SecurityManipulation",
              op: "moveTopToBottom",
              condition: { kind: "selfLinkCountAtLeast", value: 7 },
            },
          ],
        },
      ],
    });
  });

  it("links only Appmon cards from this Digimon's own digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-086", as: "dantemon", under: [{ card: "BT26-010", as: "ownSource" }] },
            { card: "BT1-084", as: "neighbor", under: [{ card: "BT26-019", as: "otherSource" }] },
          ],
        },
        1: { security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("dantemon"));

    expect(s.perm("dantemon").linked.map(({ cardId }) => cardId)).toEqual(["BT26-010"]);
    expect(s.perm("neighbor").stack.map(({ cardId }) => cardId)).toEqual(["BT26-019"]);
  });

  it("deletes an opposing Digimon and moves its security top card when seven links are present", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT26-086",
              as: "dantemon",
              linked: [
                { card: "BT26-010" },
                { card: "BT26-019" },
                { card: "BT26-028" },
                { card: "BT26-037" },
                { card: "BT26-051" },
                { card: "BT26-063" },
                { card: "BT26-084" },
              ],
            },
          ],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "victim" }],
          security: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.perm("dantemon").linked.push(...s.state.players[0]!.trash.splice(0));
    expect(s.perm("dantemon").linked).toHaveLength(7);

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("dantemon").permanentId,
    });

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-002", "BT1-001"]);
  });
});
