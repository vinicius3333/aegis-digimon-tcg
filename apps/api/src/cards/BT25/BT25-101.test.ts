import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

const CARD_ID = "BT25-101";

function primitives(s: ReturnType<typeof setupEngine>): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT25-101 Divine Arms Version Ω", () => {
  it("pays the TS cost, draws 2, and links only a Link-capable TS trash card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-075", as: "vulcanus" }],
          hand: [
            { card: CARD_ID, as: "option" },
            { card: "BT25-020", as: "handCost" },
          ],
          trash: [
            { card: "BT25-100", as: "linkableTs" },
            { card: "BT25-020", as: "nonLinkTs" },
          ],
          deck: [
            { card: "AD1-001", as: "drawOne" },
            { card: "AD1-002", as: "drawTwo" },
          ],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
        preferOptionIndex: 1,
      },
    );
    preferred.push(s.inst("handCost").instanceId, s.inst("linkableTs").instanceId, s.perm("vulcanus").permanentId);
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("vulcanus").linked.some((card) => card.instanceId === s.inst("linkableTs").instanceId));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("drawOne").instanceId, s.inst("drawTwo").instanceId]),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("handCost").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("nonLinkTs").instanceId);
    expect(s.perm("vulcanus").linked.map((card) => card.instanceId)).not.toContain(s.inst("nonLinkTs").instanceId);
  });

  it("links this Option to a breeding-area Digimon without paying its Link cost (Q6478/Q6480)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-091", as: "tsTamer" }],
          breeding: { card: "BT25-020", as: "breedingHost" },
          hand: [
            { card: CARD_ID, as: "option" },
            { card: "BT25-020", as: "handCost" },
          ],
          deck: ["AD1-001", "AD1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("handCost").instanceId, s.perm("breedingHost").permanentId);
    const optionId = s.inst("option").instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingHost").linked.some((card) => card.instanceId === optionId));
    expect(s.state.players[0]!.breeding?.permanentId).toBe(s.perm("breedingHost").permanentId);
  });

  it("does no Draw or link when its TS hand-trash cost can't be paid (Q6475)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-075", as: "vulcanus" }],
        hand: [{ card: CARD_ID, as: "option" }],
        deck: [{ card: "AD1-001", as: "top" }, "AD1-002"],
      },
    });
    s.state.memory = 3;
    await s.ready();
    const deckIds = s.state.players[0]!.deck.map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
        useAs: "option",
      } as never),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckIds);
    expect(s.perm("vulcanus").linked).toHaveLength(0);
  });

  it("activates the same Main body from Security", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 20000 }] },
        1: {
          battleArea: [{ card: "BT25-075", as: "vulcanus" }],
          hand: [{ card: "BT25-020", as: "handCost" }],
          security: [{ card: CARD_ID, as: "securityOption" }],
          deck: ["AD1-001", "AD1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("handCost").instanceId, s.perm("vulcanus").permanentId);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.perm("vulcanus").linked.some((card) => card.instanceId === s.inst("securityOption").instanceId),
    );
    expect(s.state.players[1]!.hand).toHaveLength(2);
  });

  it("trashes Piercing before tied battle deletion settles, preventing a Piercing check (Q6481)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT25-075",
              as: "vulcanus",
              linked: [
                { card: CARD_ID, as: "divineArms" },
                { card: "BT26-010", as: "piercingLink" },
              ],
            },
          ],
        },
        1: {
          battleArea: [{ card: "BT25-020", as: "equalDpOpponent", suspended: true }],
          security: [{ card: "AD1-001", as: "security" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("piercingLink").instanceId);
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("vulcanus"), "Piercing")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("vulcanus").permanentId,
        target: { kind: "permanent", permanentId: s.perm("equalDpOpponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("vulcanus").permanentId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("piercingLink").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("vulcanus"), "Piercing")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("grants its linked keywords to the host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-075", as: "vulcanus", linked: [{ card: CARD_ID, as: "linked" }] }] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("vulcanus"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("vulcanus"), "Reboot")).toBe(true);
  });

  it("does not protect a non-Vulcanusmon host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT25-020", as: "marsmon", linked: [{ card: CARD_ID, as: "linked" }] }] },
    });
    await s.ready();
    const permanentId = s.perm("marsmon").permanentId;

    expect(await primitives(s).deletePermanent([permanentId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === permanentId)).toBe(false);
  });
});
