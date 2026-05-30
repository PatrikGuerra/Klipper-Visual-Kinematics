export interface CreditItem {
  name: string;
  repoUrl: string;
  usageRank: number;
}

export const credits: CreditItem[] = [
  { name: 'SolidJS', repoUrl: 'https://github.com/solidjs/solid', usageRank: 10 },
  { name: 'Vite Plugin Solid', repoUrl: 'https://github.com/solidjs/vite-plugin-solid', usageRank: 11 },
  { name: 'CodeMirror', repoUrl: 'https://github.com/codemirror/basic-setup', usageRank: 20 },
  { name: 'CodeMirror Autocomplete', repoUrl: 'https://github.com/codemirror/autocomplete', usageRank: 21 },
  { name: 'CodeMirror View', repoUrl: 'https://github.com/codemirror/view', usageRank: 22 },
  { name: 'CodeMirror State', repoUrl: 'https://github.com/codemirror/state', usageRank: 23 },
  { name: 'CodeMirror Language', repoUrl: 'https://github.com/codemirror/language', usageRank: 24 },
  { name: 'CodeMirror Search', repoUrl: 'https://github.com/codemirror/search', usageRank: 25 },
  { name: 'Lezer Highlight', repoUrl: 'https://github.com/lezer-parser/highlight', usageRank: 26 },
  { name: 'Pako', repoUrl: 'https://github.com/nodeca/pako', usageRank: 30 },
  { name: 'Lucide Solid', repoUrl: 'https://github.com/lucide-icons/lucide', usageRank: 40 },
  { name: 'Tailwind CSS', repoUrl: 'https://github.com/tailwindlabs/tailwindcss', usageRank: 50 },
  { name: 'PostCSS', repoUrl: 'https://github.com/postcss/postcss', usageRank: 52 },
  { name: 'Autoprefixer', repoUrl: 'https://github.com/postcss/autoprefixer', usageRank: 53 },
  { name: 'Vite', repoUrl: 'https://github.com/vitejs/vite', usageRank: 60 },
  { name: 'TypeScript', repoUrl: 'https://github.com/microsoft/TypeScript', usageRank: 61 },
  { name: 'tslib', repoUrl: 'https://github.com/microsoft/tslib', usageRank: 62 },
  { name: 'Vitest', repoUrl: 'https://github.com/vitest-dev/vitest', usageRank: 63 },
  { name: 'jsdom', repoUrl: 'https://github.com/jsdom/jsdom', usageRank: 64 },
  { name: 'DefinitelyTyped', repoUrl: 'https://github.com/DefinitelyTyped/DefinitelyTyped', usageRank: 65 }
];
