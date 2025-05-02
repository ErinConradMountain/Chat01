# Note

For comprehensive and up-to-date documentation, please refer to DOCUMENTATION.md. All important information about the project, its features, and usage is maintained there.

# Bryneven Primary School Helper Chatbot

A friendly chatbot assistant for Bryneven Primary School students, built using HTML, CSS, JavaScript, and the Gemini 1.5 Pro API.

## Features

- Intuitive chat interface with typing indicators
- Quick suggestion buttons for common questions
- School information and FAQ responses
- Homework help and tutoring assistance
- Information about coding and robotics programs
- Responsive design that works on all devices

## Setup Instructions

1. Clone this repository:
```bash
git clone [your-repository-url]
```

2. Get a Gemini API key:
   - Visit the Google AI Studio (https://makersuite.google.com/)
   - Create or select a project
   - Generate an API key
   - Copy your API key

3. Update the API key:
   - Open `chat.js`
   - Replace `YOUR_GEMINI_API_KEY` with your actual API key

4. Deploy:
   - Host the files on a web server
   - Or use a local development server:
     ```bash
     python -m http.server 8000
     # or
     npx serve
     ```

## Project Structure

- `index.html` - Main HTML structure and UI components
- `styles.css` - CSS styles and animations
- `data.js` - School knowledge base and robotics information
- `chat.js` - Chat functionality and API integration

## Weekly Curation & Iteration

To keep the chatbot's knowledge base fresh and accurate, perform a weekly review of flagged logs and update as needed.

### How to Run Curation

1. Ensure flagged logs are saved in `flagged_logs.txt` (update `logger.js` if needed).
2. Run the curation script:
   ```bash
   node curate.js
   ```
   - The script will guide you through reviewing flagged logs, updating knowledge files, and suggesting prompt tweaks.
   - Optionally, collect your best Q→A pairs for future fine-tuning.

### Reminder
- Set a recurring calendar reminder (e.g., every Monday) for a curation session.
- At least one team member should be available for this review each week.

---

## Security Notes

- Never commit your API key to version control
- Consider using environment variables for the API key in production
- Implement rate limiting and other security measures for production use

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

[Your chosen license]
# Chat002
My chatbot
 3bd1845c82238564385b61b83cfe2e4e0b6c4610
