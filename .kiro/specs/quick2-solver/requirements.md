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
