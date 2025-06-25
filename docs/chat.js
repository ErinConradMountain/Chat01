// Get DOM elements
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
const chatContainer = document.getElementById('chat-area');
// Response length slider
const responseLengthSlider = document.getElementById('responseLength');
const responseLengthValue = document.getElementById('responseLengthValue');
let responseLength = 400;
if (responseLengthSlider && responseLengthValue) {
    responseLengthSlider.addEventListener('input', function() {
        responseLength = parseInt(this.value, 10);
        responseLengthValue.textContent = this.value;
    });
    responseLength = parseInt(responseLengthSlider.value, 10);
    responseLengthValue.textContent = responseLengthSlider.value;
    // Ensure min is 100
    responseLengthSlider.min = '100';
}

// Use API key from config file
//const API_KEY = config.API_KEY;

import { buildKnowledgeCorpus, getTopFacts, getTopFactsWithScores } from './data.js';

// User session state
let currentUser = null;
let currentUserPassword = null;
let userMessageBuffer = [];
const SUMMARY_INTERVAL = 5; // Summarize every 5 user+assistant messages

// Restore currentUser from localStorage if available
try {
    const userProfile = JSON.parse(localStorage.getItem('userProfile'));
    if (userProfile && userProfile.name) {
        currentUser = userProfile.name;
    }
} catch {}

// Helper: Summarize last N messages
function summarizeMessages(messages) {
    // Simple summary: concatenate and truncate
    const text = messages.map(m => `${m.role}: ${m.content}`).join(' ');
    return text.length > 300 ? text.slice(0, 297) + '...' : text;
}

// Helper: Load conversation summaries for a user
function loadUserConversations(userName) {
    try {
        const key = `conversation_knowledge_${userName}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        return [];
    }
}

// Chat history
let chatHistory = [];

// Fix: Declare knowledgeCorpus before use
let knowledgeCorpus = [];

// Times Table Quiz State
let activeQuiz = null;

// Paste mode and discussion state
let pasteModeActive = false;
let pastedContent = "";
let activeDiscussionText = "";

// Replace direct Gemini API URL with backend endpoint
// For GitHub Pages compatibility, point to a deployed backend
let BACKEND_CHAT_API_URL = "https://bryneven-chatbot-api.vercel.app/api/chat";
// For local development, change to true to use local endpoint
const USE_LOCAL_API = true; 
if (USE_LOCAL_API) {
    BACKEND_CHAT_API_URL = "/api/chat";
}

// Add fallback mechanism in case the API call fails
async function callChatAPI(prompt, maxTokens = 300, temp = 0.3) {
    console.log("⚙️ Attempting API call...");
    try {
        const response = await fetch(BACKEND_CHAT_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: prompt }] }
                ],
                generationConfig: {
                    maxOutputTokens: maxTokens,
                    temperature: temp
                }
            }),
            // Add longer timeout for slow connections
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (err) {
        console.error("❌ API call failed:", err);
        return null;
    }
}

// For memory: store last 3 user and assistant messages
function getRecentHistory() {
    // Only keep last 3 user and assistant messages
    const filtered = chatHistory.filter(m => m.role === 'user' || m.role === 'assistant');
    return filtered.slice(-6); // 3 user + 3 assistant
}

// Summarize older history into one line
function getHistorySummary() {
    // Get all but last 3 user/assistant messages
    const filtered = chatHistory.filter(m => m.role === 'user' || m.role === 'assistant');
    if (filtered.length <= 6) return '';
    const older = filtered.slice(0, -6);
    if (older.length === 0) return '';
    // Simple summary: concatenate topics mentioned
    const topics = older.map(m => m.content).join(' ').toLowerCase();
    // Extract keywords (very basic)
    const words = topics.match(/\b\w{4,}\b/g) || [];
    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const sorted = Object.entries(freq).sort((a,b) => b[1]-b[1]).map(([w]) => w);
    if (sorted.length === 0) return '';
    return `We have been talking about ${sorted.slice(0,2).join(' and ')}.`;
}

// Simple contradiction detector: if summary contains a topic and new facts contain a negation or different info
function detectContradiction(summary, facts) {
    // Prototype: if summary mentions a topic and facts contain 'not' or 'no' or 'instead', flag
    if (!summary) return null;
    const topics = summary.match(/about (.+)\./);
    if (!topics) return null;
    const topicWords = topics[1].split(' and ');
    for (const t of topicWords) {
        for (const f of facts) {
            const fLow = f.toLowerCase();
            if (fLow.includes(t) && (fLow.includes('not') || fLow.includes('no') || fLow.includes('instead'))) {
                return { topic: t, fact: f };
            }
        }
    }
    return null;
}

// Load knowledge at startup
(async () => {
    knowledgeCorpus = await buildKnowledgeCorpus();
})();

// Ensure AI response is within the character limit
function ensureFullSentence(text, maxChars = 1000) {
    // Truncate to the maxChars (from slider)
    if (!text) return '';
    if (text.length > maxChars) {
        let truncated = text.slice(0, maxChars);
        // Try to end at the last full sentence
        const lastPeriod = truncated.lastIndexOf('.');
        if (lastPeriod > 0 && lastPeriod > maxChars - 120) {
            truncated = truncated.slice(0, lastPeriod + 1);
        }
        return truncated.trim();
    }
    return text.trim();
}

// Minimal Gemini API test function (updated to use backend)
async function testGeminiAPI(prompt) {
    console.log("⚙️ About to call Gemini API via backend...");
    try {
        const response = await fetch(BACKEND_CHAT_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: prompt }] }
                ],
                generationConfig: {
                    maxOutputTokens: 300,
                    temperature: 0.3
                }
            }),
            // Add mode: 'cors' with credentials to ensure CORS is handled properly
            mode: 'cors',
            credentials: 'include'
        });
        const data = await response.json();
        let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't understand that.";
        reply = ensureFullSentence(reply, responseLength);
        console.log("✅ Gemini response received:", reply);
        return reply;
    } catch (err) {
        console.error("❌ Gemini API call failed:", err);
        // If external API fails, use local fallback
        return "Oops! I had a problem thinking right now. Let me try again with my local knowledge.";
    }
}

// Generate initial questions about pasted content (use backend)
async function generateInitialQuestions(text) {
    const prompt = `\nYou're Bryneven Helper, a chatbot for learners aged 7–13.\n\nHere is something the learner pasted:\n"${text}"\n\nYour job is to ask 2 friendly, simple questions to check understanding.\nAvoid tricky words. Ask like a kind tutor. Use full sentences.\n`;
    try {
        const response = await fetch(BACKEND_CHAT_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: prompt }] }
                ],
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 300
                }
            }),
            mode: 'cors',
            credentials: 'include'
        });
        const data = await response.json();
        const questions = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        addBotMessage(questions || "I've got a few questions, but I need a little more info.");
    } catch (err) {
        addBotMessage("Sorry, I couldn't come up with questions right now.");
    }
}

