import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "../P/P-107.js";

const DECK = Array.from({ length: 8 }, () => "BT1-010");

function digivolveIntoWarGreymon(s: EngineSetup) {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm("agumon").permanentId,
    instanceId: s.inst("wargreymon").instanceId,
  });
}

async function runYourTurn(s: EngineSetup): Promise<void> {
  await s.ready();
  expect(s.inst("wargreymon").digivolveTargetPermanentIds).toContain(s.perm("agumon").permanentId);
  expect(digivolveIntoWarGreymon(s)).toEqual({ ok: true });
}

async function expectNoPermission(s: EngineSetup): Promise<void> {
  await s.ready();
  expect(s.inst("wargreymon").digivolveTargetPermanentIds).not.toContain(s.perm("agumon").permanentId);
  expect(digivolveIntoWarGreymon(s)).toMatchObject({ ok: false });
}

describe("ST20-10 Agumon", () => {
  it("digivolves into WarGreymon for 4 when the opponent has 10000 DP or more", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-10", as: "agumon" }],
          hand: [{ card: "ST20-11", as: "wargreymon" }],
          deck: DECK,
        },
        1: { battleArea: [{ card: "ST2-10" }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 6;
    await runYourTurn(s);
    await settle(() => s.perm("agumon").topCard.cardId === "ST20-11");
    expect(s.perm("agumon").topCard.cardId).toBe("ST20-11");
    expect(s.perm("agumon").stack).toHaveLength(1);
    expect(s.state.memory).toBe(2);
  });

  it("also digivolves when three distinct Tamer colors satisfy the alternate branch", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-10", as: "agumon" }, "ST20-12", "BT21-102"],
          hand: [{ card: "ST20-11", as: "wargreymon" }],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 6;
    await runYourTurn(s);
    await settle(() => s.perm("agumon").topCard.cardId === "ST20-11");
    expect(s.perm("agumon").topCard.cardId).toBe("ST20-11");
    expect(s.state.memory).toBe(2);
  });

  it("does not digivolve when neither condition is satisfied", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-10", as: "agumon" }],
          hand: [{ card: "ST20-11", as: "wargreymon" }],
          deck: DECK,
        },
        1: { battleArea: [{ card: "BT1-009", dp: 9000 }], deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 6;

    await expectNoPermission(s);

    expect(s.perm("agumon").topCard.cardId).toBe("ST20-10");
    expect(observe(s.engine).keywordAmount(s.perm("agumon"), "Reboot")).toBe(0);
  });

  it("exposes inherited Reboot on a real evolved host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST20-11", as: "wargreymon", under: ["ST20-10"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("wargreymon"), "Reboot")).toBe(true);
  });
});

describe("ST20-10 Agumon — KB Q&A rulings", () => {
  function setupAgumon(tamers: string[]) {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-10", as: "agumon" }, ...tamers],
          hand: [{ card: "ST20-11", as: "wargreymon" }],
          deck: DECK,
        },
        1: { deck: DECK },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 6;
    return s;
  }

  it("treats 4 total Tamer colors as meeting '3 or more total colors' (Q4456)", async () => {
    const s = setupAgumon(["ST20-12", "ST20-13"]);
    await runYourTurn(s);
    await settle(() => s.perm("agumon").topCard.cardId === "ST20-11");
    expect(s.perm("agumon").stack.map((card) => card.cardId)).toEqual(["ST20-10"]);
    expect(s.state.memory).toBe(2);
  });

  it("counts a color shared by two Tamers once, so 2 total colors fall short of 3 (Q4456)", async () => {
    const s = setupAgumon(["ST20-12", "ST20-12"]);
    await expectNoPermission(s);
    expect(s.perm("agumon").topCard.cardId).toBe("ST20-10");
  });

  it("combines its permission with Defense Training's digivolve effect and its -2 cost (Q5203)", async () => {
    async function delayDigivolve(opponentDp: number) {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "ST20-10", as: "agumon" },
              { card: "P-107", as: "defenseTraining" },
            ],
            hand: [{ card: "ST20-11", as: "wargreymon" }],
            deck: DECK,
          },
          1: { battleArea: [{ card: "BT1-009", dp: opponentDp }], deck: DECK },
        },
        { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
      );
      s.state.turnCount = 2;
      s.state.memory = 10;
      await s.ready();
      const [ability] = JSON.parse(s.perm("defenseTraining").activatableEffectsJson) as { effectKey: string }[];
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: s.inst("defenseTraining").instanceId,
          effectKey: ability!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.trash.length > 0);
      await settle();
      return s;
    }

    const permitted = await delayDigivolve(10000);
    expect(permitted.perm("agumon").topCard.instanceId).toBe(permitted.inst("wargreymon").instanceId);
    expect(permitted.perm("agumon").stack.map((card) => card.cardId)).toEqual(["ST20-10"]);
    expect(permitted.state.memory).toBe(8);

    const blocked = await delayDigivolve(9000);
    expect(blocked.perm("agumon").topCard.cardId).toBe("ST20-10");
    expect(blocked.state.players[0]!.hand.map((card) => card.instanceId)).toContain(
      blocked.inst("wargreymon").instanceId,
    );
  });
});
