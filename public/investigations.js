// investigations.js - Section-specific logic for Investigations Mode

function addBotMessage(message) {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;
  const messageElement = document.createElement('div');
  messageElement.className = 'bot-message';
  messageElement.textContent = message;
  chatContainer.appendChild(messageElement);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

document.addEventListener('DOMContentLoaded', () => {
  addBotMessage('Welcome to Investigations! Multiple-choice questions will be supported here soon.');
  const mcPlaceholder = document.getElementById('mcPlaceholder');
  if (mcPlaceholder) {
    mcPlaceholder.textContent = 'Multiple-choice support coming soon!';
  }
});
