import { CardKind, CardInstance, Permanent, Zone, getCardDefinition, type GameState, type Seat } from "@aegis/shared";
import { loadDeckInto, setSecurityStack, type Decklist } from "./setup.js";
import {
  clearBattleArea,
  clearZone,
  insertCard,
  linkCard,
  placePermanent,
  pushOnStack,
  setBreeding,
  setTopCard,
} from "./state/access.js";

type FieldCard = { card: string; under?: string[]; linked?: string[]; faceDownUnder?: boolean; suspended?: boolean };
type PlayerLayout = {
  deck?: string[];
  field?: FieldCard[];
  breeding?: FieldCard;
  hand?: string[];
  trash?: string[];
  security?: string[];
  faceUpSecurity?: boolean;
};
type Layout = { players: readonly [PlayerLayout, PlayerLayout]; memory?: number };

// Reduced boards for reported issues. Each runs in the ordinary turn loop.
const ISSUE_LAYOUTS = {
  "arena-tai-matt-double-end-turn": {
    memory: 3,
    players: [
      { field: [{ card: "BT17-081" }, { card: "BT17-081" }, { card: "AD1-025", under: ["BT22-026"] }] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-issue-5254-examon-dna": {
    memory: 3,
    players: [
      { field: [{ card: "EX13-041" }, { card: "EX13-021" }], hand: ["BT20-045"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-issue-5258-plesiomon-optional-attack": {
    memory: 10,
    players: [
      { field: [{ card: "EX8-027" }, { card: "EX8-026" }, { card: "EX8-027" }], hand: ["EX8-021", "EX8-029"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-issue-5259-gammamon-exact-evolution": {
    memory: 10,
    players: [
      {
        field: [{ card: "BT21-019", under: ["RB1-001", "BT21-010"] }, { card: "BT21-090" }],
        hand: ["BT21-022", "BT21-010", "RB1-009", "EX10-042"],
      },
      { field: [{ card: "BT1-009" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-multiple-field-effects": {
    memory: 10,
    players: [
      {
        field: [
          { card: "BT25-017", under: ["BT25-008"] },
          { card: "BT25-017", under: ["BT25-008"] },
        ],
        hand: ["BT25-018", "BT25-018"],
      },
      {
        field: [
          { card: "BT25-103" },
          { card: "BT5-111" },
          { card: "BT17-078" },
          { card: "BT5-111" },
          { card: "BT13-112" },
          { card: "BT1-085" },
        ],
        security: ["BT14-034", "BT1-009", "BT1-009"],
      },
    ],
  },
  "arena-issue-5261-sukamon-field-reduction": {
    memory: 10,
    players: [
      {
        field: [
          {
            card: "BT25-103",
            under: [
              "BT25-001",
              "P-198",
              "BT25-022",
              "BT25-024",
              "BT25-026",
              "BT25-028",
              "BT25-008",
              "BT25-013",
              "BT25-017",
              "BT25-018",
            ],
          },
          { card: "BT25-017", under: ["BT25-008"] },
        ],
        hand: ["BT25-018", "BT1-009"],
      },
      { security: ["BT14-034", "EX5-054", "BT11-036"] },
    ],
  },
  "arena-issue-5207-dorimon-guard": {
    memory: 3,
    players: [
      { field: [{ card: "EX13-063", under: ["BT16-005"] }, { card: "EX13-053" }] },
      { field: [{ card: "EX13-015" }] },
    ],
  },
  "arena-issue-5248-dynasmon-security": {
    memory: 3,
    players: [{ field: [{ card: "BT1-010" }, { card: "BT1-014" }, { card: "BT1-026" }] }, { security: ["AD1-017"] }],
  },
  "arena-issue-5246-savior-decline": {
    memory: 10,
    players: [{ field: [{ card: "BT1-014" }], hand: ["EX13-012", "ST12-13"] }, {}],
  },
  "arena-issue-5241-kurata-sleep": {
    memory: 10,
    players: [{ field: [{ card: "BT13-103" }, { card: "BT13-083" }], hand: ["BT13-088"] }, {}],
  },
  "arena-issue-5247-crimson-use-cost": {
    memory: 3,
    players: [
      { field: [{ card: "BT1-009" }], hand: ["BT8-097"] },
      {
        field: [
          { card: "ST13-08" },
          { card: "BT1-025" },
          { card: "BT1-025" },
          { card: "BT1-025" },
          { card: "BT1-025" },
        ],
      },
    ],
  },
  "arena-issue-5232-icemon-egg": { memory: 10, players: [{ hand: ["P-215"], trash: ["EX8-005"] }, {}] },
  "arena-issue-5214-habakirimon-security": {
    memory: 10,
    players: [{ field: [{ card: "BT1-058" }], hand: ["ST23-05"] }, { field: [{ card: "BT1-009" }] }],
  },
  "arena-issue-5204-dorimon-cost": {
    memory: 2,
    players: [{ field: [{ card: "BT9-016", under: ["EX13-006"] }] }, { security: ["BT1-009"] }],
  },
  "arena-issue-5219-lucemon-breeding": {
    memory: 10,
    players: [
      {
        breeding: { card: "BT1-006" },
        field: [{ card: "BT10-071" }],
        hand: ["BT18-100", "BT1-009"],
        trash: ["EX10-013"],
      },
      {},
    ],
  },
  "arena-issue-5217-metalgarurumon-choice": {
    memory: 10,
    players: [{ field: [{ card: "BT1-038" }], hand: ["BT22-026"] }, { field: [{ card: "BT1-009" }] }],
  },
  "arena-issue-5230-hidden-inherited": {
    memory: 10,
    players: [
      { field: [{ card: "EX9-018", under: ["EX12-053"], faceDownUnder: true }] },
      { field: [{ card: "BT1-009" }] },
    ],
  },
  "arena-issue-5218-landramon-discard": {
    memory: 10,
    players: [{ field: [{ card: "P-167" }], hand: ["EX10-032"] }, { field: [{ card: "BT1-025", under: ["BT1-009"] }] }],
  },
  "arena-issue-5235-merciful-jupiter-order": {
    memory: 20,
    players: [
      {
        hand: ["EX13-077"],
        field: [
          { card: "AD1-001" },
          { card: "AD1-010" },
          { card: "AD1-014" },
          { card: "AD1-025" },
          { card: "ST20-05" },
          { card: "ST20-07" },
        ],
      },
      { field: [{ card: "BT26-103", under: ["EX13-030"] }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-issue-5215-venusmon-guard-cost": {
    memory: 20,
    players: [
      {
        hand: ["BT6-095"],
        field: [
          { card: "EX13-063" },
          { card: "BT1-009", under: ["BT1-001"] },
          { card: "EX13-059" },
          { card: "EX9-018" },
        ],
        security: ["BT1-009"],
      },
      { field: [{ card: "BT24-040", under: ["BT24-033"] }, { card: "BT24-034" }, { card: "BT24-034" }] },
    ],
  },

  "arena-issue-5199-sistermon-option": {
    memory: 10,
    players: [
      { field: [{ card: "BT20-084" }], hand: ["EX13-066"], trash: ["BT23-077", "BT23-076"] },
      {
        field: [
          { card: "BT1-080", under: ["BT1-028"] },
          { card: "BT2-027", under: ["BT1-010"] },
        ],
      },
    ],
  },
  "arena-issue-5196-kyubimon-search": {
    memory: 10,
    players: [
      {
        field: [{ card: "ST22-02" }],
        hand: ["ST22-03"],
        deck: ["BT1-009", "BT1-010", "ST22-05", "BT1-011", "BT1-013"],
      },
      {},
    ],
  },
  "arena-issue-5179-imperialdramon-blitz": {
    memory: 2,
    players: [
      { field: [{ card: "BT20-016" }], hand: ["EX3-063"] },
      { field: [{ card: "BT1-028" }, { card: "BT1-029" }], security: ["BT1-009", "BT1-009"] },
    ],
  },
  "arena-issue-5190-tapmon-bootmon": {
    memory: 0,
    players: [
      { field: [{ card: "BT25-052", under: ["BT25-004"], linked: ["BT25-036"] }], hand: ["BT25-056", "BT25-072"] },
      { field: [{ card: "BT1-028" }, { card: "BT1-088" }] },
    ],
  },
  "arena-issue-5194-alphamon-entry": {
    memory: 10,
    players: [
      { hand: ["EX13-060"] },
      { field: [{ card: "BT1-080" }, { card: "BT1-028" }], security: ["BT1-009", "BT1-009"] },
    ],
  },
  "arena-issue-5185-nokia-warp": {
    players: [
      { field: [{ card: "EX4-038" }, { card: "EX4-039" }, { card: "BT22-084" }], hand: ["BT22-013", "BT22-026"] },
      { field: [{ card: "BT1-014" }] },
    ],
  },

  "arena-issue-5167-assembly-digimon": {
    memory: 10,
    players: [{ hand: ["BT26-073"], trash: ["BT26-001", "BT26-069"] }, {}],
  },
  "arena-issue-5171-taomon-famis": {
    memory: 10,
    players: [
      { field: [{ card: "BT1-051" }, { card: "BT1-064" }], hand: ["BT19-037", "BT26-032", "BT26-033"] },
      { field: [{ card: "BT1-010" }, { card: "BT1-011" }] },
    ],
  },
  "arena-issue-5168-alter-s-simultaneous": {
    players: [
      {
        field: [{ card: "EX9-021", under: ["EX9-012", "AD1-010"] }],
        hand: ["EX9-019"],
        deck: ["BT1-009", "BT1-009", "BT1-009"],
      },
      { security: ["BT1-009", "BT1-009"] },
    ],
  },
  "arena-issue-5169-demidevimon-native": {
    players: [
      { field: [{ card: "P-239" }], hand: ["EX10-048", "EX10-011", "BT1-009"] },
      { field: [{ card: "BT1-009", suspended: true }] },
    ],
  },
  "arena-issue-5170-kaguyamon-end-turn": {
    players: [{ field: [{ card: "EX9-033" }], trash: ["BT23-076", "BT23-077"] }, {}],
  },
  "arena-issue-5170-kaguyamon-on-play": {
    players: [{ hand: ["EX12-065"], trash: ["BT23-076", "BT23-077"] }, {}],
  },
  "arena-issue-5170-arisa-overclock": {
    players: [
      {
        field: [{ card: "EX11-060" }, { card: "EX11-024" }, { card: "TOKEN-Familiar-Token" }],
        hand: ["BT23-076", "BT23-077"],
      },
      { security: ["BT1-009", "BT1-009"] },
    ],
  },
  "arena-issue-5176-king-drasil-ace": {
    memory: 5,
    players: [
      { breeding: { card: "BT13-007" }, field: [{ card: "BT20-060", under: ["BT13-111"] }], hand: ["BT1-085"] },
      {},
    ],
  },
  "arena-issue-5166-dna-material-pairs": {
    memory: 8,
    players: [
      { field: [{ card: "ST10-05" }, { card: "ST10-12" }, { card: "ST10-12", under: ["BT1-009"] }], hand: ["ST10-06"] },
      {},
    ],
  },
  "arena-issue-5173-cyber-engage": {
    memory: 1,
    players: [{ field: [{ card: "BT25-098" }], hand: ["BT26-010"] }, {}],
  },
  "arena-issue-5173-cyber-engage-psychemon": {
    memory: 1,
    players: [
      { field: [{ card: "BT25-098" }], hand: ["BT26-010"] },
      { field: [{ card: "BT8-071" }, { card: "BT8-071" }] },
    ],
  },
  "arena-issue-5127-opponent-suspend-cost": {
    memory: 8,
    players: [
      { field: [{ card: "BT1-064", suspended: true }], hand: ["LM-066"] },
      { field: [{ card: "BT1-010" }, { card: "BT1-011" }, { card: "BT1-088", suspended: true }] },
    ],
  },
  "arena-issue-5127-opponent-survival": {
    memory: 8,
    players: [
      { field: [{ card: "BT1-010", suspended: true }], hand: ["ST1-16"] },
      { field: [{ card: "LM-066", suspended: true }] },
    ],
  },
  "arena-issue-5159-kudamon-moving": {
    memory: 8,
    players: [
      {
        breeding: { card: "EX13-026", under: ["BT26-005"] },
        deck: ["BT1-009", "BT1-009", "ST24-06", "ST24-13", "BT1-009"],
      },
      {},
    ],
  },
  "arena-issue-5158-guilmon-x-reveal": {
    memory: 8,
    players: [{ hand: ["EX8-009"], deck: ["BT1-009", "BT1-009", "EX13-010", "BT9-109", "BT1-009"] }, {}],
  },
  "arena-issue-5050-counter-immunity": {
    players: [
      { field: [{ card: "EX11-074" }, { card: "BT1-009" }], security: ["BT1-009", "BT1-009"] },
      { field: [{ card: "EX13-015" }], security: ["BT1-009", "BT1-009"] },
    ],
  },
  "arena-issue-5059-angewomon-warp": {
    memory: 10,
    players: [
      { field: [{ card: "ST20-10" }, { card: "ST21-10" }], hand: ["ST20-06", "ST20-11", "ST21-11"] },
      { field: [{ card: "BT1-024" }] },
    ],
  },
  "arena-issue-5058-davis-large-hand": {
    memory: 10,
    players: [
      {
        field: [{ card: "BT16-085" }, { card: "BT1-038" }],
        hand: [...Array.from({ length: 24 }, () => "BT1-010"), "BT3-021", "BT3-047"],
      },
      {},
    ],
  },
  "arena-issue-5070-lunamon-breeding": {
    memory: 8,
    players: [
      {
        breeding: { card: "BT1-003" },
        hand: ["BT25-022", "BT25-022", "BT25-024"],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT24-034", "BT26-029", "BT26-022", "BT1-009"],
      },
      {},
    ],
  },
  "arena-issue-5067-treadmill-reveal": {
    memory: 8,
    players: [
      {
        breeding: { card: "BT1-003" },
        hand: ["BT25-022", "LM-054"],
        deck: ["BT1-009", "BT1-009", "BT13-069", "BT11-040", "BT1-009"],
      },
      {},
    ],
  },
  "arena-issue-5066-shadow-reveal": {
    memory: 8,
    players: [
      { hand: ["LM-060"], field: [{ card: "BT1-067" }], deck: ["BT1-009", "BT13-051", "BT13-048", "BT1-009"] },
      {},
    ],
  },
  "arena-issue-5063-bokomon-base": {
    memory: 5,
    players: [{ field: [{ card: "BT7-081" }, { card: "BT7-011", under: ["BT7-085"] }], hand: ["BT7-014"] }, {}],
  },
  "arena-issue-5064-hybrid-protection": {
    memory: 10,
    players: [
      { field: [{ card: "BT1-009" }], hand: ["ST1-16"] },
      { field: [{ card: "AD1-002" }, { card: "AD1-002", under: ["AD1-023"] }], security: ["BT1-009"] },
    ],
  },
  "arena-issue-5060-exact-lucemon": {
    players: [{ field: [{ card: "BT1-010" }] }, { security: ["EX10-071"], trash: ["EX10-013", "EX6-018", "BT7-111"] }],
  },
  "arena-issue-5047-richard-self": {
    memory: 8,
    players: [{ field: [{ card: "EX13-071" }], hand: ["EX13-071"] }, { field: [{ card: "BT1-009" }] }],
  },
  "arena-issue-5049-decline-dna": {
    memory: 3,
    players: [
      { field: [{ card: "AD1-009" }, { card: "AD1-012" }], hand: ["EX9-021"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-issue-5011-agumon-search": {
    players: [{ hand: ["EX9-007"], deck: ["BT1-009", "EX9-014", "EX9-007", "BT1-009", "BT1-009", "BT1-009"] }, {}],
    memory: 8,
  },
  "arena-issue-5011-gabumon-search": {
    players: [{ hand: ["EX9-014"], deck: ["BT1-009", "EX9-007", "EX9-014", "BT1-009", "BT1-009", "BT1-009"] }, {}],
    memory: 8,
  },
  "arena-issue-5015-dantemon-attack-links": {
    memory: 3,
    players: [
      {
        field: [{ card: "BT26-063" }],
        hand: ["BT26-102", "BT26-086"],
        trash: ["BT26-010", "BT26-084", "BT26-037", "BT26-019", "BT26-051", "BT26-028"],
        deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      {
        field: [{ card: "EX5-063", under: ["BT16-075"], suspended: true }],
        security: ["BT21-072", "BT1-090", "P-108", "BT7-107"],
        deck: ["BT1-009", "BT1-009"],
      },
    ],
  },
  "arena-issue-5014-digital-gate-cool-boy": {
    players: [{ field: [{ card: "P-206" }, { card: "EX2-007" }], hand: ["BT20-091"] }, {}],
    memory: 8,
  },
  "arena-issue-4999-mother-option-color": {
    players: [{ field: [{ card: "EX2-007" }], hand: ["BT24-100"] }, {}],
    memory: 8,
  },
  "arena-issue-5000-mother-marsmon-cost": {
    players: [{ field: [{ card: "EX2-007" }], hand: ["BT25-020"] }, {}],
    memory: 10,
  },
  "arena-issue-5001-gomamon-vikemon-search": {
    players: [{ hand: ["EX8-018"], deck: ["BT1-010", "EX8-018", "LM-040", "BT14-026", "BT1-010", "BT1-010"] }, {}],
    memory: 8,
  },
  "arena-issue-5003-bacchus-pending-effects": {
    players: [
      { field: [{ card: "EX7-062" }], trash: ["BT2-067", "BT2-068"], hand: ["BT1-009"] },
      { field: [{ card: "BT25-077" }] },
    ],
    memory: 8,
  },
  "arena-issue-5004-shine-burst-marcus": {
    players: [{ field: [{ card: "ST24-07" }, { card: "ST24-13" }], hand: ["BT25-104"] }, {}],
    memory: 8,
  },
  "arena-issue-5005-mococomon-forced-attack": {
    players: [
      {
        field: [{ card: "EX12-043", under: ["EX12-002"] }],
        hand: ["EX12-045", "EX12-056", "EX12-034", "EX12-076"],
        security: ["BT1-010", "BT1-010", "BT1-010"],
      },
      { security: ["BT1-010", "BT1-010", "BT1-010"] },
    ],
    memory: 10,
  },
  "arena-issue-5007-armor-shakkoumon-order": {
    players: [
      { field: [{ card: "BT16-102", under: ["BT1-051", "BT23-032"] }] },
      { field: [{ card: "BT1-084", suspended: true }] },
    ],
    memory: 8,
  },
  "arena-issue-5008-hand-trash-selection": {
    players: [{ field: [{ card: "BT2-078" }], hand: ["EX7-062", "BT1-009", "BT1-010", "BT1-011"] }, {}],
    memory: 8,
  },
  "arena-issue-5009-pipe-fox-no-level": {
    players: [{ hand: ["BT22-023"] }, { field: [{ card: "TOKEN-Pipe-Fox" }] }],
    memory: 10,
  },
  "arena-issue-5010-kapurimon-security-flip": {
    players: [{ breeding: { card: "EX11-037", under: ["EX11-004"] } }, { security: ["BT1-010", "BT1-010", "BT1-010"] }],
    memory: 8,
  },
  "arena-issue-4998-gammamon-breeding": {
    players: [{ breeding: { card: "LM-016" }, hand: ["BT21-090"] }, {}],
    memory: 8,
  },
  "arena-issue-4998-paradise-lost-breeding": {
    players: [{ breeding: { card: "BT4-115" }, hand: ["EX10-071"] }, {}],
    memory: 8,
  },
  "arena-issue-4993-inferno-divide-immunity": {
    players: [
      {
        field: [{ card: "EX13-060", under: ["EX13-049", "EX13-055", "EX13-057"] }, { card: "EX13-055" }],
        hand: ["EX13-057"],
        security: ["BT1-010", "BT1-010", "BT1-010"],
      },
      {
        field: [{ card: "BT26-074" }],
        hand: ["BT1-010", "BT1-010"],
        trash: ["BT26-056"],
        security: ["BT1-010", "BT1-010", "BT1-010"],
      },
    ],
    memory: 8,
  },
  "arena-issue-4994-fly-bullet-immunity": {
    players: [
      {
        field: [{ card: "BT25-077" }, { card: "BT1-013" }, { card: "BT2-090" }],
        hand: ["BT25-059", "BT2-109"],
        security: ["BT1-010", "BT1-010", "BT1-010"],
      },
      {
        field: [{ card: "BT25-085", under: ["BT25-085"] }, { card: "BT1-010" }],
        hand: ["BT1-010"],
        security: ["BT1-010", "BT1-010", "BT1-010"],
      },
    ],
    memory: 13,
  },
  "arena-issue-4995-image-training": {
    players: [{ field: [{ card: "LM-056" }, { card: "BT25-078" }], hand: ["BT25-082"] }, {}],
    memory: 5,
  },
  "arena-issue-4995-breathing-training": {
    players: [{ field: [{ card: "LM-062" }, { card: "BT25-078" }], hand: ["BT25-082"] }, {}],
    memory: 5,
  },
  "arena-issue-4995-asuna-evolution": {
    players: [{ field: [{ card: "BT25-092" }, { card: "BT25-083" }], hand: ["BT26-056", "BT25-085"] }, {}],
    memory: 8,
  },
  "arena-issue-4995-pagumon-evolution": {
    players: [
      { field: [{ card: "BT25-082", under: ["BT25-005"] }], hand: ["BT25-083", "BT25-085"], trash: ["BT25-085"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-4996-heavy-metal-breeding": {
    players: [
      { field: [{ card: "LM-068" }], hand: ["BT1-010"], trash: ["BT11-079"] },
      { security: ["BT1-010", "BT1-010", "BT1-010"] },
    ],
    memory: 8,
  },
  "arena-examon-bt23-partition-choice": {
    memory: 3,
    players: [
      {
        field: [{ card: "BT23-047", under: ["EX13-005", "BT20-007", "BT21-046", "EX13-018", "EX13-021", "BT20-042"] }],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      {
        field: [{ card: "AD1-011" }],
        hand: ["AD1-024"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
    ],
  },
  "arena-discord-1556831312008974437-jesmon-gankoomon-immunity": {
    memory: 3,
    players: [
      {
        field: [{ card: "BT23-013" }],
        hand: ["BT20-057", "BT20-059"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      {
        field: [{ card: "EX13-018" }],
        hand: ["EX13-021"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
    ],
  },
  "arena-discord-1556821976922849360-tsunomon-jupitermon": {
    memory: 8,
    players: [
      {
        field: [
          { card: "P-213", under: ["BT24-003", "P-194"] },
          { card: "BT24-022", under: ["BT24-031"] },
        ],
        hand: ["BT24-101"],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      { security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-discord-1556821976922849360-tsunomon-jupitermon-zero": {
    memory: 8,
    players: [
      {
        field: [
          { card: "P-213", under: ["BT24-003", "P-194"] },
          { card: "BT24-022", under: ["BT24-031"] },
        ],
        hand: ["BT24-101"],
        security: ["BT1-009", "BT1-009"],
      },
      { security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-discord-1556810241952194590-cerberusmon-alphamon": {
    memory: 8,
    players: [
      {
        field: [{ card: "EX13-055", under: ["EX13-049"] }],
        hand: ["EX13-057", "EX13-060"],
        security: ["BT1-009", "BT1-010", "BT1-013"],
      },
      {
        field: [{ card: "BT26-090" }],
        hand: ["BT26-056", "BT1-009"],
        security: ["BT1-009", "BT1-010", "BT1-013"],
      },
    ],
  },
  "arena-discord-1556811259867955282-patamon-zero": {
    memory: 5,
    players: [
      { field: [{ card: "BT14-033" }], hand: ["BT14-037"], security: ["BT1-009", "BT1-010", "BT1-013"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556811259867955282-patamon-one": {
    memory: 5,
    players: [
      { field: [{ card: "BT14-033" }], hand: ["BT14-037"], security: ["BT14-035", "BT1-009", "BT1-013"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556811259867955282-patamon-multiple": {
    memory: 5,
    players: [
      { field: [{ card: "BT14-033" }], hand: ["BT14-037"], security: ["BT14-035", "BT14-035", "BT1-009"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556798361435373630-mococomon-once-per-turn": {
    memory: 10,
    players: [
      {
        field: [{ card: "EX12-043", under: ["EX12-002"] }],
        hand: ["EX12-045", "EX12-056", "EX12-034", "EX12-034"],
        security: ["BT1-009", "BT1-009", "BT1-009"],
      },
      {
        field: [{ card: "BT24-101" }, { card: "BT24-101", under: ["BT26-029"] }],
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
    ],
  },
  "arena-discord-1556782829713621082-digilab-breeding": {
    memory: 5,
    players: [
      { breeding: { card: "EX13-017", under: ["EX13-002"] }, hand: ["P-225"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772689731915896-fly-bullet-hand": {
    memory: 8,
    players: [
      { field: [{ card: "BT25-083" }], hand: ["BT25-085"] },
      { field: [{ card: "EX8-073" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772689731915896-fly-bullet-sources": {
    memory: 8,
    players: [
      { field: [{ card: "BT25-085", under: ["BT25-085"] }] },
      { field: [{ card: "EX8-073" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772182607011971-asuna": {
    memory: 8,
    players: [
      { field: [{ card: "BT25-092" }, { card: "BT25-083", under: ["BT25-100"] }], trash: ["BT25-085"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772182607011971-image-training": {
    memory: 8,
    players: [
      { field: [{ card: "LM-056" }, { card: "BT25-083" }], hand: ["BT25-085"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772182607011971-breathing-training": {
    memory: 8,
    players: [
      { field: [{ card: "LM-062" }, { card: "BT25-083" }], hand: ["BT25-085"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556772182607011971-pagumon": {
    memory: 8,
    players: [
      { field: [{ card: "BT25-083", under: ["BT25-005"] }], hand: ["BT25-085", "BT25-085"], trash: ["EX7-066"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556745762682183811-giant-slayer-execute": {
    players: [
      { hand: ["BT26-085", "BT26-060"], trash: ["BT26-078"], security: ["BT1-009", "BT1-009"] },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 7,
  },
  "arena-discord-1556745762682183811-holy-succession": {
    players: [
      {
        hand: ["BT26-085"],
        trash: ["BT26-078", "BT26-060", "BT26-001", "BT26-009", "BT26-011", "BT26-015", "BT26-016"],
        security: ["BT1-009", "BT1-009"],
      },
      { security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 2,
  },
  "arena-discord-1556702519952932885-rosemon-burst": {
    players: [
      { field: [{ card: "BT26-049" }, { card: "BT26-091" }], hand: ["BT26-050"] },
      { field: [{ card: "BT1-009" }, { card: "BT1-010" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 3,
  },
  "arena-discord-1556702519952932885-yoshino": {
    players: [
      { field: [{ card: "BT26-091" }, { card: "ST24-09" }], hand: ["ST24-09", "ST24-10"] },
      { field: [{ card: "BT1-009" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556702668754387095-machinedramon": {
    players: [
      {
        field: [{ card: "BT12-072", under: ["EX12-054", "EX12-055", "EX12-059"] }],
        hand: ["EX12-054", "EX12-055"],
        trash: ["EX12-054"],
      },
      {
        field: [{ card: "EX12-054", under: ["BT1-009"] }],
        security: ["ST1-16", "BT1-009", "BT1-009"],
      },
    ],
  },
  "arena-discord-1556703230166175754-engage": {
    players: [
      { field: [{ card: "EX12-060" }], hand: ["BT1-009"] },
      { security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 3,
  },
  "arena-discord-1556688029731528804-jesmon": {
    players: [
      { field: [{ card: "BT23-013" }], hand: ["BT1-009"] },
      { security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556715328610762844-alphamon": {
    players: [
      { hand: ["BT13-075"], trash: ["BT9-055"] },
      { field: [{ card: "EX8-073" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-discord-1556716432111304824-dantemon": {
    players: [
      {
        hand: ["BT26-086"],
        trash: ["BT26-010", "BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063", "BT26-084"],
      },
      { field: [{ card: "BT1-009" }], security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
    ],
    memory: 7,
  },
  "arena-discord-1556715929973424128-block-timing": {
    players: [
      {
        field: [{ card: "EX12-076", under: ["EX12-004", "EX12-031"] }],
        hand: ["EX12-047"],
        security: ["EX12-074"],
        faceUpSecurity: true,
      },
      { field: [{ card: "BT23-077" }, { card: "BT1-009" }], security: [] },
    ],
    memory: 3,
  },
  "arena-discord-1556732255148179569-drasil-turn": {
    players: [
      {
        breeding: { card: "BT13-007", under: ["BT20-102"] },
        field: [{ card: "EX11-053", under: ["EX12-053"] }],
        hand: ["BT13-087", "EX5-048"],
        security: ["BT1-009"],
      },
      { breeding: { card: "BT1-001" }, field: [{ card: "ST1-10" }], security: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
  "arena-issue-4965-optional-raid": {
    memory: 10,
    players: [
      { field: [{ card: "ST24-07" }] },
      { field: [{ card: "BT1-080" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4967-assembly-with-dna": {
    memory: 10,
    players: [
      {
        field: [{ card: "ST20-11" }, { card: "ST21-11" }],
        hand: ["EX13-016"],
        trash: ["ST20-11", "ST21-11", "ST20-10", "ST21-10"],
      },
      {},
    ],
  },
  "arena-issue-4968-hand-trash-draw": {
    memory: 10,
    players: [
      { hand: ["BT11-057", "BT24-045", "BT26-069", "BT1-010", "BT1-011"], field: [{ card: "BT1-076" }] },
      { field: [{ card: "BT1-010" }, { card: "BT1-011" }] },
    ],
  },
  "arena-issue-4969-grandgalemon-dp": {
    memory: 10,
    players: [{ hand: ["ST22-13"] }, { field: [{ card: "BT1-009" }] }],
  },
  "arena-issue-4971-imperial-effect-evolution": {
    memory: 10,
    players: [{ field: [{ card: "EX13-008" }], hand: ["BT21-046", "EX13-018"] }, { field: [{ card: "AD1-024" }] }],
  },
  "arena-issue-4972-burst-marcus-rule": {
    memory: 10,
    players: [
      { field: [{ card: "ST24-07" }, { card: "ST24-13" }], hand: ["BT25-104"] },
      { field: [{ card: "BT1-080" }] },
    ],
  },
  "arena-issue-4973-dual-option-immunity": {
    memory: 10,
    players: [
      { field: [{ card: "ST24-13" }], hand: ["ST24-07"] },
      { field: [{ card: "ST23-08" }], hand: ["ST23-09"] },
    ],
  },
  "arena-issue-4974-gaiomon-reboot": {
    players: [
      { field: [{ card: "BT9-068", under: ["BT11-069"], suspended: true }] },
      { field: [{ card: "BT1-010", suspended: true }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4977-kingetemon-continuous": {
    memory: 10,
    players: [
      {
        field: [{ card: "EX13-031" }, { card: "EX13-028" }, { card: "EX13-028" }],
        hand: ["EX13-035"],
        trash: ["EX13-027", "EX13-027"],
      },
      { field: [{ card: "BT1-080" }, { card: "EX13-023" }] },
    ],
  },
  "arena-issue-4978-rosemon-tamer-reaction": {
    memory: 10,
    players: [
      {
        field: [{ card: "ST24-10" }, { card: "ST24-14", under: ["BT1-009", "BT1-010"], faceDownUnder: true }],
        hand: ["BT26-049", "ST24-03"],
      },
      { field: [{ card: "BT1-080" }, { card: "BT1-080" }] },
    ],
  },
  "arena-issue-4979-weather-detach": {
    memory: 10,
    players: [{ field: [{ card: "BT26-037", linked: ["BT26-063"] }] }, { hand: ["EX9-018"], trash: ["BT1-010"] }],
  },
  "arena-issue-4981-dantemon-seven-code": {
    memory: 1,
    players: [
      {
        field: [{ card: "BT26-010", under: ["BT26-007"] }],
        hand: ["BT26-102", "BT26-086"],
        trash: ["BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-084", "BT26-010", "BT26-063"],
      },
      {
        field: [{ card: "BT1-080" }, { card: "BT1-084" }],
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010"],
      },
    ],
  },
  "arena-issue-4983-feedback-form": { players: [{ field: [{ card: "BT1-010" }] }, { field: [{ card: "BT1-011" }] }] },
  "arena-issue-4984-super-hacking-security": {
    players: [
      { field: [{ card: "BT24-099" }, { card: "BT26-010" }], security: ["BT26-084", "BT1-010", "BT1-011"] },
      { field: [{ card: "BT1-010" }] },
    ],
  },
  "arena-issue-4985-double-alliance": {
    memory: 10,
    players: [
      { field: [{ card: "EX13-012" }, { card: "ST12-12" }, { card: "BT6-082" }], hand: ["BT23-013", "BT6-084"] },
      { security: ["BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010"] },
    ],
  },
  "arena-issue-4988-examon-tamers": {
    memory: 10,
    players: [
      { field: [{ card: "BT1-080" }, { card: "BT1-044" }], hand: ["BT23-047"] },
      { field: [{ card: "ST24-13" }, { card: "ST24-14" }] },
    ],
  },
  "arena-issue-4989-linked-card-labels": {
    memory: 10,
    players: [
      {
        field: [{ card: "BT26-010", linked: ["BT26-019"] }, { card: "BT26-028" }],
        hand: ["BT26-102", "BT26-086", "BT26-084"],
        trash: ["BT26-037", "BT26-051", "BT26-063", "BT26-084"],
      },
      {},
    ],
  },
  "arena-issue-4990-end-of-turn-label": {
    memory: 1,
    players: [
      {
        field: [{ card: "BT9-111", under: ["BT9-062", "BT9-064"] }, { card: "EX13-013" }],
        hand: ["BT1-009", "BT1-009"],
      },
      { field: [{ card: "BT1-011" }] },
    ],
  },
  "arena-issue-4905-magnamon-merciful-colors": {
    memory: 6,
    players: [
      { hand: ["P-117", "ST17-13"] },
      {
        field: [{ card: "EX13-077", under: ["ST20-06", "ST21-08", "ST20-02", "BT21-061", "EX9-019", "AD1-025"] }],
      },
    ],
  },
  "arena-issue-4914-blanc-dual-option": {
    players: [
      { field: [{ card: "EX12-051" }], hand: ["EX12-052", "BT1-082"] },
      { field: [{ card: "BT6-082" }, { card: "BT1-080" }, { card: "BT5-091" }], hand: ["EX13-065"] },
    ],
  },
  "arena-issue-4948-sukamon-blast-legality": {
    players: [
      { field: [{ card: "BT1-009" }], hand: ["EX13-031", "BT3-061"] },
      {
        field: [{ card: "BT16-028" }, { card: "BT2-063" }],
        hand: ["BT17-077", "ST15-12"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    ],
  },
  "arena-issue-4947-physical-training-reaction": {
    players: [
      { field: [{ card: "P-105" }, { card: "BT1-051" }], hand: ["BT1-060"] },
      { field: [{ card: "BT16-028" }, { card: "BT1-085" }], hand: ["BT16-027"] },
    ],
  },
  "arena-issue-4957-gankoomon-dual-sources": {
    players: [
      { field: [{ card: "EX13-061", under: ["EX13-065", "EX13-066"] }], trash: ["ST12-12"] },
      { field: [{ card: "BT1-080", under: ["BT1-013", "BT1-020"] }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4910-diarbbitmon-dual-option": {
    players: [
      { field: [{ card: "EX12-051" }], hand: ["EX12-052", "BT1-082"] },
      {
        field: [{ card: "EX13-061", under: ["EX13-065", "EX13-066"] }, { card: "BT6-082" }],
        trash: ["ST12-12"],
        hand: ["EX13-065"],
      },
    ],
  },
  "arena-issue-4939-demon-lord-free-reduction": {
    players: [
      {
        breeding: { card: "EX6-006", under: ["EX6-006", "EX6-059"] },
        field: [{ card: "EX6-069" }, { card: "EX6-058" }, { card: "BT1-080" }, { card: "BT1-009" }],
        hand: ["EX6-058", "BT1-087"],
      },
      {},
    ],
  },
  "arena-issue-4954-lordknightmon-inspector": { players: [{ field: [{ card: "BT5-042" }], hand: ["AD1-018"] }, {}] },
  "arena-issue-4958-card-images": {
    players: [
      { field: [{ card: "BT1-010" }, { card: "BT5-092" }], hand: ["EX13-065", "BT25-104", "AD1-018"] },
      { field: [{ card: "BT1-080" }] },
    ],
  },
  "arena-issue-4943-browser-translation": {
    players: [{ field: [{ card: "BT1-010" }], hand: ["BT1-020", "BT1-013"] }, { field: [{ card: "BT1-080" }] }],
  },
  "arena-issue-4964-burst-own-tamer": {
    players: [
      { field: [{ card: "BT12-043" }], hand: ["BT25-104", "BT1-085"] },
      { hand: ["BT1-087"], field: [{ card: "BT1-080" }] },
    ],
  },
  "arena-issue-4962-seiten-ex12-assembly": {
    players: [{ field: [{ card: "EX12-043" }], hand: ["EX12-048"], trash: ["EX12-015", "EX12-029", "EX12-056"] }, {}],
  },
  "arena-issue-4961-takato-raid-attack": {
    players: [
      { field: [{ card: "BT19-080" }, { card: "ST7-08" }], hand: ["EX2-011"] },
      { field: [{ card: "BT1-080" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4955-minervamon-dedigivolve": {
    players: [
      { field: [{ card: "BT26-029" }], hand: ["BT24-041"] },
      { field: [{ card: "BT1-080", under: ["BT1-013", "BT1-020"] }] },
    ],
  },
  "arena-issue-4953-nokia-warp-reduction": {
    players: [
      { field: [{ card: "BT5-092" }, { card: "BT1-010" }, { card: "BT1-029" }], hand: ["BT22-013", "BT22-026"] },
      {},
    ],
  },
  "arena-issue-4952-kotemon-piercing": {
    players: [
      { breeding: { card: "BT26-008", under: ["BT26-001"] }, field: [{ card: "BT26-033" }] },
      { field: [{ card: "BT1-009", suspended: true }] },
    ],
  },
  "arena-issue-4951-okuwamon-inherited": {
    players: [
      { field: [{ card: "BT9-055", under: ["P-075"] }], hand: ["BT1-009"] },
      { field: [{ card: "BT1-024", suspended: true }] },
    ],
  },
  "arena-issue-4950-davis-ken-dna-sources": {
    players: [
      { field: [{ card: "BT16-085" }, { card: "ST9-04" }, { card: "ST9-09" }], hand: ["ST9-05"] },
      { field: [{ card: "BT1-080", under: ["BT1-020", "BT1-013", "BT1-010"] }] },
    ],
  },
  "arena-issue-4949-paladin-battle-comparison": {
    players: [
      { hand: ["EX13-076"], trash: ["EX13-045", "BT23-013", "EX13-061", "BT17-077", "BT22-067", "EX13-036"] },
      { field: [{ card: "BT26-028", under: ["EX13-055"] }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4946-slayerdramon-assembly-order": {
    players: [{ hand: ["EX13-024"], trash: ["EX13-021", "EX13-018", "EX13-008"] }, {}],
  },
  "arena-issue-4942-jesmon-double-alliance": {
    players: [
      { field: [{ card: "EX13-012" }, { card: "ST12-12" }, { card: "BT6-082" }], hand: ["BT23-013", "BT6-084"] },
      { security: ["BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010"] },
    ],
  },
  "arena-issue-4941-candlemon-top-inheritance": {
    players: [
      { field: [{ card: "BT18-030" }, { card: "BT1-009" }] },
      { field: [{ card: "BT1-024" }], hand: ["BT6-095"] },
    ],
  },
  "arena-issue-4940-lilithmon-delete-cost": {
    players: [{ field: [{ card: "BT26-028" }], hand: ["BT26-063"] }, { field: [{ card: "EX6-057" }] }],
  },
  "arena-issue-4938-ruli-optional-reduction": {
    players: [{ field: [{ card: "RB1-034" }, { card: "RB1-022" }], hand: ["RB1-024"] }, {}],
    memory: 5,
  },
  "arena-issue-4937-grademon-dual-immunity": {
    players: [
      { field: [{ card: "EX13-055", under: ["BT20-051"] }], hand: ["EX13-057", "BT1-082"] },
      { field: [{ card: "BT6-082" }], hand: ["EX13-065", "EX13-066"], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4937-bt20-grademon-dual-immunity": {
    players: [
      { field: [{ card: "EX13-055", under: ["BT20-051"] }], hand: ["BT20-053", "BT1-082"] },
      { field: [{ card: "BT6-082" }], hand: ["EX13-065", "EX13-066"], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4936-examon-repeat-barrier": {
    players: [
      { field: [{ card: "BT1-080" }, { card: "ST2-10" }], hand: ["EX13-045"] },
      {
        field: [{ card: "EX13-060", under: ["EX13-055"], suspended: true }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    ],
  },
  "arena-issue-4935-blanc-arts-guard": {
    players: [
      { field: [{ card: "BT23-076" }, { card: "BT1-080" }], hand: ["EX13-065"] },
      { field: [{ card: "BT1-024" }], hand: ["ST1-16"] },
    ],
  },
  "arena-issue-4933-lilamon-host": {
    players: [
      { field: [{ card: "BT1-009" }], hand: ["BT6-095"] },
      {
        field: [{ card: "ST24-11", under: ["ST24-10"] }, { card: "ST24-03" }, { card: "ST24-13", under: ["BT1-001"] }],
      },
    ],
  },
  "arena-issue-4932-kentaurosmon-security": {
    players: [
      { field: [{ card: "ST24-10" }], hand: ["EX13-036"], security: ["BT1-009", "BT1-010", "BT1-011"] },
      { field: [{ card: "BT1-024" }, { card: "BT1-024" }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
  },
  "arena-issue-4931-lordknightmon-reduction": { players: [{ field: [{ card: "BT5-042" }], hand: ["AD1-018"] }, {}] },
  "arena-issue-4930-venusmon-opponent-cost": {
    players: [
      { field: [{ card: "BT6-007" }], hand: ["BT6-095"] },
      { field: [{ card: "BT24-040", under: ["BT24-033"] }, { card: "BT24-034" }] },
    ],
  },
  "arena-issue-4929-noir-single-target": {
    players: [
      { field: [{ card: "BT6-082" }, { card: "ST12-12" }, { card: "BT6-084" }], hand: ["EX13-066"] },
      {
        field: [
          { card: "BT1-080", under: ["BT7-083", "BT7-082", "BT1-013"] },
          { card: "BT1-080", under: ["BT7-083", "BT7-082", "BT1-013"] },
        ],
      },
    ],
  },
  "arena-issue-4926-battle-priority": {
    players: [
      { field: [{ card: "BT23-047", under: ["EX13-041"] }] },
      {
        field: [
          { card: "BT5-042", suspended: true },
          { card: "EX13-074", suspended: true },
        ],
        hand: ["EX13-058"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    ],
  },
  "arena-bt15-092-kari-security": {
    memory: 10,
    players: [
      {
        field: [{ card: "BT15-084" }, { card: "BT8-090" }],
        hand: ["BT15-092"],
        security: ["BT15-033", "BT1-009", "BT1-010"],
      },
      {},
    ],
  },
  "arena-issue-4924-revelation-security-faces": {
    players: [{ field: [{ card: "BT1-045" }], hand: ["BT15-092"], security: ["BT15-033", "BT15-033", "BT1-009"] }, {}],
  },
  "arena-issue-4923-seiten-assembly": {
    players: [{ hand: ["EX12-048"], trash: ["EX12-015", "EX12-029", "BT12-041"] }, {}],
  },
  "arena-issue-4921-homeros-late-arrival": {
    players: [{ field: [{ card: "BT26-029" }, { card: "BT26-090" }], hand: ["BT26-033", "BT24-102"] }, {}],
  },
  "arena-issue-4919-seventh-lightning-cost": {
    players: [
      { field: [{ card: "BT15-077" }], hand: ["BT15-081"], trash: ["BT15-100"] },
      { field: [{ card: "BT15-079" }] },
    ],
  },
  "arena-issue-4918-lordknightmon-player-attack": {
    players: [
      { field: [{ card: "EX13-074", under: ["EX13-058", "EX13-058", "EX13-058"] }], hand: ["BT22-067"] },
      { field: [{ card: "BT1-009", suspended: true }] },
    ],
  },
  "arena-issue-4917-biting-crush-placement": {
    players: [{ field: [{ card: "BT2-067" }], hand: ["EX5-069", "EX5-063"] }, {}],
  },
  "arena-issue-4916-raid-target-block": { players: [{ field: [{ card: "AD1-008" }] }, { hand: ["EX13-062"] }] },
  "arena-issue-4915-junomon-homeros": {
    players: [
      { field: [{ card: "BT1-024" }] },
      { field: [{ card: "BT25-044" }], hand: ["BT24-102"], security: ["BT1-009"] },
    ],
  },
  "arena-issue-4913-cool-boy-proto-form": {
    players: [{ field: [{ card: "EX8-026" }, { card: "BT9-092" }], hand: ["EX5-070", "BT20-028"] }, {}],
  },
  "arena-issue-4912-deep-savers-battle": {
    players: [
      { field: [{ card: "EX13-024" }], hand: ["EX13-045"] },
      { field: [{ card: "EX8-026", suspended: true }], security: ["EX8-068"], faceUpSecurity: true },
    ],
    memory: 4,
  },
  "arena-issue-4911-mervamon-multiple-checks": {
    players: [
      {
        field: [
          { card: "BT26-081" },
          { card: "BT26-081" },
          { card: "BT26-029" },
          { card: "BT26-029" },
          { card: "BT26-029" },
          { card: "BT26-029" },
        ],
      },
      { security: ["BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010", "BT1-011", "BT1-009", "BT1-010"] },
    ],
  },
  "arena-issue-4907-takato-end-turn": {
    players: [
      {
        field: [{ card: "BT17-080" }, { card: "EX13-015", under: ["AD1-003", "EX13-007"] }],
        hand: ["BT17-016"],
        trash: ["BT17-010", "BT17-013", "EX13-007"],
      },
      { field: [{ card: "BT13-103" }, { card: "BT13-088" }], hand: ["BT1-009"] },
    ],
  },
  "arena-issue-5161-larva-breeding": {
    players: [
      {
        breeding: { card: "BT18-086" },
        field: [{ card: "BT7-111" }],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5104-alter-s-sources": {
    players: [
      {
        field: [{ card: "EX9-021", under: ["AD1-001", "AD1-001", "AD1-010", "AD1-010"] }],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5115-melting-trash": {
    players: [
      {
        field: [{ card: "P-232" }, { card: "BT19-052" }],
        hand: ["BT20-090"],
        trash: ["BT19-053", "BT19-053"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5129-hyogamon-trash": {
    players: [
      {
        field: [{ card: "BT24-072", under: ["BT24-026"] }],
        hand: ["BT24-045", "BT1-009"],
        trash: ["P-209", "P-209"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5129-goblimon-trash": {
    players: [
      {
        field: [{ card: "BT24-072", under: ["BT24-042"] }],
        hand: ["BT24-045", "BT1-009"],
        trash: ["P-209", "P-209"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5125-ulforce-gold": {
    players: [
      {
        hand: ["EX13-023"],
        trash: ["EX13-022", "EX4-027", "ST8-04"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5122-ulforce-bt13": {
    players: [
      {
        hand: ["BT13-030"],
        trash: ["EX13-022", "EX4-027", "ST8-04"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5125-ulforce-bt11": {
    players: [
      {
        hand: ["BT11-032"],
        trash: ["EX13-022", "EX4-027", "ST8-04"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5128-craniamon": {
    players: [
      {
        hand: ["EX13-062"],
        trash: ["BT20-054", "EX1-047", "BT13-061"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5145-slayerdramon": {
    players: [
      {
        hand: ["EX13-024"],
        trash: ["BT20-042", "BT20-023", "ST8-03"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5146-breakdramon": {
    players: [
      {
        hand: ["EX13-044"],
        trash: ["BT20-042", "BT20-023", "ST8-03"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5140-merciful": {
    players: [
      {
        hand: ["EX13-077"],
        trash: ["AD1-001", "AD1-010", "AD1-025", "AD1-014", "ST20-05", "ST20-07"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5154-dantemon": {
    players: [
      {
        hand: ["BT26-086"],
        trash: ["BT26-010", "BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063", "BT26-084"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-issue-5156-giant-slayer": {
    players: [
      {
        hand: ["BT26-085"],
        trash: ["BT26-001", "BT26-009", "BT26-011", "BT26-015", "BT26-016"],
        deck: Array<string>(20).fill("BT1-009"),
      },
      {
        security: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        deck: Array<string>(20).fill("BT1-009"),
      },
    ],
    memory: 10,
  },
  "arena-github-5160-super-hacking": {
    players: [
      { field: [{ card: "BT24-099" }, { card: "BT21-009" }], hand: ["BT6-095"], trash: ["BT24-071", "BT24-067"] },
      { field: [{ card: "BT1-010" }] },
    ],
    memory: 10,
  },
  "arena-github-5162-gym-security": {
    players: [{ field: [{ card: "BT1-009" }] }, { security: ["BT23-099"], hand: ["BT6-082"] }],
    memory: 10,
  },
  "arena-github-5162-gym-empty": {
    players: [{ field: [{ card: "BT1-009" }] }, { security: ["BT23-099"] }],
    memory: 10,
  },
  "arena-github-5162-gym-suppressed": {
    players: [{ field: [{ card: "EX13-060", under: ["BT20-015"] }] }, { security: ["BT23-099"] }],
    memory: 10,
  },
  "arena-github-5111-jesmon": {
    players: [{ field: [{ card: "BT6-015" }], hand: ["BT23-013"], trash: ["BT6-082", "BT6-082"] }, {}],
    memory: 10,
  },
  "arena-github-5112-plutomon": {
    players: [
      { field: [{ card: "BT26-059" }], hand: ["BT1-001"], trash: ["BT26-021", "BT26-069"] },
      { field: [{ card: "BT1-010", suspended: true }] },
    ],
    memory: 10,
  },
  "arena-github-5116-rizegreymon": {
    players: [
      {
        field: [{ card: "ST24-13", under: ["BT1-001", "BT1-002"], faceDownUnder: true }],
        hand: ["ST24-06", "ST24-07", "ST24-13"],
      },
      {},
    ],
    memory: 10,
  },
  "arena-github-5119-cerberusmon": {
    players: [
      { field: [{ card: "BT26-074" }], hand: ["BT1-001"], trash: ["BT26-100", "BT24-042"] },
      { field: [{ card: "BT1-010", suspended: true }] },
    ],
    memory: 10,
  },
  "arena-github-5127-zephagamon-option": {
    players: [
      { breeding: { card: "BT1-064" }, hand: ["LM-066"] },
      { field: [{ card: "BT1-010" }, { card: "BT1-011" }, { card: "BT1-088" }] },
    ],
    memory: 10,
  },
  "arena-github-5127-zephagamon-protection": {
    players: [{ field: [{ card: "BT1-010" }], hand: ["BT6-095"] }, { field: [{ card: "LM-066", suspended: true }] }],
    memory: 10,
  },
  "arena-github-5124-princemamemon": {
    players: [
      {
        field: [{ card: "EX13-059" }],
        hand: ["EX13-063"],
        deck: ["BT1-009", "BT1-009", "EX13-059", "BT1-010", "BT1-009", "BT1-010", "BT1-011", "BT1-009"],
      },
      {},
    ],
    memory: 10,
  },
  "arena-github-5124-bigmamemon": {
    players: [
      {
        field: [{ card: "BT2-056" }],
        hand: ["EX13-059"],
        deck: ["BT1-009", "BT1-009", "EX13-050", "BT1-010", "BT1-009", "BT1-010", "BT1-011", "BT1-009"],
      },
      {},
    ],
    memory: 10,
  },
  "arena-github-5136-greymon-recovery": {
    players: [{ hand: ["AD1-001"], trash: ["EX9-021", "BT1-010", "AD1-010"] }, {}],
    memory: 10,
  },
  "arena-github-5144-mastemon-infermon": {
    players: [
      { field: [{ card: "BT23-102" }, { card: "BT1-080" }] },
      { field: [{ card: "BT5-090" }], hand: ["BT22-059"], security: ["BT1-009", "BT1-010"] },
    ],
    memory: 10,
  },
  "arena-github-5149-proto-form": {
    players: [
      { field: [{ card: "BT1-010", under: ["EX5-070", "BT1-009", "BT1-011"] }], hand: ["BT1-013"] },
      { field: [{ card: "BT1-013" }], hand: ["BT6-095"] },
    ],
    memory: 10,
  },
  "arena-github-5151-examon-sources": {
    players: [
      { field: [{ card: "EX13-045", under: ["BT20-023", "BT20-023"] }] },
      { field: [{ card: "BT1-013", suspended: true }], security: ["BT1-009", "BT1-010", "BT1-011"] },
    ],
    memory: 10,
  },
  "arena-issue-5106-chuumon-inherited": {
    players: [
      { field: [{ card: "EX1-052", under: ["EX5-045"] }], trash: ["EX5-045"] },
      { field: [{ card: "BT1-084", suspended: true }] },
    ],
    memory: 8,
  },
  "arena-issue-5139-tsunomon-inherited": {
    players: [
      { field: [{ card: "ST21-02", under: ["ST21-01"] }], trash: ["AD1-001", "BT1-009"] },
      { field: [{ card: "BT1-014", suspended: true }] },
    ],
    memory: 8,
  },
  "arena-issue-5141-ukkomon-moving": {
    players: [
      {
        breeding: { card: "BT16-082", under: ["BT1-001"] },
        deck: ["BT1-009", "BT1-010", "BT1-011", "ST1-16", "BT1-009", "BT1-009"],
      },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5126-yuuki-end-turn": {
    players: [
      { field: [{ card: "EX11-069" }], hand: ["BT1-010", "BT1-010"], trash: ["EX11-050", "EX11-050", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5123-ryugumon-watcher": {
    players: [
      { field: [{ card: "EX12-036" }], hand: ["BT1-010"] },
      { field: [{ card: "BT1-014" }, { card: "BT1-015" }] },
    ],
    memory: 8,
  },
  "arena-issue-5113-weregarurumon-target": {
    players: [{ hand: ["EX12-032"] }, { field: [{ card: "BT1-014" }, { card: "BT1-087" }] }],
    memory: 8,
  },
  "arena-issue-5118-candlemon-main": {
    players: [{ field: [{ card: "EX13-025" }], hand: ["EX13-025"], security: ["BT1-010", "BT1-011", "BT1-012"] }, {}],
    memory: 8,
  },
  "arena-issue-5142-bt10-087-search": {
    players: [
      {
        hand: ["BT10-087"],
        deck: ["BT1-009", "AD1-006", "AD1-013", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5155-bt12-021-search": {
    players: [
      { hand: ["BT12-021"], deck: ["BT1-009", "AD1-011", "BT12-090", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5117-bt13-048-search": {
    players: [
      { hand: ["BT13-048"], deck: ["BT1-009", "AD1-010", "AD1-008", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5148-bt24-043-search": {
    players: [
      { hand: ["BT24-043"], deck: ["BT1-009", "AD1-010", "BT24-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5132-bt24-044-search": {
    players: [
      { hand: ["BT24-044"], deck: ["BT1-009", "BT20-085", "BT1-012", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5121-bt24-058-search": {
    players: [
      { hand: ["BT24-058"], deck: ["BT1-009", "AD1-003", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5138-bt25-022-search": {
    players: [
      { hand: ["BT25-022"], deck: ["BT1-009", "BT24-011", "BT24-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5131-bt3-093-search": {
    players: [
      { hand: ["BT3-093"], deck: ["BT1-009", "AD1-006", "AD1-011", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5108-ex12-073-search": {
    players: [
      {
        hand: ["EX12-073"],
        deck: ["BT1-009", "BT18-041", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        field: [{ card: "BT18-041" }],
      },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5137-ex13-027-search": {
    players: [
      { hand: ["EX13-027"], deck: ["BT1-009", "BT11-040", "BT11-041", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5107-ex2-008-search": {
    players: [
      {
        hand: ["EX2-008"],
        deck: ["BT1-009", "AD1-003", "BT12-089", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5109-ex4-038-search": {
    players: [
      { hand: ["EX4-038"], deck: ["BT1-009", "AD1-001", "AD1-010", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5135-st14-11-search": {
    players: [
      {
        hand: ["ST14-11"],
        deck: ["BT1-009", "AD1-002", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
      },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5132-st18-04-search": {
    players: [
      { hand: ["ST18-04"], deck: ["BT1-009", "BT1-012", "BT18-060", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5114-st20-02-search": {
    players: [
      { hand: ["ST20-02"], deck: ["BT1-009", "AD1-001", "AD1-019", "BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5152-lm-051-search": {
    players: [
      {
        hand: ["LM-051"],
        deck: ["BT1-009", "AD1-001", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        field: [{ card: "BT1-010" }],
      },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5132-lm-055-search": {
    players: [
      {
        hand: ["LM-055"],
        deck: ["BT1-009", "AD1-001", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        field: [{ card: "BT1-010" }],
      },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5182-supreme-connection-delay": {
    players: [
      {
        field: [{ card: "BT15-056" }, { card: "BT15-096" }],
        hand: ["BT15-096", "BT15-062"],
        deck: ["BT15-055", "BT15-007", "BT15-061", "BT15-008", "BT15-009", "BT15-010"],
      },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5181-sharkmon-shellmon": {
    players: [
      { field: [{ card: "EX12-026" }], hand: ["BT24-059"], deck: ["BT1-015", "BT1-015"] },
      { field: [{ card: "BT24-051", under: ["BT24-050"] }] },
    ],
    memory: 8,
  },
  "arena-issue-5073-epulse-trash": {
    players: [{ field: [{ card: "ST23-10" }], hand: ["ST23-15", "ST23-03"], trash: ["ST23-02", "ST23-04"] }, {}],
    memory: 5,
  },
  "arena-issue-5099-mervamon-iliad": {
    players: [
      {
        field: [{ card: "BT26-029" }],
        hand: ["BT26-081", "BT24-019", "BT26-009", "BT1-009"],
        trash: ["BT24-011", "BT24-033"],
      },
      { field: [{ card: "BT1-084" }] },
    ],
    memory: 8,
  },
  "arena-issue-5106-king-sukamon-cost": {
    players: [
      { field: [{ card: "BT11-040", under: ["EX5-045"] }], hand: ["EX13-031", "EX13-027"] },
      { field: [{ card: "ST15-11" }] },
    ],
    memory: 8,
  },
  "arena-issue-5118-candlemon-search": {
    players: [
      {
        hand: ["BT18-030"],
        deck: ["BT1-009", "LM-054", "EX13-037", "LM-059", "BT1-009", "BT1-009", "BT1-009"],
      },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5135-ai-mako-your-turn": {
    players: [
      {
        field: [{ card: "ST14-02" }],
        hand: ["ST14-11", "ST14-05"],
        deck: ["BT1-009", "EX10-037", "BT12-085", "BT12-073", "P-040", "BT1-009", "BT1-009", "BT1-009"],
      },
      {},
    ],
    memory: 8,
  },
  "arena-issue-5106-chuumon-self-replay": {
    players: [{ field: [{ card: "EX1-052", under: ["EX5-045"] }] }, { field: [{ card: "BT1-084", suspended: true }] }],
    memory: 8,
  },
  // GrapLeomon's own [When Attacking] and two inherited ones trigger together; the opponent
  // has no security, so the attack wins once they resolve.
  "arena-issue-5065-lethal-attack-order": {
    memory: 3,
    players: [{ field: [{ card: "BT4-057", under: ["BT6-025", "BT5-031"] }] }, { security: [] }],
  },
  // The bot's Leopardmon and its inherited MetalMamemon both trigger at the end of its turn,
  // right before the viewer's turn-start draw.
  "arena-issue-5065-opponent-turn-end": {
    memory: 3,
    players: [
      { hand: ["BT1-009", "BT1-010"] },
      { field: [{ card: "BT13-058", under: ["EX9-018"] }], hand: ["BT1-009", "BT1-009", "BT1-009"] },
    ],
  },
} satisfies Record<string, Layout>;

export type IssueReproScenarioId = keyof typeof ISSUE_LAYOUTS;
export const ISSUE_REPRO_SCENARIO_IDS = Object.keys(ISSUE_LAYOUTS) as IssueReproScenarioId[];

export function layIssueReproScenario(
  id: IssueReproScenarioId,
  state: GameState,
  decks: readonly [Decklist, Decklist],
): void {
  const layout: Layout = ISSUE_LAYOUTS[id];
  function card(cardId: string, seat: Seat, zone: string, index: number, faceUp: boolean): CardInstance {
    const instance = new CardInstance();
    instance.instanceId = `${id}-${seat}-${zone}-${index}`;
    instance.cardId = cardId;
    instance.ownerSeat = seat;
    instance.faceUp = faceUp;
    return instance;
  }
  for (const seat of [0, 1] as const) {
    const player = state.players[seat];
    if (player === undefined) continue;
    loadDeckInto(player, seat, decks[seat]);
    setSecurityStack(player);
    const spec = layout.players[seat];
    if (spec.deck !== undefined) {
      clearZone(player, Zone.Deck);
      for (const [index, cardId] of spec.deck.entries())
        insertCard(player, Zone.Deck, card(cardId, seat, "deck", index, false));
    }
    clearZone(player, Zone.Hand);
    clearZone(player, Zone.Trash);
    clearBattleArea(player);
    setBreeding(player, undefined);
    for (const [index, cardId] of (spec.hand ?? []).entries())
      insertCard(player, Zone.Hand, card(cardId, seat, "hand", index, false));
    for (const [index, cardId] of (spec.trash ?? []).entries())
      insertCard(player, Zone.Trash, card(cardId, seat, "trash", index, true));
    if (spec.security !== undefined) {
      clearZone(player, Zone.Security);
      for (const [index, cardId] of spec.security.entries())
        insertCard(player, Zone.Security, card(cardId, seat, "security", index, spec.faceUpSecurity === true));
    }
    for (const [index, field] of [...(spec.field ?? []), ...(spec.breeding ? [spec.breeding] : [])].entries()) {
      const permanent = new Permanent();
      permanent.permanentId = `${id}-${seat}-field-${index}`;
      permanent.controllerSeat = seat;
      setTopCard(permanent, card(field.card, seat, "field", index, true));
      permanent.enterFieldTurnCount = -1;
      permanent.isSuspended = field.suspended === true;
      permanent.baseDP = getCardDefinition(field.card)?.dp ?? 0;
      permanent.currentDP = permanent.baseDP;
      permanent.placedByEffect = getCardDefinition(field.card)?.kinds.includes(CardKind.Option) === true;
      for (const [sourceIndex, cardId] of (field.under ?? []).entries())
        pushOnStack(permanent, card(cardId, seat, `source-${index}`, sourceIndex, field.faceDownUnder !== true));
      for (const [linkIndex, cardId] of (field.linked ?? []).entries())
        linkCard(permanent, card(cardId, seat, `linked-${index}`, linkIndex, true), "bottom");
      if (field === spec.breeding) {
        permanent.inBreeding = true;
        setBreeding(player, permanent);
      } else placePermanent(player, permanent);
    }
  }
  state.turnSeat = 0;
  state.turnCount = 0;
  state.isFirstPlayersFirstTurn = false;
  state.memory = layout.memory ?? 10;
}
