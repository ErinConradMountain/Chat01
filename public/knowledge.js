// knowledge.js - Section-specific logic for Knowledge Mode

const subjects = [
  'Maths',
  'English',
  'Afrikaans',
  'Social Sciences',
  'History'
];

let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;

const answerOptions = ['A', 'B', 'C', 'D'];
let currentQAContext = {};
let answeredCurrentQuestion = false;
let waitingForNextQuestion = false;

function addBotMessage(message, addTopSpace = false) {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;
  const messageElement = document.createElement('div');
  messageElement.className = 'message bot';
  const p = document.createElement('p');
  p.innerHTML = message;
  messageElement.appendChild(p);
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function renderSubjectButtons() {
  const container = document.getElementById('dynamic-area');
  if (!container) return;
  container.innerHTML = '';
  subjects.forEach(subject => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-btn';
    btn.textContent = subject;
    btn.onclick = () => handleSubjectSelect(subject);
    container.appendChild(btn);
  });
}

async function loadQuestionsForSubject(subject) {
  try {
    if (subject === 'English') {
      // For now, we'll use placeholder questions until the data files are fully set up
      currentQuestions = [
        {
          question: "What is the past tense of 'run'?",
          options: ["A) Runned", "B) Ran", "C) Runed", "D) Runing"],
          answer: "B",
          feedback: "The past tense of 'run' is 'ran'."
        },
        {
          question: "Which of these is a noun?",
          options: ["A) Jump", "B) Beautiful", "C) School", "D) Quickly"],
          answer: "C",
          feedback: "A noun is a person, place, thing, or idea. 'School' is a place."
        }
      ];
    } else if (subject === 'Maths') {
      currentQuestions = [
        {
          question: "What is 7 × 8?",
          options: ["A) 54", "B) 56", "C) 64", "D) 42"],
          answer: "B",
          feedback: "7 × 8 = 56"
        },
        {
          question: "What is 125 ÷ 5?",
          options: ["A) 20", "B) 25", "C) 30", "D) 35"],
          answer: "B",
          feedback: "125 ÷ 5 = 25"
        }
      ];
    } else {
      currentQuestions = [
        {
          question: "Sample question for " + subject,
          options: ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
          answer: "B",
          feedback: "This is sample feedback."
        }
      ];
    }
    currentQuestionIndex = 0;
    score = 0;
  } catch (error) {
    console.error("Error loading questions:", error);
    addBotMessage("Sorry, I couldn't load questions for this subject. Please try again later.");
  }
}

// Ensure handleSubjectSelect is globally available
window.handleSubjectSelect = async function(subject) {
  addBotMessage(`You selected: <strong>${subject}</strong>. Here is your first question!`);
  await loadQuestionsForSubject(subject);
  showCurrentQuestion();
};

function shuffleOptionsAndSetAnswer(q) {
  // Remove letter prefixes from options (e.g., "A) Foo" -> "Foo")
  const cleanOptions = q.options.map(opt => opt.replace(/^\s*[A-D]\)\s*/, ''));
  // Pair each clean option with its original index
  const optionPairs = cleanOptions.map((opt, idx) => ({
    text: opt,
    originalIdx: idx
  }));
  // Shuffle the options
  for (let i = optionPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [optionPairs[i], optionPairs[j]] = [optionPairs[j], optionPairs[i]];
  }
  // Find the new index for the correct answer
  const originalAnswerIdx = q.answer.charCodeAt(0) - 65;
  const newAnswerIdx = optionPairs.findIndex(pair => pair.originalIdx === originalAnswerIdx);
  const newAnswerLetter = String.fromCharCode(65 + newAnswerIdx);
  return {
    shuffledOptions: optionPairs.map(pair => pair.text),
    newAnswer: newAnswerLetter
  };
}

let currentShuffledOptions = [];
let currentCorrectAnswer = '';

function renderDynamicArea({ showAnswers = false, showNav = false, showKin = false, options = [] } = {}) {
  const container = document.getElementById('dynamic-area');
  if (!container) return;
  container.innerHTML = '';
  if (showAnswers && options.length) {
    options.forEach((option, index) => {
      const btn = document.createElement('button');
      btn.className = 'suggestion-btn';
      btn.textContent = String.fromCharCode(65 + index) + ") " + option;
      btn.onclick = () => handleAnswerSelect(String.fromCharCode(65 + index));
      container.appendChild(btn);
    });
  }
  if (showNav) renderNavigationControls(container);
  if (showKin) renderKinButtons(container);
}

function renderNavigationControls(container) {
  if (!container) return;
  if (waitingForNextQuestion && currentQuestions.length > 0 && currentQuestionIndex + 1 < currentQuestions.length) {
    // Only one navigation button (Next with arrow)
    const nextBtn = document.createElement('button');
    nextBtn.className = 'suggestion-btn';
    nextBtn.innerHTML = 'Next Question ▶️';
    nextBtn.onclick = goToNextQuestion;
    nextBtn.setAttribute('id', 'next-btn');
    container.appendChild(nextBtn);
  }
}

function renderKinButtons(container) {
  if (!container) return;
  const kinDiv = document.createElement('div');
  kinDiv.className = 'kin-buttons flex gap-2 mt-2';
  const kinTypes = [
    { label: '👍', value: 'like', title: 'I liked this question' },
    { label: '👎', value: 'dislike', title: 'I didn\'t like this question' },
    { label: '🤔', value: 'confused', title: 'I found this confusing' },
    { label: '⭐', value: 'favourite', title: 'Mark as favourite' }
  ];
  kinTypes.forEach(kin => {
    const btn = document.createElement('button');
    btn.className = 'px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-semibold shadow hover:bg-yellow-200 transition text-base';
    btn.textContent = kin.label;
    btn.title = kin.title;
    btn.onclick = () => handleKinButton(kin.value);
    kinDiv.appendChild(btn);
  });
  container.appendChild(kinDiv);
}

// For now, just a placeholder function
function handleKinButton(value) {
  addBotMessage(`You ${value}d this question. Thanks for your feedback!`);
}

// Progressive hint logic
let currentHintLevel = 0;
let lastHintQuestionId = null;

function getCurrentQuestionId() {
  const q = currentQuestions[currentQuestionIndex];
  return q.id || `q${currentQuestionIndex + 1}`;
}

async function showHintForCurrentQuestion() {
  const questionId = getCurrentQuestionId();
  // Reset hint level if new question
  if (lastHintQuestionId !== questionId) {
    currentHintLevel = 0;
    lastHintQuestionId = questionId;
  }
  
  // For now, provide static hints based on the current question
  const q = currentQuestions[currentQuestionIndex];
  const hints = [
    "Read the question carefully and consider all options.",
    "Think about what the question is really asking you.",
    "Try to eliminate options you know are incorrect."
  ];
  
  addBotMessage(`<strong>Hint:</strong> ${hints[currentHintLevel % hints.length]}`);
  currentHintLevel++;
}

function setHintButtonEnabled(enabled) {
  const hintBtn = document.getElementById('knowledge-action-hint');
  if (hintBtn) {
    hintBtn.disabled = !enabled;
    hintBtn.classList.toggle('opacity-50', !enabled);
    hintBtn.classList.toggle('cursor-not-allowed', !enabled);
  }
}

async function showCurrentQuestion() {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;
  if (currentQuestions.length === 0) {
    addBotMessage('No questions available for this subject yet.');
    return;
  }
  
  const q = currentQuestions[currentQuestionIndex];
  const { shuffledOptions, newAnswer } = shuffleOptionsAndSetAnswer(q);
  currentShuffledOptions = shuffledOptions;
  currentCorrectAnswer = newAnswer;
  
  // Build context for this question
  currentQAContext = {
    question: q.question,
    options: q.options,
    correctAnswer: q.answer,
    userAnswer: null,
    feedback: null,
    explanation: null // Will be added later
  };
  
  // Reset hint level on new question
  currentHintLevel = 0;
  lastHintQuestionId = getCurrentQuestionId();
  answeredCurrentQuestion = false;
  setHintButtonEnabled(true);
  
  // Add the question - make sure it's prominently displayed
  addBotMessage(`<strong>Question ${currentQuestionIndex + 1}:</strong> ${q.question}`);
  
  // Show the options as buttons
  renderDynamicArea({ showAnswers: true, options: shuffledOptions });

  // Show the action bar
  const actionBar = document.getElementById('knowledge-action-bar');
  if (actionBar) {
    actionBar.style.display = 'flex';
  }
}

async function handleAnswerSelect(option) {
  if (answeredCurrentQuestion) return;
  answeredCurrentQuestion = true;
  setHintButtonEnabled(false);
  
  // Find the index of the selected option
  const selectedLetter = option;
  const q = currentQuestions[currentQuestionIndex];
  const isCorrect = (selectedLetter === currentCorrectAnswer);
  
  if (isCorrect) {
    score++;
    addBotMessage(`<strong>✅ Correct!</strong> ${q.feedback}`);
  } else {
    addBotMessage(`<strong>❌ Incorrect.</strong> The correct answer was ${currentCorrectAnswer}. ${q.feedback}`);
  }
  
  addBotMessage(`Your current score: ${score} / ${currentQuestionIndex + 1}`);
  
  waitingForNextQuestion = true;
  renderDynamicArea({ showNav: true, showKin: true });
}

function goToNextQuestion() {
  if (waitingForNextQuestion && currentQuestions.length > 0 && currentQuestionIndex < currentQuestions.length - 1) {
    waitingForNextQuestion = false;
    currentQuestionIndex++;
    showCurrentQuestion();
  } else if (waitingForNextQuestion && currentQuestions.length > 0 && currentQuestionIndex === currentQuestions.length - 1) {
    addBotMessage(`<strong>Quiz complete!</strong> Your final score: ${score} / ${currentQuestions.length}. Well done for completing the quiz! Keep practicing and you'll keep improving!`);
    renderSubjectButtons();
    waitingForNextQuestion = false;
    
    // Hide the knowledge action bar
    const actionBar = document.getElementById('knowledge-action-bar');
    if (actionBar) {
      actionBar.style.display = 'none';
    }
  }
}

function handleQuickAction(action) {
  if (answeredCurrentQuestion && action === 'hint') return;
  
  if (action === 'hint') {
    showHintForCurrentQuestion();
  } else if (action === 'explain') {
    const q = currentQuestions[currentQuestionIndex];
    addBotMessage(`<strong>Explanation:</strong> This question is asking about ${q.question.toLowerCase()}. ${q.feedback}`);
  } else if (action === 'skip') {
    if (!answeredCurrentQuestion) {
      addBotMessage(`<strong>Skipped.</strong> The correct answer was ${currentCorrectAnswer}.`);
      answeredCurrentQuestion = true;
      waitingForNextQuestion = true;
      renderDynamicArea({ showNav: true });
    } else {
      goToNextQuestion();
    }
  }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  // Initialize with subject buttons directly - don't show the "What subject would you like to be tested on?" text
  renderSubjectButtons();
  
  // Set up event listeners for quick action buttons
  const hintBtn = document.getElementById('knowledge-action-hint');
  const explainBtn = document.getElementById('knowledge-action-explain');
  const skipBtn = document.getElementById('knowledge-action-skip');
  
  if (hintBtn) hintBtn.addEventListener('click', () => handleQuickAction('hint'));
  if (explainBtn) explainBtn.addEventListener('click', () => handleQuickAction('explain'));
  if (skipBtn) skipBtn.addEventListener('click', () => handleQuickAction('skip'));
  
  // Set up event listener for send button
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  
  if (userInput && sendButton) {
    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleUserInput();
      }
    });
  }
  
  // Hide the action bar initially
  const actionBar = document.getElementById('knowledge-action-bar');
  if (actionBar) {
    actionBar.style.display = 'none';
  }
});

function handleUserInput() {
  const userInput = document.getElementById('user-input');
  if (!userInput) return;
  const text = userInput.value.trim();
  if (!text) return;
  
  // Add user message
  const chatContainer = document.getElementById('chatContainer');
  if (chatContainer) {
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    const p = document.createElement('p');
    p.textContent = text;
    userMsg.appendChild(p);
    chatContainer.appendChild(userMsg);
  }
  
  userInput.value = '';
  
  // Simple response logic for now
  if (text.toLowerCase().includes('help')) {
    addBotMessage("To use the Knowledge section, select a subject from the buttons above. You'll be shown questions to test your knowledge.");
  } else if (text.toLowerCase().includes('subject')) {
    addBotMessage("Please select one of the subject buttons to begin a knowledge quiz.");
    renderSubjectButtons();
  } else {
    addBotMessage("I'm here to help test your knowledge. Please select a subject to begin.");
  }
}