// logger.js
// Logging utility for chatbot turns (JSONL format)
// Logs: { user, retrieved_facts, raw_reply, final_reply, length, readability_score, flags }
// Flags: readability_score > target, final_reply > 1500 chars, negative_feedback
// Filters basic PII (email, phone)

import fs from 'fs';
import path from 'path';

const LOG_PATH = path.join(process.cwd(), 'chatbot_logs.jsonl');
const READABILITY_TARGET = 70; // Example Flesch-Kincaid target

// Simple PII filter (removes emails, phone numbers)
function filterPII(text) {
    if (!text) return text;
    // Remove emails
    let filtered = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[email]');
    // Remove phone numbers (simple pattern)
    filtered = filtered.replace(/\b\d{3,4}[-.\s]?\d{3}[-.\s]?\d{3,4}\b/g, '[phone]');
    return filtered;
}

// Compute Flesch-Kincaid readability score (simple version)
function fleschKincaid(text) {
    if (!text) return 0;
    const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1;
    const words = text.split(/\s+/).filter(Boolean).length || 1;
    const syllables = text.split(/\b/).filter(w => /[aeiouy]/i.test(w)).length || 1;
    // Flesch-Kincaid formula
    return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}

/**
 * Log a chatbot turn to chatbot_logs.jsonl
 * @param {Object} params
 * @param {string} params.user - User input (PII filtered)
 * @param {Array<string>} params.retrieved_facts
 * @param {string} params.raw_reply
 * @param {string} params.final_reply
 * @param {boolean} params.negative_feedback - If user gave negative feedback
 * @param {string} [params.model] - Model used (optional)
 * @param {number} [params.elapsed] - Response time in ms (optional)
 */
export function logTurn({ user, retrieved_facts, raw_reply, final_reply, negative_feedback, model, elapsed }) {
    const filteredUser = filterPII(user);
    const filteredRaw = filterPII(raw_reply);
    const filteredFinal = filterPII(final_reply);
    const length = filteredFinal.length;
    const readability_score = fleschKincaid(filteredFinal);
    const flags = [];
    if (readability_score > READABILITY_TARGET) flags.push('readability');
    if (length > 1500) flags.push('length');
    if (negative_feedback) flags.push('negative_feedback');
    const logEntry = {
        timestamp: new Date().toISOString(),
        user: filteredUser,
        retrieved_facts,
        raw_reply: filteredRaw,
        final_reply: filteredFinal,
        length,
        readability_score,
        flags,
        ...(model && { model }),
        ...(elapsed && { elapsed })
    };
    fs.appendFile(LOG_PATH, JSON.stringify(logEntry) + '\n', err => {
        if (err) console.error('Log write error:', err);
    });
}
