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