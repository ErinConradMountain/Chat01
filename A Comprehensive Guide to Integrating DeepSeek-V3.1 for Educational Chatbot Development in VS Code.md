# A Comprehensive Guide to Integrating DeepSeek-V3.1 for Educational Chatbot Development in VS Code

This report provides a comprehensive, step-by-step guide for a beginner developer on how to create an AI-powered educational chatbot using the DeepSeek-V3.1 model. The chatbot will be developed on a Windows 10 machine using Visual Studio Code and Python, with the final application hosted on GitHub. The guide covers setting up the development environment, connecting to the DeepSeek API via OpenRouter, implementing core features like file I/O, structuring the project with the emerging `AGENTS.md` standard, selecting an appropriate agent framework, and building a functional chatbot that can read from and write to its repository. Each section is designed to build upon the last, providing actionable insights and best practices to ensure a successful and scalable implementation.

## Establishing Your Development Environment: VS Code, Python, and Dependencies

The foundation of any robust software project is a well-configured development environment. For this task, your primary tools will be Visual Studio Code (VS Code) on a Windows 10 operating system, complemented by Python as the programming language and a suite of essential libraries. This initial setup phase is critical for ensuring a smooth workflow, managing project dependencies effectively, and avoiding common pitfalls related to file paths and package installations. The following steps will walk you through creating a secure, isolated, and efficient environment tailored for developing an AI agent.

First, you must ensure Python is correctly installed on your Windows 10 machine. While Python can be downloaded directly from python.org or obtained from the Microsoft Store, it is highly recommended to use the official installer to gain access to the full set of tools [[22]]. During installation, make sure to check the box that says "Add Python to PATH" to avoid path-related issues later. After installation, open a new Command Prompt or PowerShell window and verify the installation by running `python --version`. This should return a version number indicating Python 3.10 or higher is installed, which is a requirement for many modern libraries [[34]]. Once Python is confirmed, launch VS Code. To enhance your Python development experience, install the official Python extension from the VS Code Marketplace. This extension provides intelligent features like code completion, linting, debugging, and interactive environments, making it indispensable for this project [[21]].

With Python installed, the next crucial step is to establish a virtual environment for your project. A virtual environment is an isolated directory that contains a specific Python installation and a separate space for third-party packages. This practice is vital because it prevents conflicts between project dependencies and keeps your global Python installation clean. To create a virtual environment, navigate to your project's root folder in a terminal within VS Code and run the command `python -m venv .venv`. This creates a new folder named `.venv` in your project directory, which contains the isolated Python environment [[22]]. To activate this environment on Windows, you must run the command `.venv\Scripts\activate` in the same terminal [[34]]. Once activated, your terminal prompt will show the environment name `( .venv )`, indicating that any subsequent Python or pip commands will operate within this isolated context [[35]].

Now that your environment is active, you can begin installing the necessary Python packages. The most important library for this project is the OpenAI client, which allows your Python script to communicate with the DeepSeek API. Install it by running `pip install openai`. This library abstracts away the complexities of making HTTP requests and handling JSON responses, providing a simple Pythonic interface to call the API [[6,8]]. Other potential dependencies will be introduced as needed throughout the project, such as `chainlit` for creating a web UI or `pandas` for data analysis. It is a best practice to manage all your project dependencies in a `requirements.txt` file. After installing a package, you can generate or update this file by running `pip freeze > requirements.txt`. This file serves as a manifest of your project's dependencies, allowing anyone else (or your future self) to recreate the exact environment by simply running `pip install -r requirements.txt` [[22]]. For security, never commit your API keys to this file; they should always be stored in a separate, ignored file like `.env` [[16,24]].

Finally, understanding file paths in VS Code is essential for any application that needs to read from or write to files, including reading configuration from a GitHub repository. By default, VS Code may not execute your Python scripts from the directory where the script is located. Instead, it might use the workspace root or another parent directory as the current working directory (cwd) [[40]]. If your script attempts to open a file using a relative path (e.g., `'data/input.txt'`), it will fail if the cwd is not what you expect. You can verify the cwd at runtime by importing the `os` module and printing `os.getcwd()`. To resolve this, you have several options. You can use absolute or more robust relative paths, change the cwd programmatically at the start of your script with `os.chdir(os.path.dirname(os.path.abspath(__file__)))`, or configure VS Code to always run the terminal in the file's directory. To do this, search for `python.terminal.executeInFileDir` in your VS Code settings and set it to `true`. This ensures that `.` in file paths refers to the script's location, simplifying file management and preventing frustrating `FileNotFoundError` exceptions [[38,40]].

