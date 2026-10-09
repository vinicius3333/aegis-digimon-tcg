import { describeRemainingCollectionAuditContract } from "./collection-audit-contract.js";
import "./index.js";

describeRemainingCollectionAuditContract({
  runtimeProofs: [
    { set: "RB1", cardIds: ["RB1-029"], testFile: "RB1-029.test.ts" },
    { set: "EX3", cardIds: ["EX3-012"], testFile: "EX3-012.test.ts" },
    { set: "EX3", cardIds: ["EX3-035", "BT16-014"], testFile: "EX3-035.test.ts" },
    { set: "EX4", cardIds: ["EX4-032", "EX4-033", "EX4-034"], testFile: "EX4-alliance-watchers.test.ts" },
    { set: "ST20", cardIds: ["ST20-14", "ST19-10"], testFile: "ST20-14.test.ts" },
    {
      set: "ST12",
      cardIds: ["ST12-01", "ST12-04", "ST12-06", "ST12-08", "ST12-10", "ST12-12", "ST12-15"],
      testFile: "jesmon-starter-mixed-deck.test.ts",
    },
  ],
});