// Initialize chat event handlers once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners only if elements exist
    if (userInput && sendBtn) {
        userInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        sendBtn.addEventListener('click', sendMessage);
    }


    // Suggestion buttons: trigger chat on click
    const suggestionMap = {
        'about our school': 'Tell me about Bryneven Primary School.',
        'purple mash help': 'What is Purple Mash?',
        'school hours': 'What are the school hours?',
        'math tutoring': 'I need help with math.'
    };
    const suggestionButtons = document.querySelectorAll('.suggestion-buttons .suggestion-btn');
    suggestionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (userInput && !userInput.disabled) {
                const key = btn.textContent.trim().toLowerCase();
                const mapped = suggestionMap[key] || btn.textContent.trim();
                userInput.value = mapped;
                sendMessage();
            }
        });
    });
});

// UI: Login handling
function setupAuthUI() {
    const loginForm = document.getElementById('loginForm');
    const loginContainer = document.getElementById('loginContainer');
    const loginError = document.getElementById('loginError');
    const showSignUpBtn = document.getElementById('showSignUpBtn');

    let schoolsList = [];
    async function loadSchoolsList() {
        if (schoolsList.length) return schoolsList;
        try {
            const resp = await fetch('data/schools.json');
            schoolsList = await resp.json();
        } catch {
            schoolsList = [];
        }
        return schoolsList;
    }

    // Update login logic to check localStorage
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('loginName').value.trim();
            const password = document.getElementById('loginPassword').value;
            if (!name || !password) {
                loginError.textContent = 'Please enter your username and password.';
                loginError.classList.remove('hidden');
                return;
            }
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            if (!users[name]) {
                loginError.textContent = 'User not found. Please sign up first.';
                loginError.classList.remove('hidden');
                if (showSignUpBtn) showSignUpBtn.click();
                return;
            }
            if (users[name] !== password) {
                loginError.textContent = 'Incorrect password. Please try again.';
                loginError.classList.remove('hidden');
                return;
            }
            loginError.classList.add('hidden');
            currentUser = name;
            currentUserPassword = password;
            loginContainer.style.display = 'none';
            const chatWrapper = document.getElementById('chatWrapper');
            if (chatWrapper) chatWrapper.style.display = 'block';
            userInput.disabled = false;
            sendBtn.disabled = false;
            showLogoutButton(true);
            let userProfile = null;
            try {
                const usersProfiles = JSON.parse(localStorage.getItem('users_profiles') || '{}');
                if (usersProfiles[name]) {
                    userProfile = usersProfiles[name];
                }
            } catch {}
            if (!userProfile) {
                const uid = 'uid-' + Math.random().toString(36).slice(2,10);
                userProfile = { uid, name };
            }
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
            await loadSchoolsList();
            const school = schoolsList.find(s => s.id === userProfile.schoolId);
            if (school && school.badgeUrl) {
                let badge = document.getElementById('schoolBadge');
                if (!badge) {
                    badge = document.createElement('img');
                    badge.id = 'schoolBadge';
                    badge.style.height = '40px';
                    badge.style.marginRight = '8px';
                    const header = document.querySelector('header .flex');
                    if (header) header.insertBefore(badge, header.firstChild);
                }
                badge.src = school.badgeUrl;
                badge.alt = school.name + ' badge';
            }
            // Load previous summaries
            const summaries = loadUserConversations(currentUser);
            if (summaries.length > 0) {
                function formatTimestamp(ts) {
                    if (!ts) return '';
                    try {
                        const d = new Date(ts);
                        if (isNaN(d.getTime())) return '';
                        return d.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    } catch { return ''; }
                }
                const lastSummary = summaries[summaries.length - 1]?.summary;
                if (lastSummary) {
                    addBotMessage(`Welcome back, ${currentUser}! Last time, we discussed: "${lastSummary}"
Here are your previous conversation summaries:`);
                } else {
                    addBotMessage(`Welcome back, ${currentUser}! Here are your previous conversation summaries:`);
                }
                summaries.forEach(s => {
                    const formatted = formatTimestamp(s.timestamp);
                    const summaryText = s.summary;
                    if (summaryText) {
                        addBotMessage(`[${formatted}] ${summaryText}`);
                    }
                });
            } else {
                addBotMessage(`Welcome, ${currentUser}! Let's start chatting.`);
            }
        });
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', setupAuthUI);
} else {
    setupAuthUI();
}

