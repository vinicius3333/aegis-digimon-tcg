import { auditEffectlessDigimon } from "./effectlessAudit.testkit.js";
import { compiled } from "./BT9-060.js";

auditEffectlessDigimon({
  cardId: "BT9-060",
  expected: {
    cardId: "BT9-060",
    nameEn: "Grizzlymon",
    colors: ["Black"],
    kinds: ["Digimon"],
    level: 4,
    playCost: 5,
    dp: 5000,
    evoCosts: [{ color: "Black", level: 3, memoryCost: 1 }],
    forms: ["Champion"],
    attributes: ["Vaccine"],
    types: ["Beast"],
  },
  compiled,
  validBase: "BT9-057",
  invalidBase: "BT9-019",
});
