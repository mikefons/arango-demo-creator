import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#071A0E",
          secondary: "#0D2316",
          tertiary: "#132B1A",
        },
        border: {
          DEFAULT: "#1E4A2A",
          subtle: "#162F1E",
        },
        // Arango lime-green accent (matches brand primary)
        arango: {
          50:  "#f4fce4",
          100: "#e9f8c9",
          200: "#d2f09a",
          300: "#b8e560",
          400: "#a3e635", // primary — matches website CTA button
          500: "#84cc16",
          600: "#65a30d",
          700: "#4d7c0f",
          900: "#1a3305",
        },
        // Keep a complementary green for indicators
        emerald: {
          400: "#34D399",
          500: "#10B981",
        },
        muted: {
          DEFAULT: "#7FAF8A",
          foreground: "#4D7A5A",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-violet": "pulseViolet 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGreen: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(163, 230, 53, 0.35)" },
          "50%": { boxShadow: "0 0 0 8px rgba(163, 230, 53, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
