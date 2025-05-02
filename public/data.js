// School knowledge base
const schoolKnowledge = {
    "name": "Bryneven Primary School",
    "grades": "Grade 1 to Grade 7",
    "hours": "7:30am to 1:40pm",
    "special_programs": {
        "coding_robotics": {
            "description": "Coding and robotics program for Grades 4-7",
            "platform": "Purple Mash",
            "equipment": "Cubroid robotics kits"
        }
    },
    "contact_info": {
        "address": "Bryneven Primary School, Bryanston, Sandton",
        "email": "info@bryneven.co.za",
        "phone": "(School phone placeholder)"
    }
};

// Cubroid robotics information
const roboticsInfo = {
    "cubroid": {
        "description": "Cubroid is a modular robotics kit designed for coding education. It consists of cubes that snap together with magnets, allowing students to build various robots without complicated assembly.",
        "features": [
            "Magnetic cubes that easily connect together",
            "Bluetooth connectivity for programming",
            "Compatible with Scratch and block-based programming",
            "Various sensors including light, sound, and distance sensors",
            "Motor blocks for movement and action"
        ],
        "learning_path": "Students typically start with simple structures and basic movements, then progress to more complex behaviors using sensors and programming logic."
    },
    "purple_mash": {
        "description": "Purple Mash is an educational platform with tools and resources for computing curriculum. It includes 2Code for block-based programming activities.",
        "features": [
            "Web-based platform accessible from any device",
            "Block coding interface suitable for beginners",
            "Built-in tutorials and guided activities",
            "Projects can be saved and shared with teachers",
            "Includes game design, animation, and simple app creation tools"
        ],
        "classroom_use": "In Bryneven Primary, Purple Mash is used alongside Cubroid kits to teach programming concepts before applying them to physical robots."
    }
};

// --- Unified Knowledge Layer ---

// Utility to flatten a JSON object into "key: value" fact strings
function flattenJson(obj, prefix = '') {
    let facts = [];
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            facts = facts.concat(flattenJson(obj[key], `${prefix}${key}.`));
        } else {
            facts.push(`${prefix}${key}: ${obj[key]}`);
        }
    }
    return facts;
}

// Utility to split long facts into ≤200 character chunks on sentence boundaries
function chunkFact(fact, maxLen = 200) {
    if (fact.length <= maxLen) return [fact.trim()];
    // Split on sentence boundaries (., !, ?)
    const sentences = fact.match(/[^.!?]+[.!?]?/g) || [fact];
    let chunks = [];
    let current = '';
    for (const sentence of sentences) {
        if ((current + sentence).trim().length > maxLen) {
            if (current.trim()) chunks.push(current.trim());
            current = sentence;
        } else {
            current += sentence;
        }
    }
    if (current.trim()) chunks.push(current.trim());
    // Remove empty strings
    return chunks.filter(Boolean);
}

// 3.1 Define a fixed list of topics and keywords
const TOPIC_KEYWORDS = {
    leadership: ["principal", "head", "leadership", "nakooda", "staff"],
    sports: ["sport", "soccer", "netball", "cricket", "athletics", "team", "coach", "ball"],
    fees: ["fee", "fees", "payment", "cost", "tuition"],
    contact: ["address", "email", "phone", "contact", "location"],
    academics: ["grade", "subject", "curriculum", "class", "lesson", "teacher", "homework"],
    robotics: ["robotics", "cubroid", "coding", "programming", "purple mash", "kit", "block coding"],
    hours: ["hours", "time", "schedule", "start", "end", "timetable"],
    general: [] // fallback
};

// 3.2 Assign topic tags to a fact chunk
function tagTopics(fact) {
    const lower = fact.toLowerCase();
    let topics = [];
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        if (keywords.some(kw => lower.includes(kw))) {
            topics.push(topic);
        }
    }
    if (topics.length === 0) topics.push("general");
    return topics;
}

