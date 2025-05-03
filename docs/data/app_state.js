// Centralized session state for cross-section data management

export const appState = {
  currentSection: null, // e.g., "knowledge", "art", "discussion"
  answers: {
    knowledge: [],    // [{questionIndex, answer, feedback, apiEval}]
    art: [],          // [{taskIndex, response, feedback, apiEval}]
    discussion: []    // [{promptIndex, response, feedback, apiEval}]
  },
  score: {
    knowledge: 0,
    art: 0,
    discussion: 0
  },
  completedSections: [], // e.g., ["knowledge"]
  user: {
    id: null,
    name: null
  },
  timing: {
    knowledge: { start: null, end: null },
    art: { start: null, end: null },
    discussion: { start: null, end: null }
  },
  // Placeholder for future API results, loading states, etc.
  api: {
    knowledge: { loading: false, lastResponse: null },
    art: { loading: false, lastResponse: null },
    discussion: { loading: false, lastResponse: null }
  }
};