function sendSuggestion(text) {
    userInput.value = text;
    sendMessage();
}
window.sendSuggestion = sendSuggestion;

function appendToConversationKnowledge(entry) {
    // Store conversation knowledge in localStorage per user
    if (!currentUser) return;
    const key = `conversation_knowledge_${currentUser}`;
    let data = [];
    try {
        data = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        data = [];
    }
    data.push(entry);
    localStorage.setItem(key, JSON.stringify(data));
}

function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user';
    const p = document.createElement('p');
    p.textContent = message;
    messageElement.appendChild(p);
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addBotMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message bot';
    let plainMessage = message.replace(/<[^>]+>/g, '').replace(/[`*_~]/g, '');
    plainMessage = plainMessage.replace(/[[\]{}]/g, '');
    if (plainMessage.length > 750) {
        plainMessage = plainMessage.slice(0, 750);
        if (!plainMessage.endsWith('.')) plainMessage += '...';
    }
    const p = document.createElement('p');
    p.textContent = plainMessage;
    messageElement.appendChild(p);
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

// --- LOGOUT FUNCTIONALITY ---
const logoutBtn = document.getElementById('logoutBtn');

function saveConversationToFile() {
    if (!currentUser) return;
    const key = `conversation_knowledge_${currentUser}`;
    let userConvo = [];
    try {
        userConvo = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        userConvo = [];
    }
    if (userConvo.length === 0) return;
    // Save to global conversation_knowledge.json (simulate by updating localStorage and POST if backend exists)
    fetch('conversation_knowledge.json', { method: 'GET' })
        .then(res => res.json())
        .then(existing => {
            const updated = Array.isArray(existing) ? existing : [];
            updated.push({ user: currentUser, conversation: userConvo, timestamp: new Date().toISOString() });
            // Try to POST/PUT if backend exists, else just log
            fetch('conversation_knowledge.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated)
            }).catch(() => {
                // fallback: just log
                console.log('Conversation would be saved:', updated);
            });
        }).catch(() => {
            // fallback: just log
            console.log('Conversation would be saved (no fetch):', userConvo);
        });
}

function logoutUser() {
    saveConversationToFile();
    // Clear session state
    currentUser = null;
    currentUserPassword = null;
    chatHistory = [];
    userMessageBuffer = [];
    activeQuiz = null;
    pasteModeActive = false;
    pastedContent = "";
    activeDiscussionText = "";
    // Clear chat UI
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) chatContainer.innerHTML = '';
    // Show login, hide chat input
    document.getElementById('loginContainer').style.display = '';
    const chatWrapper = document.getElementById('chatWrapper');
    if (chatWrapper) chatWrapper.style.display = 'none';
    document.getElementById('user-input').disabled = true;
    document.getElementById('send-button').disabled = true;
    logoutBtn.classList.add('hidden');
    addBotMessage('You have been logged out. Your conversation was saved.');
    // Only clear loginName and loginPassword fields
    const loginName = document.getElementById('loginName');
    const loginPassword = document.getElementById('loginPassword');
    if (loginName) loginName.value = '';
    if (loginPassword) loginPassword.value = '';
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', logoutUser);
}

// Show/hide logout button on login/logout
function showLogoutButton(show) {
    if (logoutBtn) {
        if (show) logoutBtn.classList.remove('hidden');
        else logoutBtn.classList.add('hidden');
    }
}

// --- HOMEWORK ↔ CHATBOT SYNERGY ---
// Helper: detect homework queries
function isHomeworkQuery(message) {
    return /\b(homework|what.*homework|my homework|do I have homework|show.*homework|list.*homework)\b/i.test(message);
}

// Helper: get user profile
function getCurrentUserProfile() {
    try {
        return JSON.parse(localStorage.getItem('userProfile'));
    } catch { return null; }
}

// Helper: get current week's homework for user
async function getUserHomeworkList() {
    let allHomework = [];
    try {
        const resp = await fetch('data/homework.json');
        const hwJson = await resp.json();
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const week = hwJson.weeks.find(w => todayISO >= w.start && todayISO <= w.end);
        allHomework = week ? week.entries : [];
    } catch { allHomework = []; }
    const userProfile = getCurrentUserProfile();
    if (!userProfile) return [];
    return allHomework.filter(hw => {
        let match = true;
        if (schoolVal && hw.schoolId && typeof hw.schoolId === 'string' && typeof schoolVal === 'string') {
            if (hw.schoolId.toLowerCase() !== schoolVal.toLowerCase()) match = false;
        }
        if (userProfile.grade && String(hw.grade) !== String(userProfile.grade)) match = false;
        return match;
    });
}

// Helper: summarize homework for chat
function summarizeHomeworkList(hwList) {
    if (!hwList.length) return "You don't have any homework listed for this week!";
    return hwList.map(hw => '• ' + hw.subject + ': ' + hw.description).join('\n');
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    addUserMessage(message);
    userInput.value = '';
    chatHistory.push({ role: "user", content: message });
    userMessageBuffer.push({ role: "user", content: message });
    appendToConversationKnowledge({
        timestamp: new Date().toISOString(),
        role: 'user',
        content: message
    });

    // --- HOMEWORK CONTEXT INJECTION ---
    if (isHomeworkQuery(message)) {
        showTypingIndicator();
        const hwList = await getUserHomeworkList();
        const summary = summarizeHomeworkList(hwList);
        hideTypingIndicator();
        addBotMessage(summary + "\nI’ve also pinned this in your Homework HQ ➜");
        chatHistory.push({ role: "assistant", content: summary });
        userMessageBuffer.push({ role: "assistant", content: summary });
        appendToConversationKnowledge({
            timestamp: new Date().toISOString(),
            role: 'assistant',
            content: summary
        });
        if (userMessageBuffer.length >= SUMMARY_INTERVAL) {
            const summaryMsg = summarizeMessages(userMessageBuffer);
            appendToConversationKnowledge({
                user: currentUser,
                timestamp: new Date().toISOString(),
                summary: summaryMsg
            });
            userMessageBuffer = [];
        }
        return;
    }

    // --- Paste Mode Activation ---
    if (!pasteModeActive && /\bpaste|paragraph|work\b/i.test(message)) {
        pasteModeActive = true;
        addBotMessage("Sure! Go ahead and paste the content you’d like me to look at.");
        return;
    }
    // --- Capture Pasted Input ---
    if (pasteModeActive && message.split(/\s+/).length > 50) {
        pastedContent = message;
        pasteModeActive = false;
        activeDiscussionText = pastedContent;
        addBotMessage("Thanks! I’ve read what you shared. Now, let’s chat about it!");
        generateInitialQuestions(pastedContent);
        return;
    }
    // --- Ongoing Discussion on Pasted Content ---
    if (activeDiscussionText) {
        // Reset on command
        if (/\b(something else|stop talking|switch topics|change topic)\b/i.test(message)) {
            activeDiscussionText = "";
            addBotMessage("Okay! Let’s switch topics. What would you like to do now?");
            return;
        }
        // Continue discussion
        showTypingIndicator();
        try {
            const ongoingPrompt = `\nHere’s the passage again:\n"${activeDiscussionText}"\n\nThe learner said:\n"${message}"\n\nRespond in a way that keeps the discussion going. Ask another simple question or give helpful feedback.`;
            const response = await fetch(BACKEND_CHAT_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        { role: "user", parts: [{ text: ongoingPrompt }] }
                    ],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 300
                    }
                }),
                mode: 'cors',
                credentials: 'include'
            });
            const data = await response.json();
            let reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
            reply = ensureFullSentence(reply, responseLength);
            hideTypingIndicator();
            addBotMessage(reply || "Let's keep talking about what you pasted!");
            chatHistory.push({ role: "assistant", content: reply });
            userMessageBuffer.push({ role: "assistant", content: reply });
            appendToConversationKnowledge({
                timestamp: new Date().toISOString(),
                role: 'assistant',
                content: reply
            });
            if (userMessageBuffer.length >= SUMMARY_INTERVAL) {
                const summary = summarizeMessages(userMessageBuffer);
                appendToConversationKnowledge({
                    user: currentUser,
                    timestamp: new Date().toISOString(),
                    summary
                });
                userMessageBuffer = [];
            }
        } catch (error) {
            hideTypingIndicator();
            addBotMessage("I'm having trouble thinking right now. Can you try again in a bit?");
        }
        return;
    }

    // --- Times Table Quiz Logic ---
    // Stop quiz if user says stop or similar
    if (activeQuiz && /\b(stop|cancel|quit|exit|something else)\b/i.test(message)) {
        activeQuiz = null;
        addBotMessage("Okay, we’ve stopped the quiz. Let me know if you want to do another one!");
        hideTypingIndicator();
        return;
    }
    // If awaiting answer in quiz mode
    if (activeQuiz?.awaitingAnswer) {
        const correct = activeQuiz.table * activeQuiz.current;
        const userAnswer = parseInt(message.trim(), 10);
        if (userAnswer === correct) {
            addBotMessage("✅ That's right! Great job!");
            activeQuiz.current++;
            if (activeQuiz.current <= 12) {
                addBotMessage(`Next one: What is ${activeQuiz.table} times ${activeQuiz.current}?`);
                activeQuiz.awaitingAnswer = true;
            } else {
                addBotMessage(`🎉 You've completed the ${activeQuiz.table} times table quiz! Well done!`);
                activeQuiz = null;
            }
        } else {
            addBotMessage("❌ Oops, not quite. Try again!");
            activeQuiz.awaitingAnswer = true;
        }
        hideTypingIndicator();
        return;
    }
    // Detect quiz trigger (e.g. "ask me questions of the 11 times table")
    const quizMatch = message.match(/(?:ask|give|test).*?(\d{1,2})\s*(?:times|x)\s*table/i);
    if (quizMatch) {
        const table = parseInt(quizMatch[1], 10);
        if (table >= 1 && table <= 12) {
            activeQuiz = { table, current: 2, awaitingAnswer: true };
            addBotMessage(`Here we go! What is ${table} times 2?`);
            hideTypingIndicator();
            return;
        }
    }

    showTypingIndicator();
    try {
        // Debug: Log user input
        console.log("🧠 User Message:", message);
        // Retrieve top facts to guide the AI
        const retrievedFacts = getTopFactsWithScores(message, knowledgeCorpus, 3);
        console.log("📚 Retrieved Facts:", retrievedFacts);
        const topFacts = retrievedFacts.map(f => f.text.replace(/\[[^\]]+\]/g, '').trim()); // Strip [topic][tag]
        const factBlock = topFacts.join("\n");

        // Build the prompt for the AI (always build, even if no facts)
        const prompt = `You are Bryneven Helper, a chatbot for 7-year-olds.\nUse the facts below to answer the question in a friendly way.\nIf there are no helpful facts, try to help anyway.\nFacts:\n${factBlock}\n\nUser: ${message}`;
        console.log("✍️ Prompt to AI:", prompt);

        // Call backend API instead of Gemini directly
        const response = await fetch(BACKEND_CHAT_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    { role: "user", parts: [{ text: prompt }] }
                ],
                generationConfig: {
                    maxOutputTokens: Math.max(200, Math.min(responseLength, 1000)),
                    temperature: 0.3
                }
            }),
            mode: 'cors',
            credentials: 'include'
        });
        const data = await response.json();
        let reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        reply = ensureFullSentence(reply, responseLength);
        hideTypingIndicator();
        // Only use fallback if reply is empty or missing
        if (!reply || reply.trim().length === 0) {
            addBotMessage("I'm not sure how to answer that yet, but let's learn together!");
            return;
        }
        addBotMessage(reply);
        chatHistory.push({ role: "assistant", content: reply });
        userMessageBuffer.push({ role: "assistant", content: reply });
        appendToConversationKnowledge({
            timestamp: new Date().toISOString(),
            role: 'assistant',
            content: reply
        });
        if (userMessageBuffer.length >= SUMMARY_INTERVAL) {
            const summary = summarizeMessages(userMessageBuffer);
            appendToConversationKnowledge({
                user: currentUser,
                timestamp: new Date().toISOString(),
                summary
            });
            userMessageBuffer = [];
        }
    } catch (error) {
        console.error("❌ AI call failed:", error);
        hideTypingIndicator();
        addBotMessage("I'm having trouble thinking right now. Can you try again in a bit?");
    }
}

