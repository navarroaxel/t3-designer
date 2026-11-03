# Electrical installation

The **Electrical** tab (`#electrical`) is a factsheet of how the installation is laid out: the way the power goes, what each of the two boards holds, and how the phases share the load. It prints cleanly (the button calls the browser's print, so it can be saved as a PDF for the electrician). All of it comes from `apps/web/src/data/electrical.ts`; nothing in it is measured, and it is the plan, not what is built.

The main board is the meter's drop, at the entrance where the stairs to the upper floor start: a Genrod of one row of sixteen modules that holds the supply's protections. In order: the four-pole breaker (4 modules), the AC surge arrester 3+1 (4) and the three-phase voltage protector of the BAW RU400F63 Plus kind (5 modules, 63 A): thirteen, three free. The protector reads each phase's voltage and opens when one is out of range, which a lost neutral also causes on some phase; it is in series, so everything below it goes off, and it closes again by itself after its delay (see its manual). The changeover switch and the inverter's grid input are fed from it. The arrester is next to the earth rod, so its earth wire is short. The strings' DC surge arresters are in the TSINV.

## What the owner decided, and what is proposed

| Item | Source |
| --- | --- |
| Three boards: the solar one and the PA one (the upper floor), both in the garage, and the pantry's (the ground floor) | Owner |
| The circuits on each floor (upper: 2 lights, 2 outlets, outdoor, azotea, 3 air conditioners, water heater; ground: 2 lights, 2 outlets, the office's air conditioner, the sauna) | Owner |
| Three-phase supply behind the Deye inverter; a three-phase 5 kW dry sauna, the only three-phase load | Owner |
| A DC breaker per string (the installer's) and a three-position changeover switch (Grid · 0 · Inverter) in the TSINV, to leave the inverter out | Owner |
| The phase of each circuit, the ratings, the cable sizes, the residual-current devices, the feeder (6 mm², 32 A, its breaker in the TSPB) | Proposed, for an electrician to confirm |

## Why the phases are split as they are

- The two daytime air conditioners (the office's and the living room's) are on different phases; so are the two night-time ones (the main bedroom's and the guest bedroom's). The water heater is not on the kitchen outlets' phase, where the kettle is.
- The connected power of the big loads (air conditioners at 1.89 kW, the maker's electrical consumption in cooling for the 553GIQ2201F; the water heater at 3 kW with both elements; each circuit of outlets at 10 A, the owner's figure, which the kitchen's 2.2 kW kettle fits in; the sauna heater at 5 kW, a third on each phase) is within 25 % between the phases. The current checks use the currents the makers state, 8.73 A for each air conditioner and 13.6 A for the water heater, which are larger than the power over 230 V. It is what is connected, not what runs at once; the demand applies the simultaneity factor of 0.6 that the AEA gives a house with superior electrification (the owner's figure).
- With the changeover switch on **Inverter** the house hangs from the inverter's UPS output, which gives up to 16 A a phase ([datasheet](inverter-datasheet.md)). The water heater and the sauna heater are not on it; without them the busiest phase still has a demand over that, so the manual's word on unbalanced loads is open.

## Open questions

- The main breaker's and the changeover switch's ratings follow the supply, which the model does not have. The battery comes with a 100 A breaker of its own, so none is drawn for it in the TSINV.
- The TSPA and the pantry's are the owner's 48-module Genrod; that it is three rows of sixteen is assumed from the owner's photo: count the real box. The TSPA needs 36 modules (its first row only has the floor's main breaker); the pantry's needs 25. TSINV is a new 24-module box of two rows of twelve (the rows are assumed too) and needs 16. The changeover switch is a four-pole switch, 72 mm, four modules.
- TSINV's first row has the changeover switch and the inverter's breaker, and its second the strings' DC breakers and their DC surge arresters, one per string (the inverter may have its own, and then the external one is not needed). The supply of the TSPA hangs from the changeover switch, and so does the pantry's feeder.
- The pantry's main breaker (4P, 32 A) is in the TSPB, at the end of the feeder (the owner's choice). The feeder's 6 mm² cable then has no breaker of its own at its origin, and only the supply's incoming breaker looks after it: that one has to be 32 A or less, or a 32 A breaker for the feeder is put in the TSINV, which has the room.
- The string breakers are two-pole DC ones (the installer put one on each string, instead of a fuse): they have to be rated for DC at the string's open-circuit voltage (1000 V DC or more), so check the label; an AC breaker does not put out a DC arc. They are 16 A here, a placeholder for the real model, and each takes two modules. The DC surge arrester is still needed, one per MPPT input.
- The two bedrooms' air conditioners are labelled ACMR (main bedroom) and ACGR (guest bedroom); the other labels on the rows are in the tables' label column.
- With a three-phase comb bar each one-pole module takes the phase of its place, so the order in a row has to match the phase in the table, or the breaker is wired with cable. Every circuit on one phase is bipolar (the owner's choice) and carries its own neutral.
- The upper floor's circuits run on from the pantry to the TSPA: about 20 conductors in one 40 mm conduit, by the numbers. The pantry's earth bar gathers the earth wires of both floors.

## Residual-current devices

The loads with converters (the inverter air conditioners, switching power supplies, LED drivers) leak direct and high-frequency current that a type AC device does not see, and that can blind or trip a type A one. So the lights and the outlets are on a type A device, and the air conditioners (the TSPA's and the office's) on a type F one. Each device is in the row of the circuits it protects (`BOXES` in `data/electrical.ts`). The Deye's own output is not under any of them; whether it asks for an external device, and of which type, is in its manual.

## The inverter's two AC outputs

The inverter has two AC outputs: one with UPS, which the changeover switch takes (everything hangs from it when the changeover switch is on Inverter), and one without. The water heater and the sauna heater are on the one without (the owner's choice): resistive loads with no battery backup, under a type A device of their own in the TSPA's last row, from which the cable to the sauna in the pantry also leaves, without a breaker of its own at its origin. If the inverter fails they have no power even with the changeover switch on Grid. The current the UPS output has to give leaves them out.

The tests (`apps/web/test/electrical.test.ts`) keep the circuit count, the single three-phase load, the phase rules above, the breakers against their cables and the water heater's 20 A on 4 mm².
