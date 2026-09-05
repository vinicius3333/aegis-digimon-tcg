# EX9-031 exact Sukamon route

The catalog requires `[Sukamon]: Cost 3`, not a name containing Sukamon.
The runtime module's `names` matcher accepted the off-color, non-DM level-4
PlatinumSukamon BT13-065 in a public alternate evolution declaration.

Use the existing `namesExact` requirement for Sukamon. Retain the independent
level-4 DM route and normal Yellow route unchanged. No shared matcher change or
card-ID exception is needed. The regression must reject PlatinumSukamon without
moving cards, drawing, or paying memory; BT3-063 Sukamon remains a positive.

The same focused file additionally proves recovery's shared digivolve/attack
once-per-turn identity and Q4786's Security / active-player / defender ordering.
Run focused tests, affected exact-name requirements, typecheck and scoped style.
Effects synchronization remains part of the pending EX9 collection closeout.
