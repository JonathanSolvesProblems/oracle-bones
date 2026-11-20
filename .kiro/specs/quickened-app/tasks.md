# Implementation Plan

- [ ] 1. App shell
  - [ ] 1.1 Set up Vite, TypeScript, Vitest and fast-check in `app/`, with an offline service worker
    - _Requirements: 1.3_
  - [ ] 1.2 Build the mode and shape picker and the input forms
    - _Requirements: 1.1, 1.2_

- [ ] 2. Results
  - [ ] 2.1 Connect the solver and format modules to the results view
    - _Requirements: 2.1_
  - [ ] 2.2 Add the notice to the results and print views, and test it
    - _Requirements: 2.3_
  - [ ] 2.3 Show hauntings beside printed values
    - _Requirements: 2.2_

- [ ] 3. Files
  - [ ] 3.1 Read and write `.XSC` and prove the saved file opens in the original
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 3.2 Write the HEC-2 export and compare it with the original's output
    - _Requirements: 4.2_
  - [ ]* 3.3 Check whether HEC-RAS imports the export, and record the result in `results/`
    - _Requirements: 4.2_

- [ ] 4. Print and proof
  - [ ] 4.1 Build the print view
    - _Requirements: 4.1_
  - [ ] 4.2 Build the proof page from saved oracle screens and `results/headline.md`
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 5. Finish
  - [ ] 5.1 Run one Playwright end-to-end test at desktop and phone widths
    - _Requirements: 1.1, 2.1_
  - [ ] 5.2 Deploy the static site, and check it logged out in a private window
    - _Requirements: 1.3_