// --- SUBJECT QUIZ LOGIC ---
let activeMCQuiz = null;
let quizScore = 0;
let quizTotal = 0;
let quizQuestions = [];
let quizCurrentIndex = 0;

// Subjects and subtopics (can be expanded)
const subjects = [
  { name: 'Maths', id: 'maths' },
  { name: 'English', id: 'english' },
  { name: 'Afrikaans', id: 'afrikaans' },
  { name: 'Social Sciences', id: 'social_sciences' },
  { name: 'History', id: 'history' }
];

function renderSubjectButtons() {
  const area = document.createElement('div');
  area.className = 'suggestion-buttons';
  area.id = 'subject-select-area';
  subjects.forEach(subj => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-btn';
    btn.textContent = subj.name;
    btn.onclick = () => startMCQuiz(subj.id, subj.name);
    area.appendChild(btn);
  });
  chatContainer.appendChild(area);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function startMCQuiz(subjectId, subjectName) {
  // Reset quiz state
  activeMCQuiz = { subjectId, subjectName };
  quizScore = 0;
  quizTotal = 0;
  quizQuestions = [];
  quizCurrentIndex = 0;
  // Remove subject buttons
  const area = document.getElementById('subject-select-area');
  if (area) area.remove();
  addBotMessage(`Starting a ${subjectName} quiz!`);
  // Ask for difficulty and number of questions
  askQuizSettings();
}

