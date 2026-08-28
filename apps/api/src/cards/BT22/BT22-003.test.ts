import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./BT22-003.js";

describe("BT22-003 Tapmon", () => {
  it("reduces one opposing Digimon by 2000 when its inherited host gets linked", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT21-009", under: ["BT22-003"], as: "host" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const originalDp = s.perm("opponent").currentDP;

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => s.perm("opponent").currentDP === originalDp - 2000);

    expect(s.perm("opponent").currentDP).toBe(originalDp - 2000);
  });

  it("does not trigger for another stack, on the opponent's turn, or twice in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-009", under: ["BT22-003"], as: "host" },
            { card: "BT21-009", as: "otherHost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    const originalDp = s.perm("opponent").currentDP;

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("otherHost").permanentId,
    });
    expect(s.perm("opponent").currentDP).toBe(originalDp);

    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    await settle(() => s.perm("opponent").currentDP === originalDp - 2000);
    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("opponent").currentDP).toBe(originalDp - 2000);

    s.state.turnSeat = 1;
    await advance(s.engine).fireSubTrigger("whenLinked", {
      subjectPermanentId: s.perm("host").permanentId,
    });
    expect(s.perm("opponent").currentDP).toBe(originalDp - 2000);
  });
});
