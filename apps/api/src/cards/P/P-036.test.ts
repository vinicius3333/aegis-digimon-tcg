import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import "./P-036.js";

// audit-cases: 4
memoryBoostTests({
  cardId: "P-036",
  name: "Blue Memory Boost!",
  colorSource: "BT1-027",
  matchingDigimon: "BT1-027",
  offColorDigimon: "BT1-009",
});