function askQuizSettings() {
  const settingsDiv = document.createElement('div');
  settingsDiv.className = 'suggestion-buttons';
  settingsDiv.id = 'quiz-settings-area';
  settingsDiv.innerHTML = `
    <label>Difficulty:
      <select id="quiz-difficulty">
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </label>
    <label>Questions:
      <select id="quiz-num-questions">
        <option value="3">3</option>
        <option value="5" selected>5</option>
        <option value="10">10</option>
      </select>
    </label>
    <button class="suggestion-btn" id="start-quiz-btn">Start Quiz</button>
  `;
  chatContainer.appendChild(settingsDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  document.getElementById('start-quiz-btn').onclick = () => {
    const diff = document.getElementById('quiz-difficulty').value;
    const num = parseInt(document.getElementById('quiz-num-questions').value, 10);
    settingsDiv.remove();
    fetchQuizQuestions(activeMCQuiz.subjectId, diff, num);
  };
}

async function fetchQuizQuestions(subjectId, difficulty, numQuestions) {
  // Use Gemini backend to generate questions
  addBotMessage('Getting your quiz ready...');
  showTypingIndicator();
  const prompt = `Generate ${numQuestions} multiple-choice questions for ${subjectId} (${difficulty}) for a primary school learner. Format as JSON: [{question, options:[A,B,C,D], answer, explanation}]`;
  try {
    const response = await fetch(BACKEND_CHAT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [ { role: "user", parts: [ { text: prompt } ] } ],
        generationConfig: { maxOutputTokens: 600, temperature: 0.3 }
      })
    });
    const data = await response.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    hideTypingIndicator();
    // Try to parse JSON from Gemini's response
    let questions = [];
    try {
      const match = text.match(/\[.*\]/s);
      if (match) text = match[0];
      questions = JSON.parse(text);
    } catch {
      addBotMessage('Sorry, I could not load quiz questions.');
      activeMCQuiz = null;
      return;
    }
    if (!Array.isArray(questions) || !questions.length) {
      addBotMessage('No quiz questions found.');
      activeMCQuiz = null;
      return;
    }
    quizQuestions = questions;
    quizTotal = questions.length;
    quizCurrentIndex = 0;
    showNextQuizQuestion();
  } catch (err) {
    hideTypingIndicator();
    addBotMessage('Quiz error. Please try again.');
    activeMCQuiz = null;
  }
}

