# Duly: research and design package

A standalone package for the project repo. It carries the four research reports and the nine approved design screens. It does not modify or include the WorkBook handoff, which stays a separate package.

```
research/
  Duly market and pricing validation.md      market size, pain evidence, competitor pricing, the pricing model
  Duly compliance and system design.md       UPL positioning, CA and TX privacy build, zero-error architecture,
                                             AI-legal-assistant lessons, security playbook, the Duly doctrine
  Duly backend and agent factory.md          backend shape and the multi-agent build system with its gate pipeline
  cutlines.md                                what v0 leaves out, why, and the trigger that brings each one in
  notes/                                     the raw per-topic research notes behind the three reports, with sources
design/
  DESIGN-SPEC.md                             the written spec: tokens, motion, laws, and all nine screens behavior by behavior
  canvas.json                                canvas layout, titles, and sizes for the nine artboards
  screens/index.html                         gallery: previews every screen, click to open full size
  screens/*.dc.html                          the nine screens, each a working page
  screens/support.js                         small standalone runtime so the screens open with no build step
  png/                                       a render of each screen plus its expanded state
```

## The nine screens, settled

Home, Timeline, Documents, Checklists, Updates, WorkBook, Mobile home, Scenarios, Onboarding.

The plan's phrase "the nine approved canvas screens plus Case, Settings, Feedback, Billing placeholder" means those four are additions that were never drawn. Where the master plan scope also lists Case and Feedback, it is naming app destinations, not canvas artboards. The table at the top of DESIGN-SPEC.md is the authority.

## Reading the screens

Open `design/screens/index.html` first. Every screen is a real page: accordions expand, checklists toggle and recompute, scenario tabs switch, onboarding advances and remembers selections, confetti fires on completed phases. All nine were verified rendering at their canvas size with no unresolved template holes and no console errors.

Two honest notes. `support.js` is a viewer written for this handoff, not product code; the app rebuilds these screens in React against real endpoints. The PNGs were rendered in a container that could not reach Google Fonts, so they show correct layout with a substituted typeface: trust the HTML for typography.

## Pricing, in one place

Free core for the commodity layer (timelines, clock, digest, basic vault). Duly Pro at 79 USD a year, billed annually, 14-day refund. One-time fear-moment packs: OPT Filing Pack 49, RFE and Audit Evidence Pack 99, Travel-Readiness Check 29. Web billing, never the app store. The reasoning, the competitor anchors, and the conversion math are in the market and pricing report.

## Copy rules already enforced in these files

No em dashes or en dashes anywhere. Nothing says sealed, cryptographic, or AI-generated. Every AI surface carries sources, a rule pack version, and the disclaimer footer. Verified by grep across all nine screens and the spec.
