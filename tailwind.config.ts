import daisyui from 'daisyui';
import type { Config } from 'tailwindcss';

type DaisyConfig = Config & {
  daisyui?: {
    themes?: Array<Record<string, Record<string, string | boolean>>>;
    darkTheme?: string;
  };
};

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border-hsl))',
        input: 'hsl(var(--input-hsl))',
        ring: 'hsl(var(--ring-hsl))',
        background: 'hsl(var(--background-hsl))',
        foreground: 'hsl(var(--foreground-hsl))',
        primary: {
          DEFAULT: 'hsl(var(--primary-hsl))',
          foreground: 'hsl(var(--primary-foreground-hsl))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary-hsl))',
          foreground: 'hsl(var(--secondary-foreground-hsl))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted-hsl))',
          foreground: 'hsl(var(--muted-foreground-hsl))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent-hsl))',
          foreground: 'hsl(var(--accent-foreground-hsl))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive-hsl))',
          foreground: 'hsl(var(--destructive-foreground-hsl))'
        },
        card: {
          DEFAULT: 'hsl(var(--card-hsl))',
          foreground: 'hsl(var(--card-foreground-hsl))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      }
    }
  },
  daisyui: {
    darkTheme: 'klipper',
    themes: [
      {
        klipper: {
          primary: '#2563eb',
          'primary-content': '#ffffff',
          secondary: '#e2e8f0',
          'secondary-content': '#172033',
          accent: '#059669',
          'accent-content': '#ffffff',
          neutral: '#243047',
          'neutral-content': '#ffffff',
          'base-100': '#ffffff',
          'base-200': '#f4f7fb',
          'base-300': '#d7e0ea',
          'base-content': '#172033',
          info: '#0ea5e9',
          'info-content': '#ffffff',
          success: '#059669',
          'success-content': '#ffffff',
          warning: '#d97706',
          'warning-content': '#172033',
          error: '#dc2626',
          'error-content': '#ffffff',
          '--rounded-box': '8px',
          '--rounded-btn': '6px',
          '--rounded-badge': '999px',
          '--border-btn': '1px'
        }
      }
    ]
  },
  plugins: [daisyui]
} satisfies DaisyConfig;
