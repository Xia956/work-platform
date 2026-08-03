<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## UI design system (required)

Before creating or modifying any page, component, or visual style, read `DESIGN_SYSTEM.md` completely.

- Use the semantic tokens and reusable primitives documented there.
- Do not introduce arbitrary font sizes, colors, spacing, radii, borders, shadows, or control heights in page components.
- Prefer components from `src/components/ui/` and semantic classes from `src/app/globals.css`.
- A new visual value is allowed only when the user explicitly requests it or no existing token can express a required state. In that case, add the token to `DESIGN_SYSTEM.md` and `globals.css` before using it.
- Preserve the current warm editorial brand direction. The AI copy-optimization panel is the primary reference for density, borders, controls, and interaction states, but its tinted background is a contextual AI-only treatment and must not be applied globally.
