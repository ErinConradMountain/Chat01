// Get DOM elements
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
const chatContainer = document.getElementById('chat-area');
const presetButtons = document.querySelectorAll('.preset-btn');
const temperatureSlider = document.getElementById('temperatureSlider');
const temperatureValue = document.getElementById('temperatureValue');
const maxTokensSlider = document.getElementById('maxTokensSlider');
const maxTokensValue = document.getElementById('maxTokensValue');
const presetTip = document.getElementById('preset-tip');
const tipDismiss = document.getElementById('tip-dismiss');
let temperatureSetting = 0.7;
let maxTokensSetting = 400;

// Backend endpoint (served by server.js). Allow overriding base via window.CHATBOT_API_BASE
const BACKEND_CHAT_API_URL = (((typeof window !== 'undefined') && window.CHATBOT_API_BASE) ? window.CHATBOT_API_BASE : '') + '/api/chat';

// Local knowledge cache and chat history
let knowledgeCorpus = null;
let chatHistory = [];

// Helper: fetch timeout compatible with older browsers
function fetchWithTimeout(resource, options = {}, timeoutMs = 20000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const opts = { ...options, signal: controller.signal };
    return fetch(resource, opts).finally(() => clearTimeout(id));
}

// Toggle streaming via URL: add ?nostream=1 to disable SSE for debugging
const STREAMING_ENABLED = (typeof window !== 'undefined')
    ? !new URLSearchParams(window.location.search).has('nostream')
    : true;
console.log('[chat] streaming enabled:', STREAMING_ENABLED);

if (tipDismiss && presetTip) {
    tipDismiss.addEventListener('click', () => {
        presetTip.style.display = 'none';
    });
}

if (temperatureSlider && temperatureValue) {
    const clampTemp = (val) => Math.max(0, Math.min(1, Number(val)));
    temperatureSetting = clampTemp(temperatureSlider.value || 0.7);
    temperatureSlider.addEventListener('input', (event) => {
        temperatureSetting = clampTemp(event.target.value);
        temperatureValue.textContent = temperatureSetting.toFixed(1);
    });
    temperatureValue.textContent = temperatureSetting.toFixed(1);
}

if (maxTokensSlider && maxTokensValue) {
    const clampTokens = (val) => Math.max(150, Math.min(700, Number(val)));
    maxTokensSetting = clampTokens(maxTokensSlider.value || 400);
    maxTokensSlider.addEventListener('input', (event) => {
        maxTokensSetting = clampTokens(event.target.value);
        maxTokensValue.textContent = Math.round(maxTokensSetting);
    });
    maxTokensValue.textContent = Math.round(maxTokensSetting);
}

if (presetButtons && presetButtons.length) {
    presetButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const prompt = button.getAttribute('data-prompt');
            if (!prompt) return;
            userInput.value = prompt;
            userInput.focus();
            sendMessage();
        });
    });
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

// Basic safety gate (stub) — return a friendly message or null to continue
function getSafetyResponse(message) {
    return null;
}

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
    console.log('About to call chat API via backend...');
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
        reply = ensureFullSentence(reply, maxTokensSetting);
        console.log('Chat response received:', reply);
        return reply;
    } catch (err) {
        console.error('Gemini API call failed:', err);
        // If external API fails, use local fallback
        return "Oops! I had a problem thinking right now. Let me try again with my local knowledge.";
    }
}

