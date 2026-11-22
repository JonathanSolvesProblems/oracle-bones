# Requirements Document

## Introduction

This spec describes what QUICK-2 v1.0 does, as observed by running the original binary. Every
acceptance criterion cites the recorded case or capture it rests on. Values are written as the
program printed them, without the padding of their print fields. Where a behaviour is not yet
understood, it is an open question in the ledger, not a criterion here.

## Glossary

- **Trapezoid form**: the Normal Depth, Trapezoidal Channel input screen. It asks for six values
  one at a time on row 20, in this order: Left Side Slope, Right Side Slope, Bottom Width,
  Manning's n, Discharge, Slope; then shows "Begin Calculations  <Enter>".
- **Held prompt**: after Enter, the same prompt stays, no message appears, and the screen is the
  same as before the value was typed.

## Requirements

### Requirement 1: Zero inputs on the trapezoid form

**User Story:** As a floodplain permit reviewer, I want Quickened to treat a zero input the way
QUICK-2 did, so that its answers and its refusals match the program FEMA lists.

#### Acceptance Criteria

1. WHEN the user enters 0 at any of the six trapezoid form prompts (Left Side Slope, Right Side Slope, Bottom Width, Manning's n, Discharge, Slope) THE SYSTEM SHALL hold that prompt: keep the same prompt, show no message, and leave the screen as it was before the value was typed. _(observed: obs-zerohold-000001)_
2. WHEN a prompt has been held after a 0 and the user then enters a non-zero value THE SYSTEM SHALL accept that value at the same prompt, echo it in its field, and move to the next prompt. _(observed: obs-zerohold-000001)_

### Requirement 2: Negative inputs on the trapezoid form

**User Story:** As a floodplain permit reviewer, I want Quickened to do with a negative input
what QUICK-2 did, so that a mistyped sign gives the same outcome in both.

#### Acceptance Criteria

1. WHEN the user enters -1 at any of the six trapezoid form prompts THE SYSTEM SHALL accept it and move to the next prompt. _(observed: nd-trap-000003, nd-trap-000004, nd-trap-000005, obs-negnstall-000001, obs-negreturn-000001, obs-negreturn-000002)_
2. WHEN -1 is accepted for Left Side Slope, Right Side Slope or Bottom Width THE SYSTEM SHALL echo it as `-1.0`. _(observed: nd-trap-000003, nd-trap-000004, nd-trap-000005)_
3. WHEN -1 is accepted for Discharge THE SYSTEM SHALL echo it as `-1`. _(observed: oracle/goldens/captures/obs-negreturn-000001/screen-08.txt)_
4. WHEN -1 is accepted for Manning's n or Slope THE SYSTEM SHALL echo it as `%-1.0000`, with the leading `%`. _(observed: oracle/goldens/captures/obs-negnstall-000001/screen-09.txt, oracle/goldens/captures/obs-negreturn-000002/screen-09.txt)_
5. WHEN Begin Calculations is pressed with Left Side Slope -1, Right Side Slope 2, Bottom Width 10, Manning's n .035, Discharge 300 and Slope .005 THE SYSTEM SHALL print Depth `4.81`, Area `59.6`, Wet Perimeter `27.5`, Velocity `5.0`, Hyd Radius `2.2`, Top Width `14.8`, Froude # `0.4` and Flow Type `SUBCRITICAL`. _(observed: nd-trap-000003)_
6. WHEN Begin Calculations is pressed with Left Side Slope 3, Right Side Slope -1, Bottom Width 10, Manning's n .035, Discharge 300 and Slope .005 THE SYSTEM SHALL print Depth `4.29`, Area `61.4`, Wet Perimeter `29.6`, Velocity `4.9`, Hyd Radius `2.1`, Top Width `18.6`, Froude # `0.5` and Flow Type `SUBCRITICAL`. _(observed: nd-trap-000004)_
7. WHEN Begin Calculations is pressed with Left Side Slope 3, Right Side Slope 2, Bottom Width -1, Manning's n .035, Discharge 300 and Slope .005 THE SYSTEM SHALL print Depth `5.04`, Area `58.4`, Wet Perimeter `26.2`, Velocity `5.1`, Hyd Radius `2.2`, Top Width `24.2`, Froude # `0.6` and Flow Type `SUBCRITICAL`. _(observed: nd-trap-000005)_
8. WHEN Begin Calculations is pressed with Manning's n -1 and the other five inputs valid THE SYSTEM SHALL print no result and leave the form unchanged, still showing "Begin Calculations  <Enter>", for at least 10 seconds. _(observed: obs-negnstall-000001)_
9. WHEN Begin Calculations is pressed with Discharge -1 and the other five inputs valid THE SYSTEM SHALL print no result and no message, and return to the SHAPE OF CROSS SECTION menu. _(observed: obs-negreturn-000001)_
10. WHEN Begin Calculations is pressed with Slope -1 and the other five inputs valid THE SYSTEM SHALL print no result and no message, and return to the SHAPE OF CROSS SECTION menu. _(observed: obs-negreturn-000002)_

### Requirement 3: Normal Depth on an irregular section

**User Story:** As a floodplain permit reviewer, I want to enter a natural channel the way I did
in QUICK-2 (station and elevation points cut from a terrain model, bank stations, and an n value
for each overbank and the channel), so that Quickened gives the water-surface elevation QUICK-2
gave.

The section used in these cases has 40 points at stations 0 to 390 ft, 10 ft apart, with
elevations 12, 11.6, 11.1, 10.7, 10.4, 10.1, 9.9, 9.8, 9.6, 9.5, 9.3, 9.2, 9, 8.8, 8.5, 7.9,
6.2, 4.1, 2.6, 1.8, 1.5, 1.7, 2.4, 3.9, 5.8, 7.6, 8.4, 8.7, 8.9, 9.1, 9.2, 9.4, 9.6, 9.8, 10,
10.3, 10.7, 11.2, 11.8, 12.5 ft, slope .002, and channel n .035. It is called "the 40-point
section" below.

#### Acceptance Criteria

1. WHEN Normal Depth and Irregular Channel are chosen THE SYSTEM SHALL show the GROUND POINTS editor and take each ground point as a station followed by Enter and an elevation followed by Enter, showing four station and elevation pairs per row. _(observed: nd-irr-000001, obs-bankreject-000001)_
2. WHEN the elevation of the 40th ground point has been entered THE SYSTEM SHALL leave ground-point entry without F10 and show "Enter  LEFT  Channel Bank Station  and Press  <Enter>". _(observed: oracle/goldens/captures/obs-bankreject-000001/screen-13.txt, nd-irr-000001)_
3. WHEN ground-point entry ends THE SYSTEM SHALL ask, in this order, for the LEFT channel bank station, the RIGHT channel bank station, the LEFT, CHANNEL and RIGHT Manning's n values, the Discharge and the Slope, and then show "TO BEGIN CALCULATIONS     Press  <Enter>". _(observed: obs-nodata-000001, nd-irr-000001)_
4. WHEN the LEFT bank station is not the station of any ground point THE SYSTEM SHALL show "ERROR! LEFT Bank Station DOES NOT MATCH a Ground Point.  Press <ENTER>" on the prompt row and leave the Left bank field blank. _(observed: oracle/goldens/captures/obs-bankreject-000001/screen-14.txt)_
5. WHEN the RIGHT bank station is not the station of any ground point THE SYSTEM SHALL show "ERROR! RIGHT Bank Station DOES NOT MATCH a Ground Point. Press <ENTER>" on the prompt row and leave the Right bank field blank. _(observed: oracle/goldens/captures/obs-bankreject-000002/screen-15.txt)_
6. WHEN bank stations 150 and 260, n values .06, .035 and .08, discharge 2500 and slope .002 are entered THE SYSTEM SHALL echo them as `150.0`, `260.0`, `0.0600`, `0.0350`, `0.0800`, `2500` and `0.0020`. _(observed: nd-irr-000001)_
7. WHEN Begin Calculations is pressed for the 40-point section with banks 150 and 260, n values .06, .035 and .08, and discharge 2500 THE SYSTEM SHALL print WS ELEV `8.60`, Depth `7.1`, Area `493`, Top Wid `130`, Hyd R `3.8`, Flow Type `SUBCRITICAL`, Chan Vel `5.1`, Wet Per `131` and Frd # `0.46`. _(observed: nd-irr-000001)_
8. WHEN Begin Calculations is pressed for the 40-point section with banks 150 and 260, n values .06, .035 and .08, and discharge 8000 THE SYSTEM SHALL print WS ELEV `12.22`, Depth `10.7`, Area `1544`, Top Wid `386`, Hyd R `4.0`, Flow Type `SUBCRITICAL`, Chan Vel `7.6`, Wet Per `387` and Frd # `0.62`. _(observed: nd-irr-000002)_
9. WHEN the case of criterion 8 is run with the LEFT n changed from .06 to .2 and nothing else changed THE SYSTEM SHALL print WS ELEV `12.52`, Depth `11.0`, Area `1657`, Top Wid `390`, Hyd R `4.2`, Flow Type `SUBCRITICAL`, Chan Vel `7.8`, Wet Per `391` and Frd # `0.63`. _(observed: nd-irr-000003, nd-irr-000002)_
10. WHEN the case of criterion 8 is run with the RIGHT n changed from .08 to .2 and nothing else changed THE SYSTEM SHALL print WS ELEV `12.37`, Depth `10.9`, Area `1599`, Top Wid `388`, Hyd R `4.1`, Flow Type `SUBCRITICAL`, Chan Vel `7.7`, Wet Per `389` and Frd # `0.62`. _(observed: nd-irr-000004, nd-irr-000002)_
11. WHEN Begin Calculations is pressed for the 40-point section with banks 150 and 260, n values .06, .035 and .08, and discharge 30000 THE SYSTEM SHALL print WS ELEV `19.10`, Depth `17.6`, Area `4226`, Top Wid `390`, Hyd R `10.8`, Flow Type `SUBCRITICAL`, Chan Vel `11.4`, Wet Per `391` and Frd # `0.51`, and stay on the result screen with no other screen shown. _(observed: nd-irr-000005)_
12. WHEN the water-surface elevation is above both end points of the section (elevations 12 at station 0 and 12.5 at station 390) THE SYSTEM SHALL print a Top Wid of `390`, the distance from the first to the last station, and a Wet Per of `391`, the same as at WS ELEV `12.52`. _(observed: nd-irr-000005, nd-irr-000003)_
13. WHEN the computed WS ELEV is above the elevation of the first or the last ground point THE SYSTEM SHALL print "EXTENDED CROSS SECTION" at the right of row 24 of the result screen; at WS ELEV `12.22` (above the left end at 12, below the right end at 12.5) it SHALL print it too, and at WS ELEV `8.60` (below both ends) it SHALL NOT. _(observed: oracle/goldens/captures/nd-irr-000002/screen-92.txt, oracle/goldens/captures/nd-irr-000003/screen-91.txt, oracle/goldens/captures/nd-irr-000004/screen-91.txt, oracle/goldens/captures/nd-irr-000005/screen-91.txt, oracle/goldens/captures/nd-irr-000001/screen-91.txt)_

### Requirement 4: Forms for the regular shapes

**User Story:** As a floodplain permit reviewer, I want each mode and regular shape to ask for
the same values in the same order as QUICK-2, so that I can enter a culvert or ditch the way I
always did.

All three modes use one form layout: the mode and shape on rows 3 and 4, INPUT VARIABLES on
rows 8 to 11, OUTPUT VARIABLES on rows 15 to 18, and the prompt on row 20.

#### Acceptance Criteria

1. WHEN Critical Depth, Channel Capacity or Normal Depth is chosen with V - Ditch THE SYSTEM SHALL ask for Left Side Slope, Right Side Slope and Manning's n, then Discharge (Critical Depth, Normal Depth) or Depth (Channel Capacity), then Slope, then show "Begin Calculations  <Enter>", and print Bottom Width as `0.0` without asking for it. _(observed: cd-vdit-000001, cc-vdit-000001, nd-vdit-000001)_
2. WHEN Critical Depth, Channel Capacity or Normal Depth is chosen with Rectangular Channel THE SYSTEM SHALL ask for Bottom Width and Manning's n, then Discharge or Depth, then Slope, and print both side slopes as `0.0:1` without asking for them. _(observed: cd-rect-000001, cc-rect-000001, nd-rect-000001)_
3. WHEN Critical Depth, Channel Capacity or Normal Depth is chosen with Trapezoidal Channel THE SYSTEM SHALL ask for Left Side Slope, Right Side Slope, Bottom Width and Manning's n, then Discharge or Depth, then Slope. _(observed: cd-trap-000001, cc-trap-000001, nd-trap-000003)_
4. WHEN Critical Depth, Channel Capacity or Normal Depth is chosen with Circular Channel THE SYSTEM SHALL ask for Diameter, labelled "Diameter (in)", and Manning's n, then Discharge or Depth, then Slope, and show no side slope or bottom width fields. _(observed: cd-circ-000001, cc-circ-000001, nd-circ-000001)_
5. WHEN a Circular Channel result is shown in any of the three modes THE SYSTEM SHALL print a "Max Discharge(cfs)" output on row 18; it SHALL NOT appear for the other shapes. _(observed: cd-circ-000001, cc-circ-000001, nd-circ-000001, cd-vdit-000001, cc-trap-000001)_
6. WHEN Begin Calculations has computed a result THE SYSTEM SHALL add "Print <F5>" and "New Shape <F9>" to the key lines below the prompt. _(observed: cd-vdit-000001, cc-rect-000001, nd-circ-000001)_

### Requirement 5: Critical Depth on the regular shapes

**User Story:** As a floodplain permit reviewer, I want Quickened to give the critical depth and
critical slope QUICK-2 printed, so that I can check a crossing against it.

#### Acceptance Criteria

1. WHEN Critical Depth computes a result THE SYSTEM SHALL print Froude # `1.0`, Flow Type `CRITICAL`, and a Critical Slope on row 11. _(observed: cd-vdit-000001, cd-rect-000001, cd-trap-000001, cd-circ-000001)_
2. WHEN Critical Depth is run on a V - Ditch with Left Side Slope 2, Right Side Slope 3, Manning's n .035, Discharge 100 and Slope .005 THE SYSTEM SHALL print Depth `2.50`, Critical Slope `0.0187`, Area `15.6`, Wet Perimeter `13.5`, Velocity `6.3`, Hyd Radius `1.2` and Top Width `12.5`. _(observed: cd-vdit-000001)_
3. WHEN Critical Depth is run on a Rectangular Channel with Bottom Width 10, Manning's n .035, Discharge 300 and Slope .005 THE SYSTEM SHALL print Depth `3.03`, Critical Slope `0.0232`, Area `30.3`, Wet Perimeter `16.1`, Velocity `9.9`, Hyd Radius `1.9` and Top Width `10.0`. _(observed: cd-rect-000001)_
4. WHEN Critical Depth is run on a Rectangular Channel with Bottom Width 10, Manning's n .035, Discharge 164 and Slope .005 THE SYSTEM SHALL print Depth `2.03`, Critical Slope `0.0223`, Area `20.3`, Wet Perimeter `14.1`, Velocity `8.1`, Hyd Radius `1.4` and Top Width `10.0`. _(observed: cd-rect-000002)_
5. WHEN Critical Depth is run on a Trapezoidal Channel with Left Side Slope 3, Right Side Slope 2, Bottom Width 10, Manning's n .035, Discharge 300 and Slope .005 THE SYSTEM SHALL print Depth `2.45`, Critical Slope `0.0157`, Area `39.5`, Wet Perimeter `23.2`, Velocity `7.6`, Hyd Radius `1.7` and Top Width `22.3`. _(observed: cd-trap-000001)_
6. WHEN Critical Depth is run on a Circular Channel with Diameter 36, Manning's n .013, Discharge 40 and Slope .005 THE SYSTEM SHALL print Depth `2.05`, Critical Slope `0.0054`, Area `5.2`, Wet Perimeter `5.9`, Velocity `7.7`, Hyd Radius `0.9`, Top Width `2.8` and Max Discharge `53`. _(observed: cd-circ-000001)_
7. WHEN the Circular Channel case of criterion 6 is run with Slope .001 instead of .005 THE SYSTEM SHALL print every output exactly as in criterion 6, including Max Discharge `53`; only the Slope echo changes, to `0.0010`. _(observed: cd-circ-000002, cd-circ-000001)_

### Requirement 6: Channel Capacity on the regular shapes

**User Story:** As a floodplain permit reviewer, I want Quickened to give the discharge QUICK-2
printed for a given depth, so that a capacity check reads the same in both.

#### Acceptance Criteria

1. WHEN Channel Capacity computes a result THE SYSTEM SHALL print the computed discharge in the Discharge (cfs) field on row 10 and echo the entered Depth in the Depth (ft) field with two decimals. _(observed: cc-vdit-000001, cc-rect-000001, cc-trap-000001, cc-circ-000001)_
2. WHEN Channel Capacity computes a result for a V - Ditch, Rectangular or Trapezoidal Channel THE SYSTEM SHALL print the discharge with no decimals; for a Circular Channel it SHALL print it with one decimal. _(observed: cc-vdit-000001, cc-rect-000001, cc-trap-000001, cc-circ-000001, cc-circ-000002)_
3. WHEN Channel Capacity is run on a V - Ditch with Left Side Slope 2, Right Side Slope 3, Manning's n .035, Depth 2.5 and Slope .005 THE SYSTEM SHALL print Discharge `52`, Area `15.6`, Wet Perimeter `13.5`, Velocity `3.3`, Hyd Radius `1.2`, Top Width `12.5`, Froude # `0.5` and Flow Type `SUBCRITICAL`. _(observed: cc-vdit-000001)_
4. WHEN Channel Capacity is run on a Rectangular Channel with Bottom Width 10, Manning's n .035, Depth 3 and Slope .005 THE SYSTEM SHALL print Discharge `137`, Area `30.0`, Wet Perimeter `16.0`, Velocity `4.6`, Hyd Radius `1.9`, Top Width `10.0`, Froude # `0.5` and Flow Type `SUBCRITICAL`. _(observed: cc-rect-000001)_
5. WHEN Channel Capacity is run on a Trapezoidal Channel with Left Side Slope 3, Right Side Slope 2, Bottom Width 10, Manning's n .035, Depth 3.27 and Slope .005 THE SYSTEM SHALL print Discharge `297`, Area `59.4`, Wet Perimeter `27.7`, Velocity `5.0`, Hyd Radius `2.1`, Top Width `26.4`, Froude # `0.6` and Flow Type `SUBCRITICAL`. _(observed: cc-trap-000001)_
6. WHEN Channel Capacity is run on a Circular Channel with Diameter 36, Manning's n .013, Depth 1.5 and Slope .005 THE SYSTEM SHALL print Discharge `23.6`, Area `3.5`, Wet Perimeter `4.7`, Velocity `6.7`, Hyd Radius `0.8`, Top Width `3.0`, Froude # `1.1`, Max Discharge `51` and Flow Type `SUPERCRITICAL`. _(observed: cc-circ-000001)_
7. WHEN Channel Capacity is run on a Circular Channel with Diameter 72, Manning's n .013, Depth 3 and Slope .005 THE SYSTEM SHALL print Discharge `149.7`, Area `14.1`, Wet Perimeter `9.4`, Velocity `10.6`, Hyd Radius `1.5`, Top Width `6.0`, Froude # `1.2`, Max Discharge `322` and Flow Type `SUPERCRITICAL`. _(observed: cc-circ-000002)_

### Requirement 7: Normal Depth on the V - Ditch, rectangle and circle

**User Story:** As a floodplain permit reviewer, I want Quickened to give the normal depth QUICK-2
printed for each regular shape, so that its water-surface answers match.

#### Acceptance Criteria

1. WHEN Normal Depth is run on a V - Ditch with Left Side Slope 2, Right Side Slope 3, Manning's n .035, Discharge 100 and Slope .005 THE SYSTEM SHALL print Depth `3.20`, Area `25.6`, Wet Perimeter `17.3`, Velocity `3.9`, Hyd Radius `1.5`, Top Width `16.0`, Froude # `0.5` and Flow Type `SUBCRITICAL`. _(observed: nd-vdit-000001)_
2. WHEN Normal Depth is run on a Rectangular Channel with Bottom Width 10, Manning's n .035, Discharge 137 and Slope .005 THE SYSTEM SHALL print Depth `3.00`, Area `30.0`, Wet Perimeter `16.0`, Velocity `4.6`, Hyd Radius `1.9`, Top Width `10.0`, Froude # `0.5` and Flow Type `SUBCRITICAL`. _(observed: nd-rect-000001)_
3. WHEN Normal Depth is run on a Circular Channel with Diameter 36, Manning's n .013, Discharge 40 and Slope .005 THE SYSTEM SHALL print Depth `2.12`, Area `5.3`, Wet Perimeter `6.0`, Velocity `7.5`, Hyd Radius `0.9`, Top Width `2.7`, Froude # `0.9`, Max Discharge `51` and Flow Type `SUBCRITICAL`. _(observed: nd-circ-000001)_

### Requirement 8: What the regular-shape prompts accept

**User Story:** As a developer, I want Quickened's inputs to take and echo values the way
QUICK-2's did, including values too large for their fields, so that odd entries give the same
screen in both.

#### Acceptance Criteria

1. WHEN a value larger than its print field is entered THE SYSTEM SHALL accept it and echo it with a leading `%`: Left Side Slope 100 as `%100.0`, 123456789 as `% 1.2E+08`, Bottom Width 99999 as `%99999.0`, Manning's n 12.5 as `%12.5000`, Depth 1000 as `%1000.00`, Slope 12.5 as `%12.5000` and Discharge 1234567 as `%1234567`. _(observed: obs-fieldover-000001, obs-fieldedge-000001, obs-smallaccept-000001)_
2. WHEN Side Slope 99.9, Bottom Width 9999.9, Manning's n 9.9999, Depth 999.99 and Slope 9.9999 are entered THE SYSTEM SHALL echo them as `99.9`, `9999.9`, `9.9999`, `999.99` and `9.9999`, with no `%`. _(observed: obs-fieldedge-000001)_
3. WHEN Diameter 9999.9 and Discharge 999999 are entered THE SYSTEM SHALL echo them as `9999.9` and `999999`, with no `%`. _(observed: obs-fieldedge-000002)_
4. WHEN a non-zero value too small for its field is entered (Left Side Slope .04, Manning's n .00001, Slope .00001) THE SYSTEM SHALL accept it, not hold the prompt, and echo it as `0.0` or `0.0000`. _(observed: obs-smallaccept-000001)_
5. WHEN Channel Capacity is run on a Circular Channel with Diameter 36 and a Depth of 4, deeper than the 3 ft pipe THE SYSTEM SHALL hold the Depth prompt with no message. _(observed: cc-circ-000018)_
6. WHEN 0 is entered at the Diameter prompt of the Normal Depth circle form THE SYSTEM SHALL hold that prompt with no message. _(observed: nd-circ-000008)_

### Requirement 9: Normal Depth on a real lidar section (Grapevine Branch)

**User Story:** As a floodplain permit reviewer, I want Quickened to give the water-surface
elevation QUICK-2 gives for a real Zone A section cut from lidar, at the low, typical and high
ends of the published n ranges, so that I can trust it on the sections I actually review.

The section used in these cases is `realdata/huntington-section-01.json`: Grapevine Branch, a
perennial FEMA Zone A stream (FIRM 54011C) in Cabell County, West Virginia, about 4 miles
south-east of downtown Huntington. It is a 500 ft line drawn perpendicular to the NHD flowline
(NHD 58000967), with 40 points 12.82 ft apart, station 0 at the left end looking downstream.
Each elevation (ft NAVD88) comes from the USGS 3DEP 1 m lidar DEM (project
WV_FEMAR3_Southcentral_2018_D19) through the USGS Elevation Point Query Service, rounded to two
decimals. The points, as entered:

0 660.4, 12.82 657.09, 25.64 653.35, 38.46 647.73, 51.28 641.36, 64.1 634.82, 76.92 626.02,
89.74 619.92, 102.56 613.3, 115.38 607.79, 128.21 603.72, 141.03 601.16, 153.85 596.87,
166.67 593.53, 179.49 591.78, 192.31 590.79, 205.13 589.22, 217.95 590.99, 230.77 591.95,
243.59 592.41, 256.41 592.81, 269.23 593.01, 282.05 593.6, 294.87 594.61, 307.69 596.45,
320.51 597.63, 333.33 597.93, 346.15 596.42, 358.97 595.75, 371.79 595.75, 384.62 595.71,
397.44 595.32, 410.26 595.59, 423.08 597.79, 435.9 602.38, 448.72 602.3, 461.54 602.04,
474.36 606.79, 487.18 613.53, 500 615.76.

The other inputs are discharge 1200 cfs, the 1-percent AEP flood from USGS StreamStats
(regression region GC2081, drainage area 2.70 mi², 90% prediction interval 624 to 2,310 cfs);
slope .0035, an estimate from the 3DEP thalweg profile along the NHD line, not a survey; and
bank stations 179.49 and 230.77, the tops of the lidar channel notch, suggested from the profile
and not a field determination. The file lists its caveats: lidar does not see below the water
surface, so channel area below it is missing; 12.8 ft spacing makes the banks coarse; the
discharge is a regional regression estimate.

Manning's n is an assumption: nobody has seen the site. The values are from Chow (1959), as
reproduced in the HEC-RAS Hydraulic Reference Manual, Table 3-1: channel, "minor stream, clean,
winding, some pools and shoals", .033 / .040 / .045 (minimum / normal / maximum); both
overbanks, "floodplain, light brush and trees, in summer", .040 / .060 / .080. The cases run
all three columns, the same column for channel and both overbanks. It is called "the Grapevine
section" below.

#### Acceptance Criteria

1. WHEN the Grapevine section's stations and elevations are entered THE SYSTEM SHALL show each in the GROUND POINTS grid as typed, two decimals where two were typed and none where none were (`12.82`, `660.4`, `0`, `500`). _(observed: nd-irr-000006, oracle/goldens/captures/nd-irr-000006/screen-91.txt)_
2. WHEN bank stations 179.49 and 230.77 are entered for the Grapevine section THE SYSTEM SHALL accept them as matching ground points and echo them as `179.5` and `230.8`. _(observed: nd-irr-000006, nd-irr-000007, nd-irr-000008)_
3. WHEN Begin Calculations is pressed for the Grapevine section with the all-minimum n values (LEFT .04, CHANNEL .033, RIGHT .04), discharge 1200 and slope .0035 THE SYSTEM SHALL print WS ELEV `593.98`, Depth `4.8`, Area `249`, Top Wid `122`, Hyd R `2.0`, Flow Type `SUBCRITICAL`, Chan Vel `5.9`, Wet Per `122` and Frd # `0.67`. _(observed: nd-irr-000007)_
4. WHEN Begin Calculations is pressed for the Grapevine section with the all-normal n values (LEFT .06, CHANNEL .04, RIGHT .06), discharge 1200 and slope .0035 THE SYSTEM SHALL print WS ELEV `594.37`, Depth `5.2`, Area `298`, Top Wid `128`, Hyd R `2.3`, Flow Type `SUBCRITICAL`, Chan Vel `5.2`, Wet Per `129` and Frd # `0.55`. _(observed: nd-irr-000006)_
5. WHEN Begin Calculations is pressed for the Grapevine section with the all-maximum n values (LEFT .08, CHANNEL .045, RIGHT .08), discharge 1200 and slope .0035 THE SYSTEM SHALL print WS ELEV `594.65`, Depth `5.4`, Area `333`, Top Wid `133`, Hyd R `2.5`, Flow Type `SUBCRITICAL`, Chan Vel `4.9`, Wet Per `133` and Frd # `0.50`. _(observed: nd-irr-000008)_
6. WHEN bank station 230.8, the printed form of the ground station 230.77, is entered as the RIGHT bank of the Grapevine section THE SYSTEM SHALL show "ERROR! RIGHT Bank Station DOES NOT MATCH a Ground Point. Press <ENTER>"; a bank station matches only a ground station as entered, not as printed. _(observed: nd-irr-000009)_
7. WHEN Begin Calculations is pressed for the Grapevine section with the all-normal n values, discharge 3000 and slope .0035 THE SYSTEM SHALL print WS ELEV `596.37`, Depth `7.2`, Area `623`, Top Wid `219`, Hyd R `2.8`, Flow Type `SUBCRITICAL`, Chan Vel `7.0`, Wet Per `220` and Frd # `0.62`. At that elevation the ground points cross the water surface at 155.77 and 307.13 ft around the channel (151.4 ft) and at 347.11 and 414.81 ft around the low ground on the right overbank (67.7 ft), which the 597.93 ft point at station 333.33 cuts off from the channel; Top Wid `219` is their sum, so the cut-off low ground is counted as wet. _(observed: nd-irr-000010)_

### Requirement 10: What the irregular ground-points editor accepts

**User Story:** As a developer, I want Quickened's ground-point entry to take and refuse the same
points QUICK-2 did, so that the generator can draw sections both programs accept and a mistyped
section fails the same way in both.

#### Acceptance Criteria

1. WHEN F10 is pressed after the elevation of the second ground point THE SYSTEM SHALL end ground-point entry and show "Enter  LEFT  Channel Bank Station  and Press  <Enter>". _(observed: obs-irrtwopt-000001, oracle/goldens/captures/obs-irrtwopt-000001/screen-05.txt)_
2. WHEN Normal Depth is run on the two ground points (0, 10) and (10, 2) with bank stations 0 and 10, n values .05, .035 and .05, discharge 100 and slope .005 THE SYSTEM SHALL print WS ELEV `7.60`, Depth `5.6`, Area `20`, Top Wid `7`, Hyd R `2.2`, Flow Type `SUBCRITICAL`, Chan Vel `5.1`, Wet Per `9`, Frd # `0.54` and "EXTENDED CROSS SECTION" on row 24. _(observed: obs-irrtwopt-000001, oracle/goldens/captures/obs-irrtwopt-000001/screen-13.txt)_
3. WHEN a station equal to the station before it is entered (35 after 35) THE SYSTEM SHALL print "ERROR ... Stations  35  ,  35  are NOT INCREASING !" on row 24. _(observed: obs-irrelev-000001, oracle/goldens/captures/obs-irrelev-000001/screen-09.txt)_
4. WHEN a station lower than the station before it is entered (-60 after -50) THE SYSTEM SHALL print "ERROR ... Stations -50  , -60  are NOT INCREASING !" on row 24. _(observed: obs-irrstation-000001, oracle/goldens/captures/obs-irrstation-000001/screen-05.txt)_
5. WHEN the first station is negative (-50) THE SYSTEM SHALL accept it, show it as `-50`, and move to its elevation. _(observed: obs-irrstation-000001, oracle/goldens/captures/obs-irrstation-000001/screen-04.txt)_
6. WHEN an elevation of 0 is entered THE SYSTEM SHALL show `0` but not take it: the next value typed (5) replaces it as the same point's elevation, and the point after it starts at the next station field. _(observed: obs-irrelev-000001, oracle/goldens/captures/obs-irrelev-000001/screen-05.txt, oracle/goldens/captures/obs-irrelev-000001/screen-06.txt)_
7. WHEN a negative elevation (-2) is entered THE SYSTEM SHALL blank that elevation and return to the same point's station: the next two values typed (35, 3) become that point's station and elevation. _(observed: obs-irrelev-000001, oracle/goldens/captures/obs-irrelev-000001/screen-07.txt, oracle/goldens/captures/obs-irrelev-000001/screen-08.txt)_

### Requirement 11: Step-Backwater, first cross section

**User Story:** As a floodplain permit reviewer, I want Quickened to start a Step-Backwater run
the way QUICK-2 did, from a slope or a known water-surface elevation at the downstream section,
so that the starting water surface matches before any upstream section is added.

Only the first (downstream) section is covered. Adding a second section needs F8 (New XSEC),
which the harness cannot yet send, so reach lengths, loss coefficients and the step between
sections are not observed.

#### Acceptance Criteria

1. WHEN Step-Backwater (4) is chosen on the main menu THE SYSTEM SHALL show "Starting Water Surface Elevation Method" with the two choices "NORMAL DEPTH (Slope-Area)" and "KNOWN WATER SURFACE ELEVATION" and one prompt, "Enter a Slope or an Elevation:", and then go to a GROUND POINTS editor titled ">> STEP - BACKWATER <<" without asking for a shape. _(observed: sb-irr-000001, oracle/goldens/captures/sb-irr-000001/screen-02.txt)_
2. WHEN ground-point entry ends on the first section THE SYSTEM SHALL ask for the LEFT and RIGHT bank stations, the LEFT, CHANNEL and RIGHT n values and the Discharge, then show "TO BEGIN CALCULATIONS     Press  <Enter>", with no slope, reach-length or loss-coefficient prompt, and leave the CHANNEL REACH LENGTHS and LOSS COEFFICIENTS fields blank in the result. _(observed: sb-irr-000001, sb-irr-000002, sb-irr-000003)_
3. WHEN Begin Calculations is pressed for the 40-point section of Requirement 3 with starting slope .002, banks 150 and 260, n values .06, .035 and .08, and discharge 2500 THE SYSTEM SHALL print WS ELEV `8.60`, Depth `7.10`, Top Wid `130`, Kratio `1.00`, EG ELEV `9.01`, Flow Regime `M-1`, ChanVel `5.11` and Froud# `0.46`; the WS ELEV is the one Normal Depth prints for the same section and slope. _(observed: sb-irr-000001, nd-irr-000001)_
4. WHEN Begin Calculations is pressed for the Grapevine section (Requirement 9) with starting slope .0035, banks 179.49 and 230.77, n values .06, .04 and .06, and discharge 1200 THE SYSTEM SHALL print WS ELEV `594.37`, Depth `5.15`, Top Wid `128`, Kratio `1.00`, EG ELEV `594.73`, Flow Regime `M-1`, ChanVel `5.21` and Froud# `0.55`; the WS ELEV is the one Normal Depth prints for the same inputs. _(observed: sb-irr-000002, nd-irr-000006)_
5. WHEN Begin Calculations is pressed for the Grapevine section with known starting elevation 596 and the inputs of criterion 4 otherwise THE SYSTEM SHALL print WS ELEV `596.00`, Depth `6.78`, Top Wid `206`, Kratio `1.00`, EG ELEV `596.11`, Flow Regime `M-1`, ChanVel `3.09` and Froud# `0.29`. _(observed: sb-irr-000003)_
6. WHEN a Step-Backwater result is shown THE SYSTEM SHALL print WS ELEV, EG ELEV, Depth, ChanVel, Froud# and Kratio with two decimals and Top Wid with none, where Normal Depth on the same section prints Depth and Chan Vel with one decimal (`5.15` against `5.2`, `5.21` against `5.2`). _(observed: sb-irr-000002, nd-irr-000006, sb-irr-000001, nd-irr-000001)_
