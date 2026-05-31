export interface CreditItem {
  name: string;
  repoUrl: string;
  usage: string;
  usageRank: number;
}

export const credits: CreditItem[] = [
  { name: 'SolidJS', repoUrl: 'https://github.com/solidjs/solid', usage: 'reactive UI framework for the app panels, modals and controls.', usageRank: 10 },
  { name: 'Vite Plugin Solid', repoUrl: 'https://github.com/solidjs/vite-plugin-solid', usage: 'connects Solid components to the Vite build pipeline.', usageRank: 11 },
  { name: 'CodeMirror', repoUrl: 'https://github.com/codemirror/basic-setup', usage: 'base editor used by the macro G-code block.', usageRank: 20 },
  { name: 'CodeMirror Autocomplete', repoUrl: 'https://github.com/codemirror/autocomplete', usage: 'powers command, parameter and macro suggestions in the editor.', usageRank: 21 },
  { name: 'CodeMirror View', repoUrl: 'https://github.com/codemirror/view', usage: 'renders the editable G-code document and cursor interactions.', usageRank: 22 },
  { name: 'CodeMirror State', repoUrl: 'https://github.com/codemirror/state', usage: 'manages editor document state and extension configuration.', usageRank: 23 },
  { name: 'CodeMirror Language', repoUrl: 'https://github.com/codemirror/language', usage: 'defines the custom G-code language mode and syntax hooks.', usageRank: 24 },
  { name: 'CodeMirror Search', repoUrl: 'https://github.com/codemirror/search', usage: 'adds search support inside the macro editor.', usageRank: 25 },
  { name: 'Lezer Highlight', repoUrl: 'https://github.com/lezer-parser/highlight', usage: 'provides highlight tags used by the G-code theme.', usageRank: 26 },
  { name: 'Pako', repoUrl: 'https://github.com/nodeca/pako', usage: 'compresses editable app state into compact share URLs.', usageRank: 30 },
  { name: 'Lucide Solid', repoUrl: 'https://github.com/lucide-icons/lucide', usage: 'icon set used in actions, panels and modal buttons.', usageRank: 40 },
  { name: 'Tailwind CSS', repoUrl: 'https://github.com/tailwindlabs/tailwindcss', usage: 'utility CSS layer used alongside the custom app stylesheet.', usageRank: 50 },
  { name: 'PostCSS', repoUrl: 'https://github.com/postcss/postcss', usage: 'processes the Tailwind and app CSS during builds.', usageRank: 52 },
  { name: 'Autoprefixer', repoUrl: 'https://github.com/postcss/autoprefixer', usage: 'adds browser vendor prefixes to generated CSS.', usageRank: 53 },
  { name: 'Vite', repoUrl: 'https://github.com/vitejs/vite', usage: 'development server, production bundler and asset pipeline.', usageRank: 60 },
  { name: 'TypeScript', repoUrl: 'https://github.com/microsoft/TypeScript', usage: 'type checking for app state, kinematics, macros and UI code.', usageRank: 61 },
  { name: 'tslib', repoUrl: 'https://github.com/microsoft/tslib', usage: 'runtime helpers emitted by TypeScript when needed.', usageRank: 62 },
  { name: 'Vitest', repoUrl: 'https://github.com/vitest-dev/vitest', usage: 'unit test runner for domain, store, parser and editor helpers.', usageRank: 63 },
  { name: 'jsdom', repoUrl: 'https://github.com/jsdom/jsdom', usage: 'browser-like DOM environment used by tests.', usageRank: 64 },
  { name: 'DefinitelyTyped', repoUrl: 'https://github.com/DefinitelyTyped/DefinitelyTyped', usage: 'community type definitions for packages that need them.', usageRank: 65 }
];
