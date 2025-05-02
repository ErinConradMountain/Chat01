// curate.js
// Automates weekly curation & iteration for chatbot knowledge base
// Usage: node curate.js

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const KNOWLEDGE_FILES = ['knowledge.json', 'knowledge.txt'];
const PROMPT_TEMPLATE_FILE = 'data.js';
const FLAGGED_LOG_FILE = 'flagged_logs.txt'; // You may need to create this or update logger.js to write flagged logs here

function fileExists(file) {
  return fs.existsSync(path.join(__dirname, file));
}

function readFlaggedLogs() {
  if (!fileExists(FLAGGED_LOG_FILE)) {
    console.log('No flagged logs found.');
    return [];
  }
  const logs = fs.readFileSync(path.join(__dirname, FLAGGED_LOG_FILE), 'utf-8').split('\n').filter(Boolean);
  if (logs.length === 0) {
    console.log('No flagged logs to review.');
  }
  return logs;
}

function promptUser(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  console.log('--- Weekly Curation & Iteration ---');
  const logs = readFlaggedLogs();
  if (logs.length === 0) return;

  for (const log of logs) {
    console.log('\nFlagged log:');
    console.log(log);
    const update = await promptUser('Update knowledge base for this? (y/n): ');
    if (update.toLowerCase() === 'y') {
      const file = await promptUser('Which file to update? (knowledge.json/knowledge.txt): ');
      if (KNOWLEDGE_FILES.includes(file)) {
        console.log(`Please update ${file} with the new/clarified fact.`);
      }
    }
    const tweak = await promptUser('Prompt template tweak needed? (y/n): ');
    if (tweak.toLowerCase() === 'y') {
      console.log(`Please review and edit the prompt template in ${PROMPT_TEMPLATE_FILE}.`);
    }
  }
  const collect = await promptUser('Collect Q→A pairs for fine-tuning? (y/n): ');
  if (collect.toLowerCase() === 'y') {
    console.log('Please save your best Q→A pairs for future fine-tuning.');
  }
  console.log('Curation session complete.');
}

main();
