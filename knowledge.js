// knowledge.js - Section-specific logic for Knowledge Mode

const subjects = ['English', 'Mathematics', 'Science', 'Social Studies', 'Afrikaans', 'History'];
let currentQuestion = null;
let currentSubject = null;

document.addEventListener('DOMContentLoaded', function() {
  renderSubjectButtons();
  
  // Set up action buttons
  document.getElementById('knowledge-action-hint').addEventListener('click', showHint);
  document.getElementById('knowledge-action-explain').addEventListener('click', showExplanation);
  document.getElementById('knowledge-action-skip').addEventListener('click', skipQuestion);
  
  // Ensure header is consistently styled
  ensureConsistentHeaderStyling();
});

function ensureConsistentHeaderStyling() {
  // Make sure header is properly styled after it's loaded
  setTimeout(() => {
    const headerContainer = document.querySelector('header .flex');
    if (headerContainer) {
      headerContainer.style.justifyContent = 'center';
      
      const headerTitle = headerContainer.querySelector('h1');
      if (headerTitle) {
        headerTitle.style.textAlign = 'center';
      }
    }
  }, 500);
}

function addBotMessage(message, addTopSpace = false) {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;
  const messageElement = document.createElement('div');
  messageElement.className = 'bot-message';
  // Add proper spacing for better readability
  messageElement.innerHTML = (addTopSpace ? '<div style="margin-top: 20px;"></div>' : '') + message;
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function renderSubjectButtons() {
  const container = document.getElementById('dynamic-area');
  if (!container) return;
  container.innerHTML = '';
  subjects.forEach(subject => {
    const btn = document.createElement('button');
    btn.className = 'px-3 py-2 rounded-full bg-blue-200 text-blue-800 font-semibold shadow hover:bg-blue-300 transition text-base';
    btn.textContent = subject;
    btn.onclick = () => handleSubjectSelect(subject);
    container.appendChild(btn);
  });
}

function handleSubjectSelect(subject) {
  currentSubject = subject;
  // Clear previous messages
  const chatContainer = document.getElementById('chatContainer');
  if (chatContainer) chatContainer.innerHTML = '';
  // Get question for the subject
  fetchQuestion(subject);
}

function fetchQuestion(subject) {
  // For demonstration, using a sample question
  // In production, this would fetch from an API or database
  if (subject === 'English') {
    currentQuestion = {
      id: 'eng-001',
      text: 'What is the past tense of \'run\'?',
      options: ['Runned', 'Ran', 'Runing', 'Runed'],
      correctAnswer: 'Ran',
      hint: 'Read the question carefully and consider all options.',
      explanation: 'The past tense of \'run\' is \'ran\'. It\'s an irregular verb that doesn\'t follow the standard -ed pattern.'
    };
  } else {
    currentQuestion = {
      id: `${subject.toLowerCase()}-001`,
      text: `Sample ${subject} question`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option B',
      hint: 'This is a sample hint.',
      explanation: 'This is a sample explanation.'
    };
  }
  
  displayQuestion(currentQuestion);
}

function displayQuestion(question) {
  // Create a single clean message bubble for the question
  const chatContainer = document.getElementById('chatContainer');
  const questionDiv = document.createElement('div');
  questionDiv.className = 'message message--bot';
  questionDiv.textContent = question.text;
  chatContainer.appendChild(questionDiv);

  // Options as suggestion buttons
  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'suggestion-buttons';
  const letters = ['A', 'B', 'C', 'D'];
  question.options.forEach((option, index) => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-btn';
    btn.textContent = `${letters[index]}) ${option}`;
    btn.onclick = () => handleAnswer(option);
    optionsDiv.appendChild(btn);
  });
  chatContainer.appendChild(optionsDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  // Hide action bar and hints for a cleaner look
  document.getElementById('knowledge-action-bar').style.display = 'none';
  const hintsDiv = document.getElementById('knowledge-hints');
  if (hintsDiv) hintsDiv.classList.add('hidden');
}

function handleAnswer(selectedOption) {
  const isCorrect = selectedOption === currentQuestion.correctAnswer;
  
  // Create a standalone result container with proper spacing
  const resultContainer = document.createElement('div');
  resultContainer.className = isCorrect ? 
    'result-message correct my-6' : 
    'result-message incorrect my-6';
    
  // Display result with visual indicator
  resultContainer.innerHTML = isCorrect ? 
    `<div class="p-4">
      <h3 class="flex items-center text-lg font-semibold mb-3">
        <span class="text-green-600 text-2xl mr-2">✅</span> Correct! Well done!
      </h3>
      <div class="explanation mt-3 p-3 bg-white rounded">
        <p>${currentQuestion.explanation}</p>
      </div>
     </div>` : 
    `<div class="p-4">
      <h3 class="flex items-center text-lg font-semibold mb-3">
        <span class="text-red-600 text-2xl mr-2">❌</span> Not quite right. The correct answer is ${currentQuestion.correctAnswer}.
      </h3>
      <div class="explanation mt-3 p-3 bg-white rounded">
        <p>${currentQuestion.explanation}</p>
      </div>
     </div>`;
  
  // Add directly to chat container instead of using addBotMessage
  const chatContainer = document.getElementById('chatContainer');
  chatContainer.appendChild(resultContainer);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  // Hide action buttons - question is answered
  document.getElementById('knowledge-action-bar').style.display = 'none';
  // Hide hints area
  const hintsDiv = document.getElementById('knowledge-hints');
  if (hintsDiv) hintsDiv.classList.add('hidden');
  
  // Offer next question button with better positioning
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex justify-center my-6 pb-4';
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 text-lg rounded mt-3 transition shadow-sm';
  nextBtn.textContent = 'Next Question';
  nextBtn.onclick = () => fetchQuestion(currentSubject);
  
  buttonContainer.appendChild(nextBtn);
  chatContainer.appendChild(buttonContainer);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showHint() {
  if (!currentQuestion) return;
  
  // Display hint in the hints area below buttons
  const hintsDiv = document.getElementById('knowledge-hints');
  if (hintsDiv) {
    hintsDiv.innerHTML = `<span class="font-semibold mr-2">💡 Hint:</span>${currentQuestion.hint}`;
    hintsDiv.classList.remove('hidden');
    hintsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function showExplanation() {
  if (!currentQuestion) return;
  
  const explainContainer = document.createElement('div');
  explainContainer.className = 'p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg my-4 shadow-sm';
  explainContainer.innerHTML = `
    <h3 class="flex items-center font-semibold mb-2">
      <span class="text-blue-600 text-xl mr-2">ℹ️</span> Explanation:
    </h3>
    <p class="ml-8">${currentQuestion.explanation}</p>
  `;
  
  const chatContainer = document.getElementById('chatContainer');
  chatContainer.appendChild(explainContainer);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function skipQuestion() {
  if (!currentQuestion) return;
  
  const skipContainer = document.createElement('div');
  skipContainer.className = 'p-4 bg-gray-50 border-l-4 border-gray-500 rounded-lg my-4 shadow-sm';
  skipContainer.innerHTML = `
    <h3 class="flex items-center font-semibold mb-2">
      <span class="text-gray-600 text-xl mr-2">⏭️</span> Question Skipped
    </h3>
    <p class="ml-8">The correct answer was: <strong>${currentQuestion.correctAnswer}</strong></p>
  `;
  
  const chatContainer = document.getElementById('chatContainer');
  chatContainer.appendChild(skipContainer);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  // Hide action buttons
  document.getElementById('knowledge-action-bar').style.display = 'none';
  
  // Offer next question after skip
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex justify-center my-6';
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded transition shadow-sm';
  nextBtn.textContent = 'Next Question';
  nextBtn.onclick = () => fetchQuestion(currentSubject);
  
  buttonContainer.appendChild(nextBtn);
  chatContainer.appendChild(buttonContainer);
  
  chatContainer.scrollTop = chatContainer.scrollHeight;
}