// Build the unified knowledge corpus
export async function buildKnowledgeCorpus() {
    let corpus = [];

    // 1.1 Read and parse knowledge.json
    try {
        const jsonResp = await fetch('/data/knowledge.json');
        if (!jsonResp.ok) throw new Error('knowledge.json not found');
        const jsonData = await jsonResp.json();
        corpus = corpus.concat(flattenJson(jsonData));
    } catch (e) {
        console.error('Error loading knowledge.json:', e);
    }

    // 1.2 Read knowledge.txt line-by-line
    try {
        const txtResp = await fetch('/data/knowledge.txt');
        if (!txtResp.ok) throw new Error('knowledge.txt not found');
        const txtData = await txtResp.text();
        const lines = txtData.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        corpus = corpus.concat(lines);
    } catch (e) {
        console.error('Error loading knowledge.txt:', e);
    }

    // 2. Chunk facts and enforce length limits, 3. Tag each chunk
    let chunkedCorpus = [];
    for (const fact of corpus) {
        for (const chunk of chunkFact(fact, 200)) {
            const text = chunk.trim();
            if (text) {
                chunkedCorpus.push({
                    text,
                    topics: tagTopics(text)
                });
            }
        }
    }

    return chunkedCorpus;
}

// --- Semantic Embedding Index (Step 4) ---

// 4.1 Load Universal Sentence Encoder (TensorFlow.js)
let useModel = null;
async function loadUSE() {
    if (!useModel) {
        // Dynamically import TensorFlow.js and the USE model
        const use = await import('@tensorflow-models/universal-sentence-encoder');
        useModel = await use.load();
    }
    return useModel;
}

// 4.2 Compute embeddings for each fact chunk
export async function embedKnowledgeCorpus(knowledgeCorpus) {
    const model = await loadUSE();
    const sentences = knowledgeCorpus.map(f => f.text);
    const embeddings = await model.embed(sentences);
    return embeddings.arraySync(); // returns array of vectors
}