| Step | Command / Action | Purpose | Relevant Sources |
| :--- | :--- | :--- | :--- |
| **1. Install Python** | Download from python.org or MS Store, add to PATH. | Provides the programming language interpreter. | `[[22]]` |
| **2. Install VS Code** | Download and install from https://code.visualstudio.com/. | Provides the Integrated Development Environment (IDE). | Information inferred from user query. |
| **3. Install Python Extension** | Search for "Python" in VS Code Marketplace and install. | Adds essential features for Python development. | `[[21]]` |
| **4. Create Virtual Env** | `python -m venv .venv` | Creates an isolated environment for project dependencies. | `[[22]]` |
| **5. Activate Virtual Env** | `.venv\Scripts\activate` (Windows) | Prepares the shell to use the isolated environment. | `[[34]]` |
| **6. Install OpenAI SDK** | `pip install openai` | Enables communication with OpenAI-compatible APIs. | `[[6]]` |
| **7. Generate Requirements File** | `pip freeze > requirements.txt` | Documents all project dependencies for reproducibility. | `[[22]]` |
| **8. Configure File Paths** | Set `python.terminal.executeInFileDir` to `true` in settings. | Ensures scripts run from their own directory, simplifying file I/O. | `[[40]]` |

By meticulously following these setup instructions, you create a stable and professional-grade environment that mitigates common beginner errors and prepares you for the more complex tasks of API integration and agent development.

## Connecting to DeepSeek-V3.1 via OpenRouter for Non-Thinking Mode Operations

Once your development environment is ready, the next critical step is establishing a secure connection to the DeepSeek-V3.1 model through an API provider. Given your preference for free access, OpenRouter emerges as the most practical choice, offering seamless integration with DeepSeek models without requiring you to manage a local server [[8,23]]. However, navigating the specifics of authentication and reasoning mode control requires careful attention to detail. This section will guide you through obtaining the necessary credentials, configuring your application to use them, and making your first API call to interact with DeepSeek-V3.1 in its non-thinking mode.

Accessing DeepSeek-V3.1 through OpenRouter is straightforward but involves a few key considerations. First, you need to obtain an API key from OpenRouter. This process requires creating an account on their website using Google or email authentication [[12]]. Upon registration, you can find your unique API key in your account's dashboard under the "API Keys" section [[12]]. This key is sensitive information and must be treated with the utmost security. Storing it directly in your source code is a severe security risk. The industry-standard best practice is to store API keys in a `.env` file at the root of your project. This file should be added to your `.gitignore` file to ensure it is never committed to your public GitHub repository [[16,24]]. In your Python code, you will load these variables using a library like `python-dotenv`.

The second major consideration is the availability of the DeepSeek provider on OpenRouter. As of September 22, 2025, the DeepSeek provider was reportedly unavailable on the platform, meaning users could not access the model through the standard OpenRouter interface [[11]]. In such cases, a viable workaround is to use the OpenAI-compatible endpoint directly, specifying the model identifier in the request [[12]]. The model name for the non-thinking mode of DeepSeek-V3.1 is `deepseek/deepseek-chat-v3.1` [[19,23]]. Using OpenRouter as a proxy still offers advantages, such as simplified billing and usage analytics [[8]].

To make a basic API call to DeepSeek-V3.1, you will use the OpenAI Python SDK. The core function for sending a message to the model is `client.chat.completions.create()`. This function requires several parameters. The `model` parameter must be set to `'deepseek/deepseek-chat-v3.1'` to target the correct non-thinking model [[9,19]]. The `messages` parameter is a list of dictionaries, where each dictionary represents a message in the conversation history (e.g., `{"role": "system", "content": "You are a helpful tutor."}`, `{"role": "user", "content": "Explain quantum physics."}`) [[10,24]]. Finally, you must specify the `max_tokens` to control the length of the response. For your educational chatbot, a value between 150 and 300 is a reasonable starting point.

Controlling the reasoning mode is where things get nuanced. The DeepSeek-V3.1 API provides two distinct endpoints (`deepseek-chat` for non-thinking and `deepseek-reasoner` for thinking) [[6,7]]. When using OpenRouter as an intermediary, the method to switch modes changes slightly. The documentation indicates that for clients using the OpenAI SDK, the reasoning mode can be toggled by passing a dictionary within the `extra_body` parameter [[19,23]]. To explicitly enable non-thinking mode, you would include `extra_body={"thinking": False}` in your `chat.completions.create()` call [[33,35]]. Conversely, to enable thinking mode, you would use `extra_body={"thinking": True}` [[35]]. This `extra_body` mechanism allows you to pass additional parameters directly to the underlying provider (DeepSeek) without needing to modify the core OpenAI SDK structure. Some community discussions also mention using `chat_template_kwargs` with `thinking=False` as an alternative, though `extra_body` appears to be the more documented approach for controlling this feature [[35]].

It is also important to note the potential for API downtime. The provided sources mention that DeepSeek's direct API has experienced significant outages in the past, causing disruptions for users even on paid plans [[32]]. While OpenRouter acts as a buffer, it is still subject to its own reliability. Before deploying your chatbot, it is wise to test the connection and handle potential failures gracefully in your code, perhaps by implementing exponential backoff with jitter for retries [[34]]. The cost of using the model varies depending on the provider chosen through OpenRouter, with pricing generally around $0.20-$0.45 per million input tokens and $0.80-$1.50 per million output tokens [[9,19]]. Free tiers often come with rate limits, so plan your application's usage accordingly. By combining the convenience of OpenRouter with the power of the DeepSeek-V3.1 non-thinking model, you lay the groundwork for a responsive and capable educational assistant.

| Parameter | Value/Example | Description | Relevant Sources |
| :--- | :--- | :--- | :--- |
| **Provider Base URL** | `https://openrouter.ai/api/v1` | The endpoint for the OpenRouter API. | `[[12,23]]` |
| **Model Name** | `'deepseek/deepseek-chat-v3.1'` | Specifies the non-thinking DeepSeek-V3.1 model. | `[[9,19,23]]` |
| **Authentication** | Bearer Token from `.env` (`OPENROUTER_API_KEY`) | Securely passed in the `Authorization` header. | `[[24,27]]` |
| **Reasoning Control** | `extra_body={"thinking": false}` | Toggles non-thinking mode for the API call. | `[[19,23,33]]` |
| **Required Library** | `pip install openai` | The official OpenAI Python SDK for making requests. | `[[6]]` |
| **Potential Issue** | Provider unavailability, API downtime | The DeepSeek provider was reported down on OpenRouter as of Sep 22, 2025. | `[[11,32]]` |

## Implementing Core Functionality: Structured File I/O for Knowledge Retrieval and Generation

A cornerstone of your educational chatbot's functionality will be its ability to read from and write to files within its repository. This capability transforms the bot from a simple conversational agent into a structured knowledge base, allowing it to retrieve specific information on demand and generate new content, such as summaries or study guides. Mastering Python's file handling mechanisms is therefore fundamental to building this functionality. This section will cover the essential file operations—reading, writing, and appending—and provide best practices for error handling and file management within the context of a VS Code project on Windows 10.

Python's built-in `open()` function is the primary tool for file manipulation. It takes two main arguments: the name of the file and the mode in which to open it. The most common modes are `'r'` for reading (the default), `'w'` for writing (which overwrites the file if it exists or creates a new one), and `'a'` for appending (which adds content to the end of the file without erasing its existing contents) [[37,38]]. For your chatbot, you will likely use `'r'` to read instructional materials or questions from a text file, and either `'w'` to overwrite a generated file or `'a'` to append new notes or answers to an existing log or summary file. For example, to read a file named `knowledge_base.txt`, you would use `file = open('knowledge_base.txt', 'r')`.

While the `open()` and `close()` pair works, the recommended best practice in Python is to use the `with` statement. This construct automatically handles closing the file once the block of code inside it is executed, even if an error occurs. This ensures that system resources are properly released and prevents file corruption or leaks [[38]]. Here’s a simple example of reading all lines from a file:

```python
## Example of reading from a file using the 'with' statement
try:
    with open('knowledge_base.txt', 'r') as file:
        content = file.readlines()
    print(content)
except FileNotFoundError:
    print("The specified file was not found. Please check the file path.")
```
This pattern is robust and should be used for all file-reading operations in your project. The `try...except` block is equally important, as it gracefully handles the `FileNotFoundError` exception that will be raised if the specified file does not exist in the expected location. This can happen easily due to incorrect file paths, a common issue for beginners, especially when the working directory is not what they expect [[40]].

For writing and appending, the logic is similar. To write new content, you would open the file in `'w'` mode and use the `write()` or `writelines()` method. To append, you would use `'a'` mode. Here’s an example of writing a string to a file:

```python
## Example of writing to a file
text_to_write = "This is a new piece of information for the student.\n"
try:
    with open('study_guide.txt', 'a') as file:  # Use 'w' to overwrite, 'a' to append
        file.write(text_to_write)
    print("Information successfully written to file.")
except IOError:
    print("An error occurred while writing to the file.")
```

Beyond basic read/write operations, your chatbot may need to perform more advanced file management tasks, such as copying or deleting files. The `shutil` module provides high-level file operations that are perfect for this. For instance, you could use `shutil.copy2('source.txt', 'destination.txt')` to create a backup of a file before modifying it, or `os.remove('temp_file.txt')` to delete a temporary file after its use [[38]]. These functions are invaluable for maintaining a clean and organized state within your application.

When integrating these file operations into your chatbot, consider the flow of interaction. A typical scenario could be: the user asks the bot a question about a topic. The bot reads relevant sections from a Markdown file in the `knowledge_base/` directory. It processes the information, formulates an answer, and then writes the new answer to a `qa_log.txt` file for future reference or appends a summary of the session to a `study_notes.md` file. By systematically using Python's file I/O capabilities within a robust error-handling framework, you give your chatbot the persistent memory it needs to function as a truly useful educational companion.

## Architecting Your Project with AGENTS.md for AI-Centric Automation

As your educational chatbot evolves from a simple script into a more complex agentic system, a clear and standardized way to define its responsibilities and procedures becomes paramount. This is where the emerging `AGENTS.md` specification comes into play. Inspired by the limitations of traditional README files, which are optimized for human readability, `AGENTS.md` is a machine-readable Markdown file designed to provide explicit, unambiguous instructions to AI agents [[1,3]]. Adopting this standard at the beginning of your project will dramatically improve the quality and consistency of your AI's behavior, reduce the need for constant re-direction, and streamline automation workflows, especially those hosted on platforms like GitHub.

`AGENTS.md` is an open standard co-launched by major tech companies like Google, OpenAI, and Sourcegraph to unify how AI assistants understand and interact with software projects [[2]]. Instead of scattering rules across fragmented files like `.cursor/rules` or `.github/copilot-instructions.md`, `AGENTS.md` consolidates them into a single, predictable file in the root of your repository [[2,3]]. This centralization makes it easier for both humans and AI to discover and adhere to project conventions. The adoption of this standard signifies a shift towards treating AI as a first-class citizen in the development lifecycle, enabling more sophisticated and reliable automated systems [[3]].

A well-structured `AGENTS.md` file typically includes several key sections. The `Project Overview` provides a high-level description of the bot's purpose. The `Commands` section is crucial for your application, detailing specific instructions for the AI. For example, you could define commands like "Read the lesson on [topic] from the `lessons/` directory," "Summarize the key points from `notes/session_01.md`," or "Generate a quiz based on `topics/algebra.md`." These commands act as a contract between you and the AI, telling it exactly what actions are permitted and how to perform them [[5]]. Another important section is `Safety and permissions`, where you can clearly delineate allowed actions (e.g., reading files, running tests) from those that require special approval or are forbidden (e.g., deleting files, pushing to the main branch) [[5]].

The `Do` and `Don't` lists are particularly powerful for enforcing coding and stylistic standards. For a Python-based chatbot, you could specify rules like `Do use f-strings for string formatting.` or `Don't use `print()` for logging; instead, use the `logging` library.` [[5]]. This ensures that any code generated by an AI agent adheres to best practices. Similarly, you can include a `Code style guidelines` section and a `Commit guidelines` section to enforce consistent commit messages, which is invaluable for maintaining a clean Git history [[5]]. The `Test first mode` concept encourages the AI to write tests before implementing new functionality, promoting a test-driven development (TDD) approach [[5]].

For a beginner developer, the immediate benefit of `AGENTS.md` is clarity. It forces you to think through the bot's workflow and document it explicitly. This upfront effort saves immense amounts of time and frustration later on. For example, rather than having the AI repeatedly ask for clarification on file paths or naming conventions, you provide that information once in the `Project structure` section, referencing concrete file paths like `lessons/intro_python.md` or `data/raw_questions.csv` [[5]]. This reduces redundant discovery and improves the fidelity of the AI's output. Multiple tools, including Cursor, Zed, Phoenix, and Aider, already support `AGENTS.md`, and others can be configured to read it by pointing to it from other rule files [[3,5]]. By creating and maintaining an `AGENTS.md` file, you are not just documenting your project; you are architecting it to be more understandable and controllable by the very AI that will be working within it.

| Section | Purpose | Example Content | Relevant Sources |
| :--- | :--- | :--- | :--- |
| **Project Overview** | Describes the purpose and scope of the AI agent. | "This agent is a study assistant for introductory computer science courses. It can answer questions, summarize lessons, and help generate practice problems." | `[[2,3]]` |
| **Commands** | Defines specific, executable instructions for the AI. | `summarize_lesson(topic: str)` - Reads the lesson file for `topic` and generates a concise summary. `generate_quiz(source: str)` - Creates a quiz based on the content of the specified file. | `[[5]]` |
| **Do & Don't Lists** | Enforces coding standards and best practices. | `Do` use `f"string {variable}"` for string interpolation. `Don't` hardcode API keys; use environment variables. | `[[5]]` |
| **Safety and Permissions** | Specifies actions the agent is authorized to perform. | `Allowed Actions` - Read and list files in `lessons/` and `data/`. `Actions Requiring Approval` - Install new Python packages, delete any files. | `[[5]]` |
| **Project Structure** | Outlines the file and directory layout. | `Lessons` are stored in `lessons/`. Quiz data is in `data/quizzes/`. All generated content goes to `outputs/`. | `[[5]]` |
| **PR Checklist** | Defines criteria for pull requests created by the agent. | Title format: `[Bot] <Description>`. All commits must have green tests. Diff size should be small and focused. | `[[5]]` |

## Selecting and Configuring an Agent Framework: CrewAI and LangGraph for Multi-Agent Orchestration

Choosing the right agent framework is a pivotal decision that will shape the architecture, complexity, and capabilities of your educational chatbot. While you could build a simple linear dialogue system from scratch, leveraging an established framework will save significant development time and provide access to proven patterns for orchestrating complex, multi-step tasks. For a project aiming to perform research, derive information, and potentially involve multiple specialized roles, frameworks like CrewAI and LangGraph are excellent candidates. This section compares these frameworks and provides guidance on how to integrate them with your DeepSeek-V3.1 backend.

CrewAI is a Python library specifically designed for building multi-agent systems where different agents collaborate to achieve a common goal [[14,15]]. Its primary strength lies in role-based collaboration. You can define distinct agents, such as a `Researcher`, a `Writer`, and a `Reviewer`, each with a specific `role`, `goal`, and `backstory` [[15]]. The framework then manages the flow of information between them, allowing them to work together like a team. This paradigm is exceptionally well-suited for your use case. For instance, you could design a workflow where the user asks a broad question. The `Researcher` agent would then use its tools to search the `knowledge_base/` directory and external resources (if desired) to gather relevant information. It would pass its findings to the `Writer` agent, who would then craft a coherent and educational response. The `Reviewer` could then polish the final text before it is presented to the user. CrewAI is compatible with OpenRouter and LiteLLM, allowing you to seamlessly plug in the `deepseek/deepseek-chat-v3.1` model for each agent's reasoning process [[28,30]].

LangGraph, part of the broader LangChain ecosystem, offers a different but equally powerful paradigm: graph-based workflows [[14]]. Instead of predefined roles, you define a series of nodes (functions or agents) and edges (the flow of execution between them). This creates a directed acyclic graph (DAG) that can represent complex, non-linear processes. LangGraph excels at modeling intricate, multi-step tasks where the execution path may depend on previous outcomes. For example, you could create a graph node for "Query Knowledge Base," a node for "Generate Answer Draft," and a conditional edge that leads to a "Request User Clarification" node if the initial answer is too vague, or to a "Finalize and Deliver" node if it is satisfactory. This flexibility makes LangGraph ideal for stateful conversations and tasks that require iteration and branching logic [[14]]. Since it supports custom LLM calls, it can also be configured to use the OpenRouter endpoint with DeepSeek-V3.1.

Other frameworks like AutoGen, LlamaIndex, and Strands Agents also offer compelling features [[14,15]]. AutoGen, developed by Microsoft, focuses on asynchronous, event-driven conversations between multiple agents, which could be interesting for more dynamic interactions [[15]]. LlamaIndex is specialized for retrieval-augmented generation (RAG) and has strong connectors for various data sources, which could be useful if your knowledge base grows large and complex [[15]]. Strands Agents is notable for its model-agnostic design and strong observability features, supporting multi-model routing via LiteLLM [[14]]. However, for a beginner starting with a relatively straightforward educational chatbot, CrewAI's intuitive role-based model is likely the most accessible entry point.

Regardless of the framework you choose, the integration with OpenRouter and DeepSeek-V3.1 will follow a similar pattern. The key is to configure the framework to use an OpenAI-compatible client that targets OpenRouter's API. This involves setting environment variables correctly. For CrewAI with LiteLLM, the essential variables are `OPENROUTER_API_KEY`, `OPENAI_API_BASE="https://openrouter.ai/api/v1"`, and `OPENAI_MODEL_NAME="openrouter/deepseek/deepseek-chat-v3.1"` [[28,30,36]]. Crucially, you must use `OPENROUTER_API_KEY` for authentication, not `OPENAI_API_KEY`, as the latter will result in an authentication error [[28]]. Within the agent creation code, you can then pass the `extra_body={"thinking": False}` argument to ensure the non-thinking mode is used for each API call [[33]]. By selecting a framework that aligns with your envisioned complexity and setting it up correctly with your chosen API, you can build a sophisticated and capable agentic system.

| Framework | Primary Paradigm | Strengths for This Project | Integration Notes | Relevant Sources |
| :--- | :--- | :--- | :--- | :--- |
| **CrewAI** | Role-Based Collaboration | Excellent for defining clear, specialized agents (e.g., Researcher, Writer) that work together. Intuitive for beginners. | Use `Agent` class with `llm` config. Set `OPENAI_MODEL_NAME` to OpenRouter DeepSeek model. | `[[14,15,30]]` |
| **LangGraph** | Graph-Based Workflows | Ideal for complex, non-linear processes and stateful conversations with conditional logic and iteration. | Define nodes and edges. Can be configured with OpenAI client pointing to OpenRouter. | `[[14]]` |
| **AutoGen** | Conversation-Driven Systems | Good for systems involving multiple agents in an asynchronous, event-driven dialogue. | Uses `AssistantAgent` and `UserProxyAgent`. Can be configured for code execution. | `[[14,15]]` |
| **LlamaIndex** | RAG + Data Indexing | Strongest for applications centered on querying and retrieving information from documents and data stores. | Not the best fit for general-purpose agentic workflows but can be a component. | `[[15]]` |
| **Strands Agents** | Model-Agnostic with Observability | Highly flexible and supports multi-model routing via LiteLLM. Strong observability features. | Explicitly supports OpenRouter via LiteLLM. | `[[14]]` |

## Building Your Educational Chatbot: From Concept to Deployment on GitHub

With your development environment configured, your API connection secured, your file I/O skills mastered, and your project architecture planned with `AGENTS.md` and an agent framework selected, you are now ready to bring your educational chatbot to life. This final section synthesizes all the preceding knowledge into a cohesive blueprint for building, testing, and deploying your application. The process involves designing the core conversational loop, implementing the logic to leverage your file system and the DeepSeek API, and packaging everything for deployment on GitHub.

The core of your chatbot will reside in a main Python script, for example `main.py`. The first step in this script should be to securely load your environment variables using a library like `python-dotenv`. This will fetch your `OPENROUTER_API_KEY` from the `.env` file, ensuring it remains hidden from public view [[16]]. Following this, you should initialize the OpenAI client with the base URL set to OpenRouter's endpoint (`https://openrouter.ai/api/v1`) [[19]]. At this point, you have all the prerequisites to connect to the DeepSeek-V3.1 model.

Next, you will implement the main conversational loop. This is typically an infinite `while True:` loop that continuously prompts the user for input. Based on the user's command (which you can parse from their input), the program will execute different blocks of logic. This is where your `AGENTS.md` file becomes a practical tool. For example, if a user types `!read_lesson intro_oop`, your script should recognize the command, extract the argument (`intro_oop`), construct the appropriate file path (`lessons/intro_oop.md`), and then call a dedicated function to handle the file reading and subsequent processing.

Let's break down the implementation of a few key functionalities:
1.  **Reading Knowledge:** Create a function, say `retrieve_info(topic)`, that constructs the file path, opens and reads the content of the corresponding Markdown file from your `knowledge_base/` directory using the `with open()` pattern [[38]]. It should then format this content into a system message for the DeepSeek API.
2.  **Generating Responses:** Create a function, `ask_model(system_content, user_question)`. This function will instantiate the OpenAI client, call `client.chat.completions.create()`, and pass the `system_content` (the retrieved lesson) and the `user_question`. It should also include `model="openrouter/deepseek/deepseek-chat-v3.1"` and `extra_body={"thinking": False}` to ensure the non-thinking mode is used [[19,33]].
3.  **Writing to Files:** Create a function, `save_output(filename, content)`, that uses the `with open(..., 'w')` pattern to write the generated content to a specified file in your designated output directory [[37]]. This could be used to save summaries, generated quizzes, or logs of interactions.

Here is a conceptual outline of the main script's logic:

```python
## Conceptual main.py logic
import os
from dotenv import load_dotenv
from openai import OpenAI

## --- Setup ---
load_dotenv()  # Load API key from .env
client = OpenAI(base_url="https://openrouter.ai/api/v1",
                api_key=os.getenv("OPENROUTER_API_KEY"))

## --- Functions ---
def retrieve_info(topic):
    try:
        with open(f"knowledge_base/{topic}.md", 'r') as file:
            return file.read()
    except FileNotFoundError:
        return f"Lesson on '{topic}' not found."

def ask_model(system_content, user_question):
    response = client.chat.completions.create(
        model="openrouter/deepseek/deepseek-chat-v3.1",
        extra_body={"thinking": False},
        messages=[
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_question}
        ],
        max_tokens=250
    )
    return response.choices[0].message.content

## --- Main Loop ---
print("🎓 Welcome to your Educational Assistant! Type 'exit' to quit.")
while True:
    user_input = input("\n💬 You: ")
    if user_input.lower() == 'exit':
        break
    
    # Simple command parsing (can be enhanced with regex or an argument parser)
    if user_input.startswith("!read_"):
        topic = user_input.split(" ", 1)[1]
        lesson = retrieve_info(topic)
        bot_response = ask_model(lesson, "Summarize this lesson for a beginner.")
        print(f"\n🤖 Assistant: {bot_response}")
        # Optionally, save the summary: save_output(f"summaries/{topic}_summary.md", bot_response)
    
    else:
        print(" unrecognized command. Try '!read_introduction'.")
```

Once your chatbot is fully developed and rigorously tested locally, the final step is to host it on GitHub. The project itself—the Python scripts, `AGENTS.md`, and `requirements.txt`—should be committed to a new repository. This makes the entire codebase, including its instructions for AI agents, transparent and accessible. Depending on your ambition, you could explore hosting the chatbot as a web application. Tools like `Chainlit` can wrap your Python script in a simple web UI, which can then be deployed on platforms like Vercel or Netlify by linking it to your GitHub repo [[13,36]]. For a more integrated experience, you could even develop it as a VS Code extension, giving it deep access to the editor's environment [[24]]. Regardless of the final deployment method, having a well-documented and structured project on GitHub is the ultimate goal, transforming your idea into a reusable and shareable tool for education.