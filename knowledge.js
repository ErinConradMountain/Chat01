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

function addBotMessage(message, addTopSpace = false) {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;
  const messageElement = document.createElement('div');
  messageElement.className = 'bot-message';
  // Remove bottom margin for compactness
  messageElement.innerHTML = (addTopSpace ? '<div style="margin-top: 12px;"></div>' : '') + message;
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function renderSubjectButtons() {
  const container = document.getElementById('dynamic-area');
  if (!container) return;
  container.innerHTML = '';
  subjects.forEach(subject => {
    const btn = document.createElement('button');
    btn.className = 'px-3 py-1 rounded-full bg-blue-200 text-blue-800 font-semibold shadow hover:bg-blue-300 transition text-base';
    btn.textContent = subject;
    btn.onclick = () => handleSubjectSelect(subject);
    container.appendChild(btn);
  });
}

async function loadQuestionsForSubject(subject) {
  if (subject === 'English') {
    const module = await import('./data/english_questions.js');
    currentQuestions = module.englishQuestions;
  } else if (subject === 'Maths') {
    const module = await import('./data/maths_questions.js');
    currentQuestions = module.mathsQuestions;
  } else {
    currentQuestions = [];
  }
  currentQuestionIndex = 0;
  score = 0;
}

// Ensure handleSubjectSelect is globally available
window.handleSubjectSelect = async function(subject) {
  addBotMessage(`You selected: ${subject}. Here is your first question!`);
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
    options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'px-1 py-0.5 rounded bg-green-200 text-green-800 font-bold shadow hover:bg-green-300 transition text-xs mx-0.5';
      btn.textContent = option;
      btn.onclick = () => handleAnswerSelect(option);
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
    nextBtn.className = 'px-3 py-1 rounded bg-blue-500 text-white font-semibold shadow hover:bg-blue-600 transition text-base mt-2 flex items-center';
    nextBtn.innerHTML = 'Next <span style="font-size:1.3em;margin-left:8px;">▶️</span>';
    nextBtn.onclick = goToNextQuestion;
    nextBtn.setAttribute('id', 'next-btn');
    container.appendChild(nextBtn);
    nextBtn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        goToNextQuestion();
      }
    });
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

// Progressive hint logic
let currentHintLevel = 0;
let lastHintQuestionId = null;

// Helper to get a unique question ID (for demo, use question text hash or index)
function getCurrentQuestionId() {
  const q = currentQuestions[currentQuestionIndex];
  // If your questions have an 'id' field, use it. Otherwise, use index or hash.
  return q.id || `q${currentQuestionIndex + 1}`;
}

async function showHintForCurrentQuestion() {
  const questionId = getCurrentQuestionId();
  // Reset hint level if new question
  if (lastHintQuestionId !== questionId) {
    currentHintLevel = 0;
    lastHintQuestionId = questionId;
  }
  try {
    const res = await fetch(`/api/hint?questionId=${encodeURIComponent(questionId)}&hintLevel=${currentHintLevel}`);
    const data = await res.json();
    addBotMessage(`<span class="bot-message"><strong>Hint:</strong> ${data.hint}</span>`);
    currentHintLevel++;
  } catch {
    addBotMessage(`<span class="bot-message"><strong>Hint:</strong> Hint unavailable for this question.</span>`);
  }
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
  chatContainer.innerHTML = '';
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
    explanation: null // Add explanation field
  };
  // Reset hint level on new question
  currentHintLevel = 0;
  lastHintQuestionId = getCurrentQuestionId();
  answeredCurrentQuestion = false;
  setHintButtonEnabled(true);
  // --- DYNAMIC HINT/MINI-HELPER BOX ---
  const hintBox = document.createElement('div');
  hintBox.className = 'hint-box';
  hintBox.innerHTML = '<span class="hint-icon">💡</span><span>Loading a helpful hint...</span>';
  chatContainer.appendChild(hintBox);
  // Get a creative, context-aware tip from the backend
  const defaultHints = [
    'Take your time to consider each option before making your choice.',
    'Pause and think through every answer before you decide.',
    'Look at all the choices closely and pick the one that fits best.',
    'Think carefully about what each option means before you answer.',
    'Review each answer choice and choose the one you believe is correct.'
  ];
  function getRandomHint() {
    return defaultHints[Math.floor(Math.random() * defaultHints.length)];
  }
  try {
    const tipRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: 'Knowledge',
        context: { question: q.question, options: q.options }
      })
    });
    const tipData = await tipRes.json();
    hintBox.innerHTML = `<span class="hint-icon">💡</span><span>${tipData.reply || getRandomHint()}</span>`;
  } catch {
    hintBox.innerHTML = `<span class="hint-icon">💡</span><span>${getRandomHint()}</span>`;
  }
  // --- END HINT BOX ---
  // Add a bottom border and reduce margin below the question for compactness
  addBotMessage(`<span style="font-size:1.25em;font-weight:bold;display:inline-block;border-bottom:4px solid #c00;padding-bottom:2px;margin-bottom:2px;">Q${currentQuestionIndex + 1}: ${q.question}</span>`, false);
  renderDynamicArea({ showAnswers: true, showKin: true, options: shuffledOptions });

  // Show the new action bar, hide main chat input
  const actionBar = document.getElementById('knowledge-action-bar');
  actionBar.style.display = 'flex';
  // document.querySelector('.input-area').style.display = 'none';
  const actionInput = document.getElementById('knowledge-action-input');
  actionInput.value = '';
  actionInput.placeholder = 'Type your answer or question...';
  actionInput.style.width = '100%';
  actionInput.style.maxWidth = '400px';
  actionInput.setAttribute('maxlength', '120');

  // --- Fetch and store explanation for this question ---
  try {
    const explainRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: 'Knowledge',
        context: { question: q.question, options: q.options },
        prompt: `Explain this question for a primary school learner: ${q.question} Options: ${q.options.join(', ')}`
      })
    });
    const explainData = await explainRes.json();
    if (explainData && explainData.reply) {
      currentQAContext.explanation = explainData.reply.trim();
    } else {
      currentQAContext.explanation = null;
    }
  } catch {
    currentQAContext.explanation = null;
  }
}

function endKnowledgeQuestionMode() {
  // Hide the action bar, show main chat input
  document.getElementById('knowledge-action-bar').style.display = 'none';
}

// Add small-action-btn style for smaller buttons
const style = document.createElement('style');
style.innerHTML = `
  .small-action-btn {
    font-size: 0.75em !important;
    padding: 0.25em 0.5em !important;
    min-width: 32px !important;
    min-height: 28px !important;
    height: 28px !important;
    line-height: 1.1 !important;
  }
`;
document.head.appendChild(style);

// Attach event handlers for the new action bar
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('knowledge-action-input');
    const sendBtn = document.getElementById('knowledge-action-send');
    const hintBtn = document.getElementById('knowledge-action-hint');
    const explainBtn = document.getElementById('knowledge-action-explain');
    const skipBtn = document.getElementById('knowledge-action-skip');
    if (input && sendBtn) {
      sendBtn.onclick = submitKnowledgeAction;
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitKnowledgeAction();
        }
      });
    }
    if (hintBtn) hintBtn.onclick = () => handleQuickAction('hint');
    if (explainBtn) explainBtn.onclick = () => handleQuickAction('explain');
    if (skipBtn) skipBtn.onclick = () => handleQuickAction('skip');
  });
}

function submitKnowledgeAction() {
  const input = document.getElementById('knowledge-action-input');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  // Show user message
  addBotMessage(`<span class='message user'><p>${value}</p></span>`);
  // Simulate a relevant response linked to the current question
  const q = currentQuestions[currentQuestionIndex];
  addBotMessage(`<span class='bot-message'><strong>Response:</strong> You asked about: "${q.question}"<br>Your input: "${value}"</span>`);
  endKnowledgeQuestionMode();
}

function handleQuickAction(action) {
  if (answeredCurrentQuestion && action === 'hint') return;
  const q = currentQuestions[currentQuestionIndex];
  if (action === 'hint') {
    showHintForCurrentQuestion();
  } else if (action === 'explain') {
    // Add extra spacing before the explanation for better visual separation
    addBotMessage('<div style="margin-top:18px;"></div>');
    if (currentQAContext && currentQAContext.explanation) {
      addBotMessage(`<span class="bot-message"><strong>Explanation:</strong> ${currentQAContext.explanation}</span>`);
    } else {
      addBotMessage(`<span class="bot-message"><strong>Explanation:</strong> This question is about: "${q.question}". Focus on the key idea or concept behind it.</span>`);
    }
  } else if (action === 'skip') {
    goToNextQuestion();
  }
}

async function handleAnswerSelect(option) {
  if (answeredCurrentQuestion) return;
  answeredCurrentQuestion = true;
  setHintButtonEnabled(false);
  // Find the index of the selected option in the shuffled options
  const selectedIdx = currentShuffledOptions.indexOf(option);
  const selectedLetter = String.fromCharCode(65 + selectedIdx); // 'A', 'B', 'C', 'D'
  const q = currentQuestions[currentQuestionIndex];
  // Double-check: compare the selected option's text (stripped) with the correct answer's text
  const cleanSelected = option.replace(/^\s*[A-D]\)\s*/, '');
  const correctIdx = q.answer.charCodeAt(0) - 65;
  const correctText = q.options[correctIdx].replace(/^\s*[A-D]\)\s*/, '');
  let isCorrect = (selectedLetter === currentCorrectAnswer);
  // Professional double-check: ensure text matches as well
  if (isCorrect && cleanSelected !== correctText) {
    // Log a warning for review
    if (window && window.console) {
      console.warn('Answer letter matched but text mismatch:', {selectedLetter, cleanSelected, correctText, q});
    }
    isCorrect = false;
  }
  let feedback = '';
  if (isCorrect) {
    score++;
    feedback = `✅ 😃 Correct! ${q.feedback}`;
  } else {
    feedback = `❌ Incorrect. ${q.feedback}`;
  }
  addBotMessage(`<br><br><strong>${isCorrect ? 'Correct' : 'Incorrect'}</strong><br>${feedback}<br><br>(Score: ${score} / ${currentQuestionIndex + 1})`, true);
  // Update context with answer
  currentQAContext.userAnswer = selectedLetter;
  currentQAContext.userAnswerText = cleanSelected;
  currentQAContext.correctAnswerText = correctText;
  currentQAContext.feedback = feedback;
  // Request academic explanation from Phi-4 using full context
  addBotMessage('Reflecting on your answer...');
  try {
    const phiRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: 'Knowledge',
        context: currentQAContext
      })
    });
    const phiData = await phiRes.json();
    let explanation = phiData.reply && typeof phiData.reply === 'string' ? phiData.reply.trim() : '';
    // Ensure the reflection focuses on the content of the question
    if (!explanation || explanation.match(/here is some feedback|help you understand/i)) {
      explanation = `Focus on what the question is really about: "${q.question}".<br><br><strong>Example:</strong> If the question was about synonyms, like 'Which word is a synonym for happy?', you should look for a word that means the same as happy, such as 'joyful'.<br><br><strong>Evaluation:</strong> If you got it wrong, try to spot the key idea you missed. If you got it right, can you explain why that answer fits the question?`;
    }
    addBotMessage(`<strong>Reflection:</strong> ${explanation}`);
  } catch (err) {
    addBotMessage('Could not load explanation. Please try again.');
  }
  waitingForNextQuestion = true;
  renderDynamicArea({ showNav: true, showKin: true });
}

function goToNextQuestion() {
  if (waitingForNextQuestion && currentQuestions.length > 0 && currentQuestionIndex < currentQuestions.length - 1) {
    waitingForNextQuestion = false;
    currentQuestionIndex++;
    showCurrentQuestion();
  } else if (waitingForNextQuestion && currentQuestions.length > 0 && currentQuestionIndex === currentQuestions.length - 1) {
    addBotMessage('Quiz complete! Your final score: ' + score + ' / ' + currentQuestions.length + '. Well done for completing the quiz! Keep practicing and you\'ll keep improving!');
    renderSubjectButtons();
    currentQuestions = [];
    currentQuestionIndex = 0;
    score = 0;
    waitingForNextQuestion = false;
    renderDynamicArea({ showNav: true, showKin: true });
    endKnowledgeQuestionMode();
  }
}

// --- Free-text Query Handling for Knowledge Section ---
let waitingForNextQuestion = false;
let lastUserQuestion = '';
let lastBotAnswer = '';
let discussionMode = false;

document.addEventListener('DOMContentLoaded', () => {
  addBotMessage('What subject would you like to be tested on?');
  renderSubjectButtons();

  // Listen for free-text queries
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-button');
  if (userInput && sendBtn) {
    sendBtn.addEventListener('click', handleKnowledgeQuery);
    userInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (waitingForNextQuestion && userInput.value.trim() === '') {
          e.preventDefault();
          goToNextQuestion();
        } else if (!waitingForNextQuestion) {
          e.preventDefault();
          handleKnowledgeQuery();
        }
      }
    });
  }
});

async function handleKnowledgeQuery() {
  const userInput = document.getElementById('user-input');
  if (!userInput) return;
  const query = userInput.value.trim();
  if (!query) return;
  userInput.value = '';

  if (waitingForNextQuestion && /^(yes|next|move on|continue|proceed)/i.test(query)) {
    goToNextQuestion();
    return;
  }

  if (waitingForNextQuestion && /^(no|not yet|clarify|explain|again|repeat|more)/i.test(query)) {
    waitingForNextQuestion = false;
    discussionMode = true;
    if (lastUserQuestion) {
      addBotMessage('Please rephrase or clarify your question, or discuss further. I will try again.');
      return;
    }
  }

  // Remove extra vertical space for compactness
  const chatContainer = document.getElementById('chatContainer');
  if (chatContainer) {
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    const p = document.createElement('p');
    p.style.margin = '2px 0 2px 0';
    p.textContent = query;
    userMsg.appendChild(p);
    chatContainer.appendChild(userMsg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  let context = '';
  const botMessages = Array.from(document.querySelectorAll('#chatContainer .bot-message'));
  if (botMessages.length > 0) {
    context = botMessages.map(m => m.textContent).join('\n');
  }
  // Make the prompt more robust and focused on knowledge section
  const strictPrompt = `You are Qwen, the Bryneven School Helper. Only answer the user's question below, do not discuss other topics, and do not side track. Use only the knowledge section information. If you do not know the answer, say so clearly.\n${context ? 'Previous: ' + context + '\n' : ''}Question: ${query}`;

  addBotMessage('Thinking...');
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: strictPrompt })
    });
    const data = await response.json();
    if (chatContainer && chatContainer.lastChild && chatContainer.lastChild.className === 'bot-message' && chatContainer.lastChild.textContent === 'Thinking...') {
      chatContainer.removeChild(chatContainer.lastChild);
    }
    // Make answer more visually distinct and compact
    addBotMessage(`<span style="font-weight:bold;">Q:</span> <span style="font-size:1.1em;">${query}</span><br><span style="font-weight:bold;">A:</span> <span style="font-size:1.1em;">${data.reply || "I'm not sure about that yet, but you can ask about our school, subjects, or activities!"}</span>`);
    lastUserQuestion = query;
    lastBotAnswer = data.reply;
    setTimeout(() => {
      addBotMessage('<span style="font-size:0.95em;">Did this answer your question? If yes, say "yes" to move on. If not, you can clarify, discuss more, or ask for more details.</span>');
      waitingForNextQuestion = true;
      discussionMode = true;
    }, 900);
  } catch (err) {
    if (chatContainer && chatContainer.lastChild && chatContainer.lastChild.className === 'bot-message' && chatContainer.lastChild.textContent === 'Thinking...') {
      chatContainer.removeChild(chatContainer.lastChild);
    }
    addBotMessage("Sorry, I couldn't get an answer right now. Please try again later.");
  }
}
