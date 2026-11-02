# Electrical installation

The **Electrical** tab (`#electrical`) is a factsheet of how the installation is laid out: the way the power goes, what each of the two boards holds, and how the phases share the load. It prints cleanly (the button calls the browser's print, so it can be saved as a PDF for the electrician). All of it comes from `apps/web/src/data/electrical.ts`; nothing in it is measured, and it is the plan, not what is built.

The main board is the meter's drop, at the entrance where the stairs to the upper floor start, with a single four-pole breaker; the selector and the inverter's grid input are fed from it.

## What the owner decided, and what is proposed

| Item | Source |
| --- | --- |
| Two boards: the garage's (solar and the upper floor) and the pantry's (the ground floor) | Owner |
| The circuits on each floor (upper: 2 lights, 2 outlets, outdoor, azotea, 3 air conditioners, water heater; ground: 2 lights, 2 outlets, the office's air conditioner, the sauna) | Owner |
| Three-phase supply behind the Deye inverter; a three-phase 5 kW dry sauna, the only three-phase load | Owner |
| A fuse per string and a three-position selector (Grid · 0 · Inverter) in the garage board, to leave the inverter out | Owner |
| The phase of each circuit, the ratings, the cable sizes, the residual-current devices, the feeder (6 mm², 32 A, its breaker in the pantry board) | Proposed, for an electrician to confirm |

## Why the phases are split as they are

- The two daytime air conditioners (the office's and the living room's) are on different phases; so are the two night-time ones (the main bedroom's and the guest bedroom's). The water heater is not on the kitchen outlets' phase, where the kettle is.
- The connected power of the big loads (air conditioners at 1.89 kW, the maker's cooling figure for the 553GIQ2201F; the water heater at 3 kW with both elements; each circuit of outlets at 10 A, the owner's figure, which the kitchen's 2.2 kW kettle fits in; the sauna heater at 5 kW, a third on each phase) is within 25 % between the phases. It is what is connected, not what runs at once; the demand applies the simultaneity factor of 0.6 that the AEA gives a house with superior electrification (the owner's figure).
- With the selector on **Inverter** the house hangs from the inverter's output, which gives up to 16 A a phase ([datasheet](inverter-datasheet.md)). The sauna heater is not on that output (the owner's choice); without it the busiest phase still has more than that connected, so the manual's word on unbalanced loads is open.

## Open questions

- The main breaker's and the selector's ratings follow the supply, which the model does not have. The battery comes with a 100 A breaker of its own, so none is drawn for it in the garage board.
- Both boards are the owner's 48-module Genrod; that it is three rows of sixteen is assumed from the owner's photo: count the real box. The garage board needs 42 modules (48 with the optional surge arresters, none spare); the pantry's needs 25. The selector is a four-pole switch, 72 mm, four modules.
- The garage board's last row is the solar circuit (the inverter's breaker and the strings' fuses), with the supply's main breaker and the selector: the first two rows are full with the type A and the type F groups, so the solar items could only go last if the supply goes with them.
- The pantry's main breaker (4P, 32 A) is in the pantry board, at the end of the feeder (the owner's choice). The feeder's 6 mm² cable then has no breaker of its own at its origin, and only the supply's incoming breaker looks after it: that one has to be 32 A or less, or a 32 A breaker stays in the garage board for the feeder.
- The two bedrooms' air conditioners are labelled ACMR (main bedroom) and ACGR (guest bedroom); the other labels on the rows are in the tables' label column.
- With a three-phase comb bar each one-pole module takes the phase of its place, so the order in a row has to match the phase in the table, or the breaker is wired with cable. Every circuit on one phase is bipolar (the owner's choice) and carries its own neutral.
- The upper floor's circuits run on from the pantry to the garage board: about 20 conductors in one 40 mm conduit, by the numbers. The pantry's earth bar gathers the earth wires of both floors.

## Residual-current devices

The loads with converters (the inverter air conditioners, switching power supplies, LED drivers) leak direct and high-frequency current that a type AC device does not see, and that can blind or trip a type A one. So the lights and the outlets are on a type A device, and what has an inverter (the air conditioners and the water heater in the garage; the office's air conditioner and the sauna in the pantry) is on a type F one, which also covers plain resistive loads. Each device is in the row of the circuits it protects (`BOXES` in `data/electrical.ts`). The Deye's own output is not under any of them; whether it asks for an external device, and of which type, is in its manual.

The tests (`apps/web/test/electrical.test.ts`) keep the circuit count, the single three-phase load, the phase rules above, the breakers against their cables and the water heater's 20 A on 4 mm².
