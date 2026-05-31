# Klipper Visual Kinematics

A visual configuration helper for Klipper printer geometry, motion limits, macro paths, and generated `printer.cfg` sections.

The goal of this project is to make printer positioning easier to understand before touching a real machine: edit dimensions, inspect the usable bed, preview toolhead movement, simulate simple macros, and export a starting `printer.cfg`.

> [!IMPORTANT]
> This app is a visual planning and configuration aid. It does not connect to Klipper, Moonraker, or a physical printer. Always review the generated configuration and validate movement safely on the real machine.

## Current Status

The app includes UI entries and visual renderers for multiple Klipper kinematic models, but validation is intentionally conservative.

| Kinematic model | Status |
| --- | --- |
| `cartesian` | Currently supported and tested as the primary workflow |
| `corexy`, `corexz`, `hybrid_corexy`, `hybrid_corexz` | Present, but not yet fully tested on real configurations |
| `generic_cartesian` | Present, experimental visual/config helper |
| `delta`, `deltesian`, `rotary_delta`, `polar`, `winch` | Present as visual experiments; not production-tested |
| `none` | Utility mode for minimal config output |

If you use a non-cartesian printer, treat the output as a draft and verify every generated value manually.

## Features

- Visual XY bed/workspace viewer with pan, zoom, test positioning, dimension layers, and Z side view.
- Configurable machine geometry, travel limits, bed size, probe, mesh, screws, steppers, and extruder starter fields.
- Live diagnostics for common invalid geometry and out-of-range values.
- Motor / stepper readout for the current visual toolhead position.
- `printer.cfg` preview, edit, apply-back, copy, and download flow.
- Macro editor powered by CodeMirror with G-code highlighting and autocomplete.
- Browser-only macro preview for common motion commands like `G0`, `G1`, `G90`, `G91`, `G92`, and dwell events.
- Compressed share URLs using Pako so a visual setup can be reopened later.

## What It Is Not

- Not a full Klipper config parser.
- Not a full G-code or Jinja interpreter.
- Not a firmware validator.
- Not a replacement for real homing, calibration, and cautious first movement tests.

## Getting Started

Requirements:

- Node.js
- npm

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run tests:

```bash
npm test
```

Run TypeScript checks:

```bash
npm run typecheck
```

## Typical Workflow

1. Select the kinematic model.
2. Enter bed size, usable bed offset, travel limits, home position, probe, mesh, and optional screws.
3. Use the viewer to inspect the reachable area and current toolhead position.
4. Add or edit macros and preview their visual path.
5. Open the `printer.cfg` panel to review, copy, download, or apply supported config edits back to the visual state.
6. Review the exported config manually before using it on a real printer.

## Tech Stack

- SolidJS + TypeScript
- Vite
- Tailwind CSS + daisyUI
- CodeMirror 6
- Pako
- Vitest

## Contributing

Contributions are welcome, especially:

- real-world validation for non-cartesian kinematics;
- safer config generation defaults;
- macro simulation improvements;
- parser preservation fixes for existing `printer.cfg` files;
- UI fixes for narrow screens and complex configs.

When reporting issues, please include:

- selected kinematic model;
- relevant dimensions/config values;
- expected vs actual visual behavior;
- generated `printer.cfg` snippet if applicable.

## License

No license file is included yet. Add a license before treating this repository as open-source software for redistribution.