// 4.3 Semantic search using cosine similarity
function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function semanticSearch(query, knowledgeCorpus, factEmbeddings, k = 3) {
    const model = await loadUSE();
    const queryEmbedding = (await model.embed([query])).arraySync()[0];
    const scored = factEmbeddings.map((emb, i) => ({
        text: knowledgeCorpus[i].text,
        topics: knowledgeCorpus[i].topics,
        score: cosineSimilarity(queryEmbedding, emb)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
}

// 5. Topic-Aware Retrieval API
export async function topicAwareRetrieve(query, knowledgeCorpus, factEmbeddings, k = 5) {
    // 5.1 Detect query topic(s)
    const queryTopics = tagTopics(query);

    // 5.2 Embed the query
    const model = await loadUSE();
    const queryEmbedding = (await model.embed([query])).arraySync()[0];

    // 5.2 Retrieve top-K semantically closest facts within that topic
    // Filter facts by topic
    let filtered = knowledgeCorpus
        .map((fact, i) => ({
            ...fact,
            embedding: factEmbeddings[i],
            idx: i
        }))
        .filter(fact => fact.topics.some(t => queryTopics.includes(t)));

    // If not enough, broaden to 'general' or all
    if (filtered.length < 3) {
        // Try adding 'general' facts
        const generalFacts = knowledgeCorpus
            .map((fact, i) => ({
                ...fact,
                embedding: factEmbeddings[i],
                idx: i
            }))
            .filter(fact => fact.topics.includes('general'));
        filtered = filtered.concat(generalFacts.filter(f => !filtered.includes(f)));
    }
    if (filtered.length < 3) {
        // As last resort, use all facts
        filtered = knowledgeCorpus.map((fact, i) => ({
            ...fact,
            embedding: factEmbeddings[i],
            idx: i
        }));
    }

    // Score by semantic similarity
    const scored = filtered.map(fact => ({
        text: fact.text,
        topics: fact.topics,
        score: cosineSimilarity(queryEmbedding, fact.embedding)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
}

// Simple word-overlap retrieval
function getTopFacts(question, knowledgeCorpus, k = 3) {
    const qWords = question.toLowerCase().split(/\W+/);
    // Optionally, infer topics from question for better filtering
    const questionTopics = tagTopics(question);

    // Score facts by topic match and word overlap
    const scored = knowledgeCorpus.map(({ text, topics }) => {
        const fWords = text.toLowerCase().split(/\W+/);
        const topicScore = topics.some(t => questionTopics.includes(t)) ? 1 : 0;
        const wordScore = qWords.filter(w => w && fWords.includes(w)).length;
        return { text, score: topicScore * 10 + wordScore }; // topic match is weighted higher
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter(x => x.score > 0).slice(0, k).map(x => x.text);
    return top;
}

// New: getTopFactsWithScores for fallback logic
function getTopFactsWithScores(question, knowledgeCorpus, k = 3) {
    const qWords = question.toLowerCase().split(/\W+/);
    const questionTopics = tagTopics(question);
    const scored = knowledgeCorpus.map(({ text, topics }) => {
        const fWords = text.toLowerCase().split(/\W+/);
        const topicScore = topics.some(t => questionTopics.includes(t)) ? 1 : 0;
        const wordScore = qWords.filter(w => w && fWords.includes(w)).length;
        // Normalize score to [0,1] for fallback threshold (max possible: topicScore*10 + wordScore)
        // Assume max wordScore ~5, so max total ~15
        const rawScore = topicScore * 10 + wordScore;
        const normScore = rawScore / 15;
        return { text, score: normScore };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.filter(x => x.score > 0).slice(0, k);
}

/**
 * Appends a homework entry to /data/homework.json (file fallback).
 * @param {Object} entry - The homework entry object.
 */
export async function appendHomeworkEntry(entry) {
    try {
        // Fetch current homework list
        const resp = await fetch('data/homework.json');
        let hwList = [];
        try {
            hwList = await resp.json();
            if (!Array.isArray(hwList)) hwList = [];
        } catch { hwList = []; }
        // Append new entry
        hwList.push(entry);
        // PUT updated list (simulate file write, works if backend supports it)
        await fetch('data/homework.json', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(hwList)
        });
    } catch (e) {
        console.error('Failed to append homework entry:', e);
    }
}

/**
 * Save a new homework entry with validation, Firestore POST, local update, and toast feedback.
 * @param {Object} values - Homework form values (subject, weekStart, description, etc.)
 * @param {Object} user - User object with schoolId, grade, uid
 * @param {Array} homeworkList - Local homework list array (will be mutated)
 * @param {Function} renderHomeworkList - Function to re-render the homework list
 * @param {Function} toast - Toast object with .success and .error methods
 * @param {Function} closeDrawer - Function to close the homework drawer
 * @param {Object} db - Firestore db instance
 * @returns {Promise<void>}
 */
export async function saveHomework(values, user, homeworkList, renderHomeworkList, toast, closeDrawer, db) {
  // 1. Validation
  if (values.description.length > 200) {
    toast.error("Please keep the task under 200 characters.");
    return;
  }

  // 2. POST to Firestore (using addDoc)
  const payload = {
    ...values,                        // subject, weekStart, etc.
    schoolId: user.schoolId,
    grade:    user.grade,
    createdBy: user.uid,
    timestamp: Date.now()
  };

  // Firestore addDoc (assumes firebase/firestore is imported in the caller)
  // Example: import { addDoc, collection } from 'firebase/firestore';
  let docRef;
  try {
    const { addDoc, collection } = await import('firebase/firestore');
    docRef = await addDoc(collection(db, "homework"), payload);
  } catch (e) {
    toast.error("Failed to post homework. Please try again.");
    return;
  }

  // 3. Local update (optimistic)
  homeworkList.push({ id: docRef.id, ...payload });
  renderHomeworkList();

  // 4. Feedback
  toast.success("✨ Homework posted! Learners can see it now.");
  closeDrawer();
}

/**
 * Assembles the generation prompt for the model.
 * @param {string} userMessage - The latest user message.
 * @param {Array<{user: string, assistant: string}>} history - Array of previous exchanges.
 * @param {Array<string>} facts - Array of 3–5 retrieved fact strings.
 * @returns {string} The assembled prompt.
 */
export function buildGenerationPrompt(userMessage, history, facts) {
    // 6.2: Rolling summary of last 2 turns
    let context = '';
    if (history && history.length > 0) {
        const lastTwo = history.slice(-2);
        context = lastTwo.map(
            turn => `User: ${turn.user} Assistant: ${turn.assistant}`
        ).join(' | ');
    } else {
        context = 'This is the start of the conversation.';
    }

    // 6.3: Insert facts, separated by semicolons
    const factsStr = facts.join('; ');

    // 6.1: Template
    const prompt = 
`SYSTEM: You are Bryneven Helper, talking to a 7-year-old. Use simple words, no markup, ≤1500 chars.
CONTEXT: ${context}
FACTS: ${factsStr}
USER: ${userMessage}
ASSISTANT:`;

    return prompt;
}

export { getTopFacts, getTopFactsWithScores };

// Example homework entry
const exampleHomeworkEntry = {
  "id": "hw_2025_05_06_math_g4",
  "schoolId": "bryneven",
  "grade": 4,
  "weekStart": "2025-05-05",
  "subject": "Mathematics",
  "description": "Complete page 12 – Long Division worksheet.",
  "createdBy": "uid123",
  "timestamp": 1714992000
};