import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST17-05 Gargomon", () => {
  it("grants one of your Digimon Jamming when it becomes suspended on your turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST17-05", as: "gargomon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenSuspended", {
      suspendedPermanentId: s.perm("gargomon").permanentId,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("gargomon").permanentId, "Jamming"));

    expect(observe(s.engine).hasKeyword(s.perm("gargomon").permanentId, "Jamming")).toBe(true);
  });

  it("gives its suspended host +1000 DP through the inherited effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST17-04", as: "host", suspended: true, under: ["ST17-05"] }] },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(5000);
  });
});
