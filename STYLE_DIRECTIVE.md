Thought for a couple of seconds


Below is an updated version of your style guide, tailored specifically for a chatbot interface. Changes include:

* **Refined colour usage** for better chat-bubble contrast and clarity
* **Revised typography scale** for improved legibility in conversation flows
* **New component guidelines** for avatars, timestamps and typing indicators
* **Dark-mode support** to future-proof the design
* **ARIA and accessibility notes** for a more robust, inclusive experience

````markdown
# Bryneven Primary School ChatBot Style Guide

This design system ensures consistent, responsive and accessible styling for the Bryneven Primary School Helper ChatBot.

## Colour Palette
```css
:root {
  /* Primary branding colours */
  --primary-colour:     #4a6fa5;
  --primary-light:      #6e92c7;
  --primary-dark:       #2d4a79;

  /* Chat-bubble accents */
  --user-bubble-bg:     var(--primary-colour);
  --user-text-colour:   #ffffff;
  --bot-bubble-bg:      #ffffff;
  --bot-text-colour:    #333333;
  --bot-border-colour:  #dddddd;

  /* UI accents and feedback */
  --accent-colour:      #44c2ff;
  --secondary-colour:   #ffbb44;
  --success-colour:     #4caf50;
  --error-colour:       #f44336;

  /* Backgrounds */
  --background-light:   #f5f8ff;
  --background-dark:    #1a1a1a;

  /* Typography & icons */
  --text-colour:        #333333;
  --light-text:         #707070;

  /* Gradients */
  --gradient-bg:        linear-gradient(135deg, var(--primary-colour), var(--primary-dark));

  /* Dark-mode overrides (prefers-colour-scheme) */
  @media (prefers-colour-scheme: dark) {
    --background-light:   #1a1a1a;
    --bot-bubble-bg:      #2a2a2a;
    --bot-text-colour:    #e0e0e0;
    --text-colour:        #e0e0e0;
    --light-text:         #a0a0a0;
  }
}
````

## Typography

* **Font Family**
  `'Poppins', 'Segoe UI', Roboto, 'Open Sans', sans-serif;`

* **Base font size**
  Desktop: 16px (1 rem)
  Tablet: 15px (0.94 rem)
  Mobile: 14px (0.875 rem)

* **Scale**

  ```text
  • H1: 1.5 rem  (≈24px)  
  • H2: 1.25 rem (≈20px)  
  • H3: 1.125 rem (≈18px)  
  • Body: 1 rem  (≈16px)  
  • Small: 0.875 rem (≈14px)
  ```

* **Line-height**
  1.5 for headings and body text; 1.4 for small text.

## Layout & Spacing

* **Container**
  max-width: 800px (→ 98vw on tablet, 100vw on mobile), centred with padding `1 rem` (desktop) → `0.75 rem` (tablet) → `0.5 rem` (mobile).

* **Border radius**
  16px (desktop) → 12px (mobile).

* **Shadows**
  • sm: `0 1px 3px rgba(0,0,0,0.1)`
  • md: `0 4px 6px rgba(0,0,0,0.1)`
  • lg: `0 10px 20px rgba(0,0,0,0.1)`

* **Spacing units**
  `0.25 rem`, `0.5 rem`, `1 rem`, `1.5 rem`, `2 rem`.

## Components

### Header

* **Background**: `var(--gradient-bg)`
* **Padding**: `1 rem` → `0.75 rem` (tablet) → `0.5 rem` (mobile)
* **Logo**: max-height `48px`, positioned top-left with `aria-label="Bryneven Logo"`

### Navigation (if required)

* **Display**: flex; wrap
* **Gap**: `0.75 rem` → `0.5 rem` mobile
* **Links**: semibold, rounded; `:hover` → transform scale(1.02) + shadow.

### Chat Container

* **Background**: `var(--background-light)`
* **Corners**: `var(--border-radius)`
* **Shadow**: `md`
* **Height**: `calc(100vh - var(--header-height))`
* **Overflow-y**: auto
* **Pattern**: very subtle dot pattern (`background-image`), low opacity.

### Messages

* **Bot**

  ```css
  .message--bot {
    background: var(--bot-bubble-bg);
    colour: var(--bot-text-colour);
    border: 1px solid var(--bot-border-colour);
    border-radius: 12px 12px 12px 0;
    align-self: flex-start;
  }
  ```
* **User**

  ```css
  .message--user {
    background: var(--user-bubble-bg);
    colour: var(--user-text-colour);
    border-radius: 12px 12px 0 12px;
    align-self: flex-end;
  }
  ```
* **Shared styles**
  padding: `1 rem` → `0.75 rem` (mobile);
  max-width: 80% → 90% (mobile);
  margin: `0.25 rem 0`;
  animation: fadeIn 0.2s ease-out.

### Avatar & Metadata

* **Avatar**: 32x32px circle, margin-right `0.5 rem`;
* **Username**: 0.75 rem, semibold;
* **Timestamp**: 0.65 rem, light-text, positioned under each bubble.

### Typing Indicator

* **Dots**: three pulsing dots inside a rounded rectangle
* **Animation**: bounce 1s infinite
* **Accessibility**: `aria-live="polite"`; label “Bot is typing…”

### Input Area

* **Wrapper**: white (or dark in dark mode) background; top border `1px solid var(--bot-border-colour)`
* **Textarea**:

  * bg: var(--background-light)
  * min-height: 2 rem; max-height: 8 rem;
  * resize: none;
  * placeholder-colour: var(--light-text).
* **Send Button**: circular `2.5 rem`; icon-only;

  * \:hover → transform scale(1.1);
  * disabled state → opacity 0.5, `cursor: not-allowed`.

### Quick Replies / Suggestions

* Container: flex-wrap, gap `0.5 rem`;
* Buttons:

  * font-size: 0.875 rem;
  * padding: `0.5 rem 1 rem`;
  * bg: var(--secondary-colour);
  * \:hover → bg: var(--primary-light).

## Responsive Breakpoints

```css
@media (max-width: 900px) { html { font-size: 0.94rem; } }
@media (max-width: 600px) { html { font-size: 0.875rem; } }
@media (max-width: 480px) { html { font-size: 0.75rem; } }
```

Also adjust container padding, border-radius and bubble max-width proportionally.

## Accessibility & ARIA

* **Contrast**: meet WCAG AA
* **Touch targets**: ≥ 24px
* **Minimum text**: 0.75 rem (≈12px)
* **ARIA roles**:

  * Chat container: `role="log"`, `aria-live="polite"`
  * Input: labelled by `aria-label="Type your message"`
  * Buttons: `aria-label` for icon-only controls
* **Keyboard**: focus states visible, logical tab order.

---

This revised guide aligns the system more closely with typical chatbot patterns, ensures legibility in high-volume text flows, and provides for both light and dark appearances.
