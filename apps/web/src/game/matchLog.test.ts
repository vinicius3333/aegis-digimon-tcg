import type { ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { translator } from "../i18n";
import { buildMatchLog } from "./matchLog";

const kakkinmon = {
  seat: 1 as const,
  sourceCardId: "P-245",
  sourceInstanceId: "s1-52",
  sourcePermanentId: "perm-1",
  effectKey: "P-245/ir-3-0",
  description: "[End of All Turns] [Once Per Turn] By suspending 1 of your black Digimon with ＜Blocker＞, ...",
  timing: "OnEndTurn",
  isInherited: true as const,
};

const craniamonSweep = {
  seat: 1 as const,
  sourceCardId: "EX13-062",
  sourceInstanceId: "s1-31",
  sourcePermanentId: "perm-1",
  effectKey: "subtrigger/opt/s1-31/printed/EX13-062",
  description: "[All Turns] [Once Per Turn] When this Digimon suspends, you may delete ...",
  timing: "whenSuspended",
};

// Production match 6b32b755, turn 5, seq 226-232, plus the no-target sweep the fix announces.
const endOfTurnEvents: ServerEvent[] = [
  { kind: "effectTriggered", ...kakkinmon, printedTiming: "EndOfAllTurns" },
  { kind: "cardsMoved", instanceIds: ["perm-1"], from: "unsuspended", to: "suspended" },
  { kind: "cardsMoved", instanceIds: ["s1-26"], from: "deck", to: "hand", handAddition: "draw", seat: 1 },
  { kind: "effectResolved", ...kakkinmon },
  { kind: "effectHadNoEffect", ...craniamonSweep },
];

const chronologicalLog = (events: readonly ServerEvent[]) =>
  buildMatchLog(events, 1, new Map([["perm-1", "EX13-062"]]), translator("en"))
    .map((line) => line.text)
    .reverse();

describe("match log effect lifecycle", () => {
  it("names the activating effect before its results (Discord 1557481090870939840)", () => {
    expect(chronologicalLog(endOfTurnEvents).slice(0, 4)).toEqual([
      "Kakkinmon's effect activated",
      "Craniamon moved: unsuspended → suspended",
      "1 card moved: deck → hand",
      "Kakkinmon's effect resolved",
    ]);
  });

  it("says a triggered effect with no legal target had no effect (Discord 1557481090870939840)", () => {
    expect(chronologicalLog(endOfTurnEvents).slice(4)).toEqual(["Craniamon's effect had no effect"]);
  });

  it("does not repeat a [Main] activation as a receipt after its own lifecycle (Discord 1557481090870939840)", () => {
    const main = { ...kakkinmon, sourceCardId: "BT1-085", effectKey: "BT1-085/main", description: "[Main] ..." };
    expect(
      chronologicalLog([
        { kind: "effectTriggered", ...main },
        { kind: "effectResolved", ...main },
        { kind: "effectActivated", ...main, receiptOnly: true },
      ]),
    ).toEqual(["Tai Kamiya's effect activated", "Tai Kamiya's effect resolved"]);
  });
});
