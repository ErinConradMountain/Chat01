# MAIN_DOCUMENTATION.md

> This file was previously named DOCUMENTATION.md. It serves as the main entry point for system documentation. For additional or specialized documentation, see other markdown files in this repository (e.g., ARCHITECTURE_IMPROVEMENTS.md).

# Centralized Documentation: ChatBot Version 1

## Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Main Features](#main-features)
5. [API & Data Files](#api--data-files)
6. [Data File Formats & Customization](#data-file-formats--customization)
7. [Running & Developing the App](#running--developing-the-app)
8. [Contributing](#contributing)
9. [Troubleshooting](#troubleshooting)
10. [Notes](#notes)
11. [How to Add Knowledge for New Subjects](#how-to-add-knowledge-for-new-subjects-knowledge-section)
12. [Responsive Design Implementation](#responsive-design-implementation)
13. [Knowledge Section UI Behavior (2025 Update)](#knowledge-section-ui-behavior-2025-update)

---

## Overview
ChatBot Version 1 is a web-based educational chatbot platform designed to assist users with knowledge quizzes, homework help, art curation, and investigations. The app features a chat interface, multiple knowledge sections, and static as well as dynamic data sources.

---

## Project Structure

- **api/**: Backend API endpoints (e.g., chat logic, Vercel deployment config)
- **data/**: Static data files (e.g., homework, schools)
- **docs/**: Frontend assets (HTML, JS, CSS, images, and data for UI)
  - **data/**: Frontend-accessible data (e.g., quiz questions, knowledge)
- **vercel-proxy/**: (Purpose not detailed; likely for Vercel deployment)
- **config.js**: App configuration
- **logger.js**: Logging utility
- **server.js**: Main server entry point
- **package.json**: Project dependencies and scripts
- **README.md**: Basic project info
- **MAIN_DOCUMENTATION.md**: Centralized documentation (this file)

---

## Architecture Overview

ChatBot Version 1 follows a modular, layered architecture that separates concerns between the frontend, backend, and data sources:

### 1. Frontend (Client Side)
- Located in the `docs/` directory.
- Built with HTML, JavaScript, and CSS for the user interface.
- Handles user interactions, displays chat, quizzes, and knowledge sections.
- Fetches data and communicates with the backend via HTTP requests (e.g., chat API).
- Loads static data (like quiz questions) directly from files in `docs/data/`.

### 2. Backend (Server Side)
- Main entry point: `server.js`.
- API logic is organized in the `api/` directory (e.g., `api/chat.js`).
- Handles chat requests, processes user input, and retrieves relevant knowledge or responses.
- Can serve static files and act as a bridge between frontend and data sources.
- Uses configuration and logging utilities (`config.js`, `logger.js`).

### 3. Data Sources
- Static JSON and JS files in `data/`, `docs/data/`, and root directory (e.g., `art_knowledge.json`).
- Store knowledge bases, quiz questions, homework, and other content.
- Backend and frontend both access these files as needed (frontend uses only files in `docs/`).

### 4. Deployment
- Designed for easy deployment (e.g., Vercel) with configuration in `vercel.json` and optional proxy logic in `vercel-proxy/`.

### 5. Interaction Flow
- Users interact with the UI in the browser.
- The frontend sends requests to backend APIs for chat and dynamic features.
- The backend processes requests, accesses data sources, and returns responses.
- Static content (quizzes, knowledge) is loaded directly by the frontend from public data files.

This architecture allows for clear separation of concerns, easy customization of data/content, and straightforward extension of features.

---

## Main Features

### 1. Chat Interface
- Real-time chat with the bot via the frontend and backend API.
- Handles user queries and provides responses based on integrated knowledge bases.
- Main logic: `api/chat.js`, `docs/chat.js`, `docs/index.html`.

### 2. Knowledge Quizzes
- Multiple-choice quizzes (e.g., English) for self-assessment.
- Static questions stored in `docs/data/english_questions.js`.
- Feedback provided for each answer.
- To add or edit questions, modify `docs/data/english_questions.js` (see [Data File Formats & Customization](#data-file-formats--customization)).

### 3. Homework Help
- Homework data in `data/homework.json` and `docs/data/homework.json`.
- UI for students to get help with homework questions.
- Main logic: `docs/homework.html`, `docs/data/homework.json`.

### 4. Art Curation
- Art-related knowledge and curation via `art_knowledge.json` and `docs/art.html`.
- Main logic: `docs/art.html`, `art_knowledge.json`.

### 5. Investigations
- Investigation knowledge and UI in `investigations_knowledge.json` and `docs/investigations.html`.
- Main logic: `docs/investigations.html`, `investigations_knowledge.json`.

### 6. Knowledge Base
- General knowledge in `knowledge.json` and `knowledge_knowledge.json`.
- Accessible via the chat and knowledge UI (`docs/knowledge.html`).

---

## API & Data Files
- **api/chat.js**: Main chat API logic.
- **data/homework.json**: Homework questions and answers.
- **data/schools.json**: School data for context.
- **docs/data/english_questions.js**: Static English quiz questions.
- **docs/data/knowledge.json**: Knowledge base for frontend use.
- **art_knowledge.json, investigations_knowledge.json, homework_knowledge.json, knowledge_knowledge.json**: Knowledge sources for different sections.
- **knowledge_knowledge.json**: **Stores structured documentation about the application's architecture, API integrations, and technology viability. Consult and update this file when adding or modifying integrations. See entry dated 2025-05-02 for an example.**

---

## Data File Formats & Customization

### English Quiz Questions (`docs/data/english_questions.js`)
- Format: Array of objects with `question`, `options`, `answer`, and `feedback` fields.
- Example:
  ```js
  {
    question: "Which word is a synonym for 'happy'?",
    options: ["A) Sad", "B) Angry", "C) Joyful", "D) Tired"],
    answer: "C",
    feedback: "'Joyful' means the same as 'happy'."
  }
  ```
- To add a question, append a new object to the array.

### Homework, Art, Investigations, and Knowledge Files
- JSON format, typically arrays or objects with relevant fields (see each file for structure).
- To add new content, follow the structure of existing entries.

---

## Running & Developing the App
1. Install dependencies: `npm install`
2. Start the server: `node server.js` (or use a script from `package.json`)
3. Access the app via `index.html` in the `docs/` folder.
4. For deployment, see `vercel.json` and `vercel-proxy/`.

---

## Contributing
- Fork or clone the repository.
- Make changes in a feature branch.
- Ensure new features are documented in MAIN_DOCUMENTATION.md.
- **If adding/modifying integrations, update `knowledge_knowledge.json` with details (see existing entries for format).**
- Test your changes locally before submitting a pull request.

---

## Troubleshooting
- If the server does not start, check for missing dependencies (`npm install`).
- For frontend issues, check the browser console for errors.
- For API issues, review logs in `logger.js` and server output.
- Ensure data files are valid JSON/JS.

---

## Notes
- Update this documentation as new features or files are added.
- For detailed API usage, see inline comments in `api/` and `server.js`.
- For UI changes, edit files in `docs/`.
- For quiz logic, see the TODO in `docs/data/english_questions.js` for future improvements (e.g., scoring, result summary).

---

## How to Add Knowledge for New Subjects (Knowledge Section)

To expand the knowledge section with new subjects or update existing ones, follow these steps:

### 1. Create or Update Subject Question Files
- For each subject, create a new file in `docs/data/` (e.g., `science_questions.js`).
- The file should export an array of question objects. Each object must have:
  - `question`: The question text.
  - `options`: An array of answer choices (e.g., `["A) ...", "B) ...", ...]`).
  - `answer`: The correct answer letter (e.g., `"A"`).
  - `feedback`: Feedback to show after answering.
- Example:
  ```js
  export const scienceQuestions = [
    {
      question: "What is the boiling point of water?",
      options: ["A) 100°C", "B) 0°C", "C) 50°C", "D) 200°C"],
      answer: "A",
      feedback: "Water boils at 100°C under standard atmospheric pressure."
    },
    // Add more questions here
  ];
  ```

### 2. Register the Subject in the App
- Open `docs/knowledge.js`.
- Add the new subject name to the `subjects` array (e.g., `'Science'`).
- Update the `loadQuestionsForSubject(subject)` function to import your new questions file:
  ```js
  if (subject === 'Science') {
    const module = await import('./data/science_questions.js');
    currentQuestions = module.scienceQuestions;
  }
  ```

### 3. (Optional) Expand Backend Knowledge
- For free-text queries, the backend uses files like `knowledge.json` or `knowledge_knowledge.json`.
- To add more detailed knowledge for a subject, update these files with new entries or facts.
- Ensure the structure matches existing entries for consistency.

### 4. Test the Subject
- Start the app and select the new subject in the knowledge section.
- Ensure questions load, options shuffle, answers are checked, and feedback displays correctly.
- Try free-text queries to verify backend knowledge is accessible.

### 5. Summary Table
| Step | File/Location | Action |
|------|---------------|--------|
| 1    | `docs/data/` | Create or update `[subject]_questions.js` |
| 2    | `docs/knowledge.js` | Register subject and import questions |
| 3    | `knowledge.json` or `knowledge_knowledge.json` | (Optional) Add backend knowledge |
| 4    | App UI | Test subject in browser |

This process ensures all knowledge for quizzes and free-text queries is organized, easy to update, and consistent across subjects.

---

## Responsive Design Implementation

### Base Font System
The application now uses a responsive font sizing system with three breakpoints:
- Desktop (> 900px): 12px base
- Tablet (480px - 900px): 11px base
- Mobile (< 480px): 10px base

All component measurements are relative to these base sizes using rem units, ensuring consistent scaling across the application.

### Header Optimization
- Headers now properly wrap text and maintain readability at all zoom levels
- Navigation menu items adjust spacing and wrap cleanly on narrow screens
- Maintained minimum touch target sizes of 24px height

### Content Containers
Content areas now use a flexible width system:
- Desktop: 95vw max-width
- Tablet: 98vw max-width
- Mobile: 100vw max-width

This ensures optimal content display while preventing horizontal scrolling.

### Component Scaling
Components now scale proportionally across device sizes:
- Buttons maintain minimum touch target size of 24px
- Text remains readable with minimum size of 9px
- Message bubbles adjust width based on screen size
- Input areas maintain usability across devices

### Implementation Details
1. **CSS Variables**
   ```css
   :root {
       --base-font-size: 12px;
       --mobile-font-size: 11px;
       --small-font-size: 10px;
   }
   ```

2. **Viewport Configuration**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
   ```

3. **Media Queries**
   Three main breakpoints ensure smooth transitions between device sizes:
   - Large Desktop: > 900px
   - Tablet/Small Desktop: 480px - 900px
   - Mobile: < 480px

### Testing Guidelines
1. Test all pages at the following zoom levels:
   - 100% (standard view)
   - 75% (reduced view)
   - 125% (enlarged view)
   - 150% (maximum supported zoom)

2. Verify on common device sizes:
   - Desktop (1920x1080, 1366x768)
   - Tablet (1024x768, 768x1024)
   - Mobile (375x667, 360x640)

3. Check responsive behavior:
   - Text wrapping
   - Button alignment
   - Navigation menu wrapping
   - Message bubble scaling
   - Input area usability

### Known Limitations
- Minimum supported screen width: 320px
- Maximum recommended zoom level: 150%
- Text scaling limits to maintain usability

---

## Knowledge Section UI Behavior (2025 Update)

- The Knowledge section now uses a ChatGPT-style layout: when a user selects a subject, only a single question bubble (styled as a bot message) and a row of answer option buttons are shown.
- There are no extra colored containers, quiz guides, or repeated explanations. The UI is clean and focused on the Q&A flow, matching the look and feel of ChatGPT.
- **Guideline:** Do not add redundant system or bot messages, quiz guides, or result containers. Only show the question and options as described.
- If you update the UI or logic, ensure that the knowledge section remains clean and focused on the Q&A flow, with a single message bubble per question.

---
