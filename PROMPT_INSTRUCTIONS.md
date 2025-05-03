# Custom Prompt Directive for Bryneven Primary School ChatBot

This document defines a standardized set of instructions and contextual information for all AI-driven prompt interactions within the Bryneven Primary School Helper project. It ensures consistency, clarity, and alignment with project goals whenever generating or refining prompts.

---

## 1. Project Overview
- **Name:** Bryneven Primary School Helper ChatBot
- **Purpose:** Provide students, parents, and staff with a friendly, accessible AI assistant for school information, homework support, and educational resources.
- **Platform:** Web-based chat interface built with HTML, CSS, JavaScript (TailwindCSS, Font Awesome), and a Node.js backend (Express).

## 2. Audience & Tone
- **Audience:** Primary school students (ages 5–11), parents, and school staff.
- **Tone:** Warm, encouraging, simple, age-appropriate, and professional. Use friendly emojis sparingly (e.g., 😊, 👍) to build rapport.

## 3. Prompt Structure Guidelines
1. **Clarity & Brevity:** Keep prompts focused on a single task or question. Avoid ambiguity.
2. **Context Injection:** Include relevant project details (file structure, APIs, styling conventions) when asking for code changes or feature implementations.
3. **Styling References:** Reference the STYLE_DIRECTIVE.md file for visual consistency and design tokens. Follow TailwindCSS classes and Font Awesome icons in UI-related prompts.
4. **Best Practices:** Encourage DRY principles, modularization, accessibility (ARIA labels), and responsive design.
5. **Testing & Validation:** Remind to include or update unit/integration tests and validate changes with `npm test` or `get_errors`.

## 4. Code & API Conventions
- **File Locations:** 
  - Frontend assets under `/public` and root HTML/JS.
  - Styles in `styles.css` using Tailwind utility classes.
  - Backend routes in `/api/*.js` and `server.js`.
- **Configuration:** Use `config.js` for environment variables, API keys, and base URLs.
- **Error Handling:** Centralize logging in `logger.js` and return consistent JSON error responses.

## 5. UI/UX Standards
- **Layout:** Flex-based chat container, scrollable message history, sticky input area.
- **Components:** Standardize message bubbles (`.message.bot`, `.message.user`), suggestion buttons, and loading indicators.
- **Accessibility:** Ensure inputs have `aria-label`, high-contrast text, and keyboard navigation support.
- **Style Guide:** Reference and adhere to the style guidelines established in `STYLE_DIRECTIVE.md` to maintain consistent design and user experience across all pages.

## 6. Example Prompt Template
"""
You are an AI assistant for the Bryneven Primary School Helper ChatBot. The project uses TailwindCSS for styling and an Express backend. Follow the style guidelines in STYLE_DIRECTIVE.md for visual consistency. Please implement a new feature: [feature description]. Follow DRY principles, add unit tests under `/tests`, and ensure accessibility compliance. Provide only the diff using `insert_edit_into_file`."""

---

Place this directive at the root of the repository to guide all contributors and AI tools toward consistent, high-quality deliverables.