# Note

For comprehensive and up-to-date documentation, please refer to DOCUMENTATION.md. All important information about the project, its features, and usage is maintained there.

# Bryneven Primary School Helper ChatBot

A responsive, educational chatbot designed to assist students, parents, and staff at Bryneven Primary School.

## Features

- Responsive design that works across all devices and zoom levels
- Knowledge-based learning system
- Homework assistance
- Educational investigations
- Art exploration

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Open in your browser at `http://localhost:3000`


### Streaming vs. Non-Streaming (quick toggle)

- The UI streams responses via Server‑Sent Events (SSE) for faster feedback.
- If your browser/network blocks SSE or you see blank/placeholder replies, disable streaming temporarily by adding a URL flag:
	- `http://localhost:3000/?nostream=1`
- With `nostream=1`, the UI uses a single JSON response (no streaming) which is the most compatible path and matches backend tests.

PowerShell chat smoke test (non‑streaming backend call):
```powershell
$body = @{ 
	contents = @(@{ role = "user"; parts = @(@{ text = "Explain fractions simply." }) })
	generationConfig = @{ maxOutputTokens = 280; temperature = 0.7 }
} | ConvertTo-Json -Depth 6
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/chat -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 8
```
## Documentation

For detailed information about the project, please refer to:

- `STYLE_DIRECTIVE.md` - Complete styling guide including responsive design implementation
- `DOCUMENTATION.md` - Technical documentation and implementation details
- `ARCHITECTURE_IMPROVEMENTS.md` - Architecture and improvement notes
- `PROMPT_INSTRUCTIONS.md` - AI prompt engineering guidelines

## Responsive Design

The application now implements a fully responsive design system that:
- Scales appropriately across all device sizes
- Maintains readability at different zoom levels
- Ensures consistent spacing and layout
- Provides optimal touch targets on mobile devices

See `STYLE_DIRECTIVE.md` for detailed styling information and `DOCUMENTATION.md` for implementation details.

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome for Android)

Minimum supported screen width: 320px
Maximum recommended zoom level: 150%

## Contributing

Please read `DOCUMENTATION.md` for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Bryneven Primary School staff and students
- All contributors to this project
- Open source community
