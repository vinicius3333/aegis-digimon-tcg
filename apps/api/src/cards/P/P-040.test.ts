import { memoryBoostTests } from "./memoryBoostTestSupport.js";
import "./P-040.js";

// audit-cases: 4
memoryBoostTests({
  cardId: "P-040",
  name: "Purple Memory Boost!",
  colorSource: "BT10-079",
  matchingDigimon: "BT10-079",
  offColorDigimon: "BT1-009",
});