// Generate initial questions about pasted content (use backend)
async function generateInitialQuestions(text) {
    const prompt = `\nYou're Bryneven Helper, a chatbot for learners aged 713.\n\nHere is something the learner pasted:\n"${text}"\n\nYour job is to ask 2 friendly, simple questions to check understanding.\nAvoid tricky words. Ask like a kind tutor. Use full sentences.\n`;
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


    // Dropdown suggestions
    const suggestionMap = {
        'about our school': 'Tell me about Bryneven Primary School.',
        'purple mash help': 'What is Purple Mash?',
        'school hours': 'What are the school hours?',
        'math tutoring': 'I need help with math.',
        'homework tips': 'Give me 3 simple homework tips for Grade 5.',
        'explain fractions': 'Explain fractions like I am in Grade 4.',
        'reading practice': 'Give me a short reading practice with 2 questions.',
        'science project ideas': 'Suggest 3 easy science project ideas for primary school.'
    };
    const suggestionSelect = document.getElementById('suggestion-select');
    if (suggestionSelect) {
        suggestionSelect.addEventListener('change', () => {
            const key = suggestionSelect.value.trim().toLowerCase();
            const mapped = suggestionMap[key] || suggestionSelect.value.trim();
            if (mapped && userInput && !userInput.disabled) {
                userInput.value = mapped;
                sendMessage();
                suggestionSelect.selectedIndex = 0; // reset placeholder
            }
        });
    }

    // Context menu: Describe / Define / Explain / Provide an Example
    setupContextMenu();
    // Tip and help tooltip are handled by unified implementations below
});

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
    console.log('[chat] user message:', message);
    const messageElement = document.createElement('div');
    messageElement.className = 'message user';
    const p = document.createElement('p');
    p.textContent = message;
    messageElement.appendChild(p);
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function sanitizeForDisplay(message) {
    if (!message) return '';
    let plainMessage = message.replace(/<[^>]+>/g, '').replace(/[`*_~]/g, '');
    plainMessage = plainMessage.replace(/[\[\]{}]/g, '');
    if (plainMessage.length > 750) {
        plainMessage = plainMessage.slice(0, 750);
        if (!plainMessage.endsWith('.')) plainMessage += '...';
    }
    return plainMessage;
}

function addBotMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message bot';
    const safeText = sanitizeForDisplay(message);
    const p = document.createElement('p');
    p.textContent = safeText;
    p.classList.add('bot-text');
    messageElement.appendChild(p);
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function createStreamingBotParagraph() {
    const messageElement = document.createElement('div');
    messageElement.className = 'message bot';
    const paragraph = document.createElement('p');
    paragraph.classList.add('bot-text');
    paragraph.textContent = '';
    messageElement.appendChild(paragraph);
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return paragraph;
}

// Context menu implementation
function setupContextMenu() {
    let menu;
    function ensureMenu() {
        if (menu) return menu;
        menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.background = '#fff';
        menu.style.border = '1px solid #ddd';
        menu.style.borderRadius = '6px';
        menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        menu.style.padding = '6px';
        menu.style.display = 'none';
        menu.style.zIndex = 1000;
        const items = ['Describe', 'Define', 'Explain', 'Provide an Example'];
        items.forEach(label => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.display = 'block';
            btn.style.width = '100%';
            btn.style.textAlign = 'left';
            btn.style.padding = '6px 10px';
            btn.style.borderRadius = '4px';
            btn.style.border = 'none';
            btn.style.background = 'transparent';
            btn.style.cursor = 'pointer';
            btn.addEventListener('mouseenter', () => btn.style.background = '#f3f4f6');
            btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
            btn.addEventListener('click', () => {
                const selection = window.getSelection()?.toString()?.trim();
                hideMenu();
                if (selection) handleContextAction(label, selection);
            });
            menu.appendChild(btn);
        });
        document.body.appendChild(menu);
        document.addEventListener('click', hideMenu);
        window.addEventListener('resize', hideMenu);
        return menu;
    }
    function hideMenu() { if (menu) menu.style.display = 'none'; }
    function showMenu(x, y) {
        ensureMenu();
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;
        menu.style.display = 'block';
    }
    // Right-click on bot text
    document.addEventListener('contextmenu', (e) => {
        const target = e.target;
        if (target && target.classList && target.classList.contains('bot-text')) {
            e.preventDefault();
            const sel = window.getSelection()?.toString()?.trim();
            if (sel) showMenu(e.clientX, e.clientY);
        }
    });
    // Long-press on mobile
    let touchTimer = null;
    document.addEventListener('touchstart', (e) => {
        const target = e.target;
        if (target && target.classList && target.classList.contains('bot-text')) {
            touchTimer = setTimeout(() => {
                const sel = window.getSelection()?.toString()?.trim();
                if (sel) {
                    const touch = e.touches[0];
                    showMenu(touch.clientX, touch.clientY);
                }
            }, 500);
        }
    }, { passive: true });
    document.addEventListener('touchend', () => { if (touchTimer) clearTimeout(touchTimer); }, { passive: true });
}

async function handleContextAction(action, text) {
    const prompt = `${action} the term or phrase: "${text}" in a way a Grade 4-7 learner can understand. Keep it friendly and clear.`;
    userInput.value = prompt;
    await sendMessage();
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
    const chatContainer = document.getElementById('chat-area');
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

// --- HOMEWORK  CHATBOT SYNERGY ---
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
    const schoolVal = userProfile.schoolId;
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
    return hwList.map(hw => ' ' + hw.subject + ': ' + hw.description).join('\n');
}

async function streamChatCompletion(payload) {
    const url = `${BACKEND_CHAT_API_URL}?stream=1`;
    console.log('[chat] stream request payload:', payload);
    const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload),
    }, 20000);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    if (!response.body) {
        throw new Error('Streaming not supported');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let aggregated = '';
    let paragraph = null;
    let indicatorCleared = false;

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            // Normalize CRLF to LF for consistent SSE parsing
            buffer = buffer.replace(/\r\n/g, '\n');
            let boundary;
            while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                const rawEvent = buffer.slice(0, boundary).trim();
                buffer = buffer.slice(boundary + 2);
                if (!rawEvent) continue;
                let eventType = 'message';
                let dataPayload = '';
                for (const line of rawEvent.split('\n')) {
                    if (line.startsWith('event:')) {
                        eventType = line.slice(6).trim();
                    } else if (line.startsWith('data:')) {
                        dataPayload += line.slice(5).trim();
                    }
                }
                if (!dataPayload) continue;
                if (eventType === 'token') {
                    let delta = '';
                    try {
                        const parsed = JSON.parse(dataPayload);
                        delta = parsed.delta || parsed.text || '';
                    } catch {
                        delta = dataPayload;
                    }
                    if (!delta) continue;
                    aggregated += delta;
                    if (aggregated.length === delta.length) {
                        console.log('[chat] first token received');
                    }
                    if (!indicatorCleared) {
                        hideTypingIndicator();
                        paragraph = createStreamingBotParagraph();
                        indicatorCleared = true;
                    }
                    if (paragraph) {
                        paragraph.textContent = sanitizeForDisplay(aggregated);
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                } else if (eventType === 'done') {
                    console.log('[chat] stream done, chars:', aggregated.length);
                    return { text: aggregated, paragraph, streamed: indicatorCleared };
                } else if (eventType === 'error') {
                    let message = 'Stream error';
                    try {
                        const parsed = JSON.parse(dataPayload);
                        message = parsed.message || message;
                    } catch {}
                    console.warn('[chat] stream error event:', message);
                    throw new Error(message);
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    return { text: aggregated, paragraph, streamed: indicatorCleared };
}

async function requestChatCompletion(payload) {
    console.log('[chat] fallback request payload:', payload);
    const response = await fetchWithTimeout(BACKEND_CHAT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        mode: 'cors',
        credentials: 'include',
    }, 20000);

    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const serverError = data?.error || `HTTP ${response.status}`;
        throw new Error(serverError);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[chat] fallback response chars:', text.length);
    return text;
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

    const safetyResponse = getSafetyResponse(message);
    if (safetyResponse) {
        const safeReply = ensureFullSentence(safetyResponse, maxTokensSetting);
        addBotMessage(safeReply);
        chatHistory.push({ role: "assistant", content: safeReply });
        userMessageBuffer.push({ role: "assistant", content: safeReply });
        appendToConversationKnowledge({
            timestamp: new Date().toISOString(),
            role: 'assistant',
            content: safeReply
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
        return;
    }

    const payload = {
        contents: [
            { role: "user", parts: [{ text: message }] }
        ],
        generationConfig: {
            maxOutputTokens: Math.round(Math.max(150, Math.min(maxTokensSetting, 1000))),
            temperature: Number(Number(temperatureSetting).toFixed(2))
        }
    };

    showTypingIndicator();

    let streamedSuccessfully = false;
    let streamParagraph = null;
    let finalReply = '';

    if (STREAMING_ENABLED) {
        try {
            const streamResult = await streamChatCompletion(payload);
            if (streamResult && typeof streamResult.text === 'string') {
                finalReply = streamResult.text;
                streamParagraph = streamResult.paragraph || null;
                streamedSuccessfully = true;
            }
        } catch (streamError) {
            console.warn('Streaming failed, falling back to JSON response.', streamError);
        }
    }

    if (!streamedSuccessfully) {
        try {
            finalReply = await requestChatCompletion(payload);
        } catch (error) {
            hideTypingIndicator();
            const lower = (error.message || '').toLowerCase();
            if (lower.includes('missing openrouter_api_key')) {
                addBotMessage("The server isn't ready yet. Please add the OpenRouter API key and try again.");
            } else {
                addBotMessage("Hmm, I couldn't reach my helper brain. Please try again in a moment.");
            }
            console.error('Chat API responded with error:', error);
            return;
        }
    }

    if (!streamedSuccessfully || !streamParagraph) {
        hideTypingIndicator();
    }

    finalReply = ensureFullSentence(finalReply, maxTokensSetting);

    if (!finalReply || !finalReply.trim()) {
        if (streamedSuccessfully && streamParagraph) {
            streamParagraph.textContent = "I'm not sure how to answer that yet, but let's learn together!";
        } else {
            addBotMessage("I'm not sure how to answer that yet, but let's learn together!");
        }
        return;
    }

    if (streamedSuccessfully) {
        if (streamParagraph) {
            streamParagraph.textContent = sanitizeForDisplay(finalReply);
        }
    } else {
        addBotMessage(finalReply);
    }

    chatHistory.push({ role: "assistant", content: finalReply });
    userMessageBuffer.push({ role: "assistant", content: finalReply });
    appendToConversationKnowledge({
        timestamp: new Date().toISOString(),
        role: 'assistant',
        content: finalReply
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
  // Request a kid-friendly explanation via the same backend chat API
  showTypingIndicator();
  try {
    const explainPrompt = `Explain, in simple kid-friendly words, why the correct answer is ${questionObj.answer} for this question, and give one short tip for next time.\n\nQuestion: ${questionObj.question}\nOptions: ${questionObj.options.join(', ')}\nLearner's answer: ${selected}\nCorrect answer: ${questionObj.answer}\nExplanation (if any): ${questionObj.explanation || ''}`;
    const response = await fetch(BACKEND_CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [ { role: 'user', parts: [ { text: explainPrompt } ] } ],
        generationConfig: { maxOutputTokens: 300, temperature: 0.5 }
      })
    });
    let data;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    hideTypingIndicator();
    if (!response.ok) {
      console.error('Quiz explanation request failed:', { status: response.status, data });
      addBotMessage('Could not load explanation. Please try again.');
      return;
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Here is some feedback to help you understand the answer.';
    addBotMessage(text);
  } catch (err) {
    console.error('Quiz explanation fetch failed:', err);
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

// --- SIGN-UP WIZARD LOGIC ---
document.addEventListener('DOMContentLoaded', function setupSignUpWizardWrapper() {
(function setupSignUpWizard() {
    const showSignUpBtn = document.getElementById('showSignUpBtn');
    const signUpWizardModal = document.getElementById('signUpWizardModal');
    const wizardStepContent = document.getElementById('wizardStepContent');
    const wizardStepIndicator = document.getElementById('wizardStepIndicator');
    const wizardError = document.getElementById('wizardError');
    const confettiCanvas = document.getElementById('confettiCanvas');
    let wizardStep = 0;
    let userProfile = { name: '', email: '', schoolId: '', grade: null };
    let schoolsList = [];

    // Helper: update stepper UI
    function updateStepIndicator() {
        Array.from(wizardStepIndicator.children).forEach((dot, idx) => {
            dot.className = 'w-3 h-3 rounded-full ' + (idx === wizardStep ? 'bg-blue-400' : 'bg-gray-300');
        });
    }

    // Helper: show error
    function showWizardError(msg) {
        wizardError.textContent = msg;
        wizardError.classList.remove('hidden');
    }
    function clearWizardError() {
        wizardError.textContent = '';
        wizardError.classList.add('hidden');
    }

    // Step 0: Launch Pad
    function renderStep0() {
        updateStepIndicator();
        wizardStepContent.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="text-3xl mb-2"> Buddy-Bot</div>
                <div class="text-lg font-semibold mb-4 text-center">Ready to join our learning galaxy?</div>
                <button id="wizardNextBtn" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition">Lets Lift Off!</button>
            </div>
        `;
        document.getElementById('wizardNextBtn').onclick = () => { wizardStep = 1; renderStep1(); };
    }

    // Step 1: Learner Details
    function renderStep1() {
        updateStepIndicator();
        wizardStepContent.innerHTML = `
            <label class="block mb-2 font-semibold">Your Hero Name</label>
            <input id="wizardName" type="text" class="w-full p-2 border border-gray-300 rounded mb-4" placeholder="" autocomplete="off" />
            <label class="block mb-2 font-semibold">Email</label>
            <div class="flex items-center">
                <input id="wizardEmail" type="email" class="flex-grow p-2 border border-gray-300 rounded" placeholder="" autocomplete="off" />
                <span id="emailCheck" class="ml-2 text-xl"></span>
            </div>
            <button id="wizardNextBtn" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded mt-4 transition">Next</button>
            <button id="wizardBackBtn" class="text-gray-500 hover:underline mt-2 ml-2">Back</button>
        `;
        // Animated placeholder for name
        const nameInput = document.getElementById('wizardName');
        const namePh = 'Type your hero name here ';
        let phIdx = 0;
        nameInput.placeholder = '';
        let phInterval = setInterval(() => {
            if (phIdx <= namePh.length) {
                nameInput.placeholder = namePh.slice(0, phIdx);
                phIdx++;
            } else {
                clearInterval(phInterval);
            }
        }, 40);
        // Email live check
        const emailInput = document.getElementById('wizardEmail');
        const emailCheck = document.getElementById('emailCheck');
        emailInput.addEventListener('input', () => {
            const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
            emailCheck.textContent = valid ? '' : (emailInput.value ? '' : '');
        });
        // Next button
        document.getElementById('wizardNextBtn').onclick = () => {
            clearWizardError();
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            if (!name) return showWizardError('Please enter your hero name.');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showWizardError('Please enter a valid email.');
            userProfile.name = name;
            userProfile.email = email;
            wizardStep = 2; renderStep2();
        };
        document.getElementById('wizardBackBtn').onclick = () => { wizardStep = 0; renderStep0(); };
    }

    // Step 2: School & Grade Picker
    async function renderStep2() {
        updateStepIndicator();
        // Load schools if not loaded
        if (!schoolsList.length) {
            try {
                const resp = await fetch('data/schools.json');
                schoolsList = await resp.json();
            } catch {
                schoolsList = [];
            }
        }
        var schoolOptions = '<option value="">Choose a school</option>';
        for (var i = 0; i < schoolsList.length; i++) {
            schoolOptions += '<option value="' + schoolsList[i].id + '">' + schoolsList[i].name + '</option>';
        }
        wizardStepContent.innerHTML = `
            <label class="block mb-2 font-semibold">Select Your School</label>
            <select id="wizardSchool" class="w-full p-2 border border-gray-300 rounded mb-4">
                ${schoolOptions}
            </select>
            <label class="block mb-2 font-semibold">Select Your Grade</label>
            <select id="wizardGrade" class="w-full p-2 border border-gray-300 rounded mb-4" disabled>
                <option value="">Choose a grade</option>
            </select>
            <button id="wizardNextBtn" class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded transition">Next</button>
            <button id="wizardBackBtn" class="text-gray-500 hover:underline mt-2 ml-2">Back</button>
        `;
        const schoolSelect = document.getElementById('wizardSchool');
        const gradeSelect = document.getElementById('wizardGrade');
        schoolSelect.addEventListener('change', () => {
            if (schoolSelect.value) {
                gradeSelect.disabled = false;
                var gradeOptions = '<option value="">Choose a grade</option>';
                for (var i = 1; i <= 12; i++) {
                    gradeOptions += '<option value="' + i + '">Grade ' + i + '</option>';
                }
                gradeSelect.innerHTML = gradeOptions;
            } else {
                gradeSelect.disabled = true;
                gradeSelect.innerHTML = '<option value="">Choose a grade</option>';
            }
        });
        document.getElementById('wizardNextBtn').onclick = () => {
            clearWizardError();
            const schoolId = schoolSelect.value;
            const grade = parseInt(gradeSelect.value, 10);
            if (!schoolId) return showWizardError('Please select your school.');
            if (!grade) return showWizardError('Please select your grade.');
            userProfile.schoolId = schoolId;
            userProfile.grade = grade;
            wizardStep = 3; renderStep3();
        };
        document.getElementById('wizardBackBtn').onclick = () => { wizardStep = 1; renderStep1(); };
    }

    // Step 3: Avatar Celebration
    function renderStep3() {
        updateStepIndicator();
        wizardStepContent.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="text-4xl mb-2 animate-bounce"> Buddy-Bot</div>
                <div class="text-2xl font-bold mb-2">Welcome, ${userProfile.name}!</div>
                <div class="text-lg mb-2 text-center">Homework HQ unlocked.</div>
                <label class="block mb-2 font-semibold">Choose a Password</label>
                <input id="wizardPassword" type="password" class="w-full p-2 border border-gray-300 rounded mb-4" placeholder="Create a password" autocomplete="new-password" required />
                <button id="wizardFinishBtn" class="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded transition">Create Account & Start Exploring!</button>
            </div>
        `;
        // Confetti celebration
        confettiCanvas.style.display = '';
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
        confetti.create(confettiCanvas, {resize:true, useWorker:true})({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.6 }
        });
        document.getElementById('wizardFinishBtn').onclick = () => {
            clearWizardError();
            const password = document.getElementById('wizardPassword').value;
            if (!password || password.length < 4) {
                showWizardError('Please choose a password (at least 4 characters).');
                return;
            }
            // Save user credentials to localStorage
            const users = JSON.parse(localStorage.getItem('users') || '{}');
            if (users[userProfile.name]) {
                showWizardError('That username is already taken. Please choose another.');
                return;
            }
            users[userProfile.name] = password;
            localStorage.setItem('users', JSON.stringify(users));
            // --- Ensure user profile is also saved in users object for login compatibility ---
            // Save profile
            const uid = 'uid-' + Math.random().toString(36).slice(2,10);
            // FIX: Add role to profile (default to 'student')
            const profileToSave = { uid, name: userProfile.name, schoolId: userProfile.schoolId, grade: userProfile.grade, role: userProfile.role || 'student' };
            localStorage.setItem('userProfile', JSON.stringify(profileToSave));
            // --- Also store user profile in a users_profiles object for future extensibility ---
            const usersProfiles = JSON.parse(localStorage.getItem('users_profiles') || '{}');
            usersProfiles[userProfile.name] = profileToSave;
            localStorage.setItem('users_profiles', JSON.stringify(usersProfiles));
            signUpWizardModal.classList.add('hidden');
            confettiCanvas.style.display = 'none';
            // --- AUTO LOGIN AFTER SIGNUP ---
            currentUser = userProfile.name;
            currentUserPassword = password;
            document.getElementById('loginContainer').style.display = 'none';
            const chatWrapper = document.getElementById('chatWrapper');
            if (chatWrapper) chatWrapper.style.display = 'block';
            userInput.disabled = false;
            sendBtn.disabled = false;
            showLogoutButton(true);
            addBotMessage('Welcome, ' + currentUser + '! Your account is created and you are now logged in.');
        };
    }

    // Redirect to dedicated sign up page instead of inline wizard
    if (showSignUpBtn) {
        showSignUpBtn.addEventListener('click', () => {
            window.location.href = 'docs/signup.html';
        });
    }
})();
});
