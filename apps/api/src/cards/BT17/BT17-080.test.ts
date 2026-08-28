import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-080.js";
import "./index.js";

describe("BT17-080 Takato Matsuki", () => {
  it("gains memory for a Guilmon, Growlmon, or Gallantmon Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: { nameOrTrait: [{ tokens: ["Guilmon", "Growlmon", "Gallantmon"], match: "name" }] },
          },
        },
      ],
    });
  });

  it("optionally evolves a Guilmon into Gallantmon for free after placing all three Trash cards", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { nameOrTrait: [{ tokens: ["Guilmon"], match: "name" }] } },
          into: { nameOrTrait: [{ tokens: ["Gallantmon"], match: "name" }] },
          from: ["hand"],
          payCost: false,
          ignoreRequirements: true,
          optional: true,
          abortOnDecline: true,
          cost: { kind: "place", destination: "digivolutionStack", position: "bottom" },
          additionalCosts: [
            {
              kind: "place",
              target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["Growlmon"], match: "name" }] } },
            },
            {
              kind: "place",
              target: { from: ["trash"], filter: { nameOrTrait: [{ tokens: ["WarGrowlmon"], match: "name" }] } },
            },
          ],
        },
      ],
    });
  });

  it("plays itself from Security without paying its cost", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false, target: { isSelf: true } }],
    });
  });

  it("naturally plays from Security and gains memory at main-phase start", async () => {
    const security = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-063", as: "attacker" }] },
        1: { security: [{ card: "BT17-080", as: "securityTakato" }] },
      },
      { autoSelectCards: true },
    );
    security.state.turnSeat = 0;
    await security.ready();
    expect(
      security.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: security.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => security.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT17-080"));
    expect(security.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT17-080")).toBe(true);

    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-080", as: "takato" }, { card: "ST7-03", as: "guilmon" }] },
      1: { battleArea: [{ card: "BT17-063" }] },
    });
    s.state.memory = 0;
    s.state.turnSeat = 0;
    await s.ready();
    await advance(s.engine).runTurn(0);
    expect(
      s.events.some(
        (event) =>
          event.kind === "memoryChanged" &&
          "reason" in event &&
          event.reason === "gainMemory" &&
          event.from === 0 &&
          event.to === 1,
      ),
    ).toBe(true);
  });

  it("naturally places Takato, Growlmon, and WarGrowlmon before free-evolving Guilmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-080", as: "takato" },
            { card: "BT17-008", as: "guilmon" },
          ],
          hand: [{ card: "BT17-016", as: "gallantmon" }],
          trash: [
            { card: "BT17-010", as: "growlmon" },
            { card: "BT17-013", as: "warGrowlmon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).runTurn(0);
    await settle(() => s.perm("guilmon").topCard.cardId === "BT17-016");

    expect(s.perm("guilmon").topCard.cardId).toBe("BT17-016");
    expect(s.perm("guilmon").stack.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT17-008", "BT17-080", "BT17-010", "BT17-013"]),
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT17-080")).toBe(false);
  });

  it("leaves the three required cards and Guilmon unchanged when the optional evolution is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT17-080", as: "takato" },
            { card: "BT17-008", as: "guilmon" },
          ],
          hand: [{ card: "BT17-016", as: "gallantmon" }],
          trash: ["BT17-010", "BT17-013"],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).runTurn(0);

    expect(s.perm("guilmon").topCard.cardId).toBe("BT17-008");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT17-080")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("gallantmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.filter((card) => ["BT17-010", "BT17-013"].includes(card.cardId))).toHaveLength(2);
  });
});
