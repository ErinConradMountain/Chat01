// Use API key from config file
//const API_KEY = config.API_KEY;

// Chat history
let chatHistory = [];

// System prompt for the AI
const systemPrompt = `You are a helpful, friendly assistant for Bryneven Primary School students (Grade 1-7). 
Your name is Bryneven Helper. Use simple language appropriate for elementary school children. 
Be patient, encouraging, and clear in your explanations. Break down complex concepts into simple steps.
Use examples relevant to children aged 6-13.`;

// Initialize chat with welcome message
document.addEventListener('DOMContentLoaded', () => {
    addBotMessage("Hi there! 👋 I'm the Bryneven Primary School Helper! I can answer questions about our school, help with your homework, or tell you about coding and robotics. What would you like to know today?");
    
    // Event listeners
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    sendBtn.addEventListener('click', sendMessage);
});

const chatContainer = document.querySelector('.chat-container');

function sendSuggestion(text) {
    userInput.value = text;
    sendMessage();
}

function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'user-message';
    messageElement.textContent = message;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addBotMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'bot-message';
    
    // Convert URLs to links and handle code blocks
    const formattedMessage = message
        .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-blue-500 underline">$1</a>');
    
    messageElement.innerHTML = formattedMessage;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatContainer.appendChild(indicator);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    addUserMessage(message);
    userInput.value = '';
    chatHistory.push({ role: "user", content: message });
    showTypingIndicator();
    try {
        // Prepare Gemini Flash request body (no chat history)
        const body = {
            contents: [
                {
                    parts: [{ text: message }]
                }
            ],
            generation_config: {
                temperature: 0.7,
                top_k: 40,
                top_p: 0.95,
                max_output_tokens: 800,
                stop_sequences: []
            }
        };
        console.log("Sending:", JSON.stringify(body));
        const response = await fetch('https://chat002.vercel.app/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received:", data);
        hideTypingIndicator();
        const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "[No valid response]";
        addBotMessage(botReply);
        chatHistory.push({ role: "assistant", content: botReply });
    } catch (error) {
        console.error('Error:', error);
        hideTypingIndicator();
        addBotMessage("Oops! I'm having trouble thinking right now. Could you try asking me again?");
    }
}
