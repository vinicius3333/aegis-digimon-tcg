import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import "./P-037.js";

// audit-cases: 4
memoryBoostTests({
  cardId: "P-037",
  name: "Yellow Memory Boost!",
  colorSource: "BT1-045",
  matchingDigimon: "BT1-045",
  offColorDigimon: "BT1-009",
});
