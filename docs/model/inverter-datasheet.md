# Inverter datasheet: Deye SUN-10K-SG05LP3-EU-SM2

The owner's inverter is the 10 kW model of Deye's three-phase hybrid series SUN-3/4/5/6/8/10/12K-SG05LP3-EU-SM2. The figures below are the 10 kW column of the technical-data table (section 8) of the maker's manual, edition 2025-11-15:

<https://www.deyeinverter.com/deyeinverter/2025/11/17/%E3%80%90B%E3%80%91Manual_SUN-3-12K-SG05LP3-EU-SM2_20251115_en.pdf>

The manual (10 MB) is not copied into the repository; the link above is the source. The values the model reads live in `PV_SYSTEM.inverter` (`apps/web/src/data/pv-system.ts`).

## PV input

| Item | Value |
| --- | --- |
| Max. PV access power | 20 000 W |
| Max. PV input power | 16 000 W |
| Max. PV input voltage | 800 V |
| Start-up voltage | 160 V |
| PV input voltage range | 160 to 800 V |
| MPPT voltage range | 200 to 650 V |
| Full-load MPPT voltage range | 350 to 650 V |
| Rated PV input voltage | 550 V |
| Max. operating PV input current | 26 A + 26 A |
| Max. input short-circuit current | 39 A + 39 A |
| MPP trackers / strings per tracker | 2 / 2 + 2 |

## AC output

| Item | Value |
| --- | --- |
| Rated AC active power | 10 000 W |
| Max. AC apparent power | 11 000 VA |
| Rated AC current | 15.2 A in, 14.5 A out |
| Max. AC current | 16.7 A in, 16 A out |
| Grid connection | 3L + N + PE, 230/400 V, 50 Hz |
| Power factor range | 0.8 leading to 0.8 lagging |
| Off-grid peak power | 2 times the rated power for 10 s |

## Efficiency

| Item | Value |
| --- | --- |
| Max. efficiency | 97.60 % |
| Euro efficiency | 97.00 % |
| MPPT efficiency | above 99 % |

## Battery

| Item | Value |
| --- | --- |
| Type | Lead-acid or lithium-ion, 40 to 60 V |
| Max. charge / discharge current | 210 A |
| Battery inputs | 1 |

## General

| Item | Value |
| --- | --- |
| Size (W × H × D) | 386 × 660 × 250 mm, without connectors and brackets |
| Weight | 35.2 kg |
| Protection | IP 65, non-isolated, intelligent air cooling |
| Operating temperature | -40 to +60 °C, derating above 45 °C |
| Noise | 55 dB or less |
| Communication | RS232, RS485, CAN; GPRS / Wi-Fi / Bluetooth / 4G / LAN optional |
| Warranty | 5 or 10 years, by the installation site |

## How the model uses it

| Datasheet | Model |
| --- | --- |
| Rated AC power, 10 000 W | The clipping limit (`maxAcW`): the AC power never goes above it. |
| Euro efficiency, 97.0 % | The inverter's efficiency (`efficiency`). The maximum, 97.6 %, is the peak; the Euro figure weights the load levels a day goes through. |
| Size, 386 × 660 × 250 mm | The 3D model on the garage's wall (`garage-equipment.ts`). |

## The array against the datasheet

- **Power**: the 18 panels of 620 Wp are 11.16 kWp, below the 16 kW the inputs take, so the inverter is not oversized on the DC side. The DC to AC ratio is 1.12; on clear days around noon the array reaches the 10 kW limit and the peak is clipped, which the model counts.
- **Strings**: two series of 9 panels, one on each MPP tracker (the manual allows two strings per tracker, so each series could also be split in two).
- **Not checked**: the panel's electrical data (open-circuit and maximum-power voltage, short-circuit current) is not known, so the series' voltage against the 200 to 650 V window, the 350 V full-load minimum and the 800 V maximum, and the current against 26 A, are open until the panel's datasheet is added.