function showNextQuizQuestion() {
  if (quizCurrentIndex >= quizTotal) {
    showQuizSummary();
    return;
  }
  const q = quizQuestions[quizCurrentIndex];
  const qDiv = document.createElement('div');
  qDiv.className = 'message bot';
  // Add a guiding feature at the start of each question
  const guide = document.createElement('div');
  guide.className = 'quiz-guide';
  guide.textContent = `Tip: Read the question carefully and think about each option before choosing your answer.`;
  qDiv.appendChild(guide);
  qDiv.innerHTML += `<p>Q${quizCurrentIndex+1}: ${q.question}</p>`;
  const optsDiv = document.createElement('div');
  optsDiv.className = 'suggestion-buttons';
  ['A','B','C','D'].forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-btn';
    btn.textContent = `${letter}: ${q.options[letter.charCodeAt(0)-65]}`;
    btn.onclick = () => handleQuizAnswerWithExplanation(letter, q, quizCurrentIndex);
    optsDiv.appendChild(btn);
  });
  qDiv.appendChild(optsDiv);
  chatContainer.appendChild(qDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// New: handle answer and get explanation from Phi-4
async function handleQuizAnswerWithExplanation(selected, questionObj, questionIdx) {
  let feedback = '';
  if (selected === questionObj.answer) {
    feedback = 'Correct!';
    quizScore++;
  } else {
    feedback = `Incorrect. The correct answer is ${questionObj.answer}.`;
  }
  addBotMessage(feedback);
  // Request academic explanation from Phi-4
  showTypingIndicator();
  try {
    const phiPrompt = `Evaluate the following multiple-choice question and the learner's answer. Provide an academic explanation suitable for a primary school learner.\n\nQuestion: ${questionObj.question}\nOptions: ${questionObj.options.join(', ')}\nLearner's answer: ${selected}\nCorrect answer: ${questionObj.answer}\nExplanation (if any): ${questionObj.explanation || ''}`;
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: phiPrompt,
        section: 'Knowledge',
        context: questionObj.question,
        user: currentUser || ''
      })
    });
    const data = await response.json();
    hideTypingIndicator();
    addBotMessage(data.reply || 'Here is some feedback to help you understand the answer.');
  } catch (err) {
    hideTypingIndicator();
    addBotMessage('Could not load explanation. Please try again.');
  }
  quizCurrentIndex++;
  setTimeout(showNextQuizQuestion, 1800);
}

function showQuizSummary() {
  addBotMessage(`Quiz complete! Your score: ${quizScore} out of ${quizTotal}.`);
  // Offer to restart or pick another subject
  const area = document.createElement('div');
  area.className = 'suggestion-buttons';
  const againBtn = document.createElement('button');
  againBtn.className = 'suggestion-btn';
  againBtn.textContent = 'Try another subject';
  againBtn.onclick = () => {
    area.remove();
    renderSubjectButtons();
  };
  area.appendChild(againBtn);
  chatContainer.appendChild(area);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- On load, show subject buttons after welcome ---
const origAddBotMessage = addBotMessage;
addBotMessage = function(msg) {
  origAddBotMessage(msg);
};

