# BodhaQ Frontend

> AI-powered learning workspace frontend built with React and Vite.

BodhaQ is an AI-powered learning workspace designed to help students learn from their own study materials, assess their understanding, identify weak areas, and practice targeted concepts.

This repository contains the **frontend application** of BodhaQ.

---

## 🚀 Overview

The BodhaQ frontend provides the interactive user interface for the complete learning workflow:

```text
STUDY
  ↓
ASSESS
  ↓
EVALUATE
  ↓
UNDERSTAND
  ↓
IDENTIFY WEAKNESS
  ↓
PRACTICE
  ↓
IMPROVE
```

The frontend communicates with the BodhaQ FastAPI backend through REST APIs.

---

## ✨ Features

### 📚 Study

- Upload and manage learning materials
- Support for:
  - PDF
  - PPTX
  - DOCX
- Study documents through an interactive interface
- Document-based AI doubt solving
- Topic-based learning and explanations

### 🧠 AI Learning

- AI-generated explanations
- Topic-based learning
- Document-aware question answering
- Context-aware doubt solving
- Markdown-based AI responses

### 📝 Quizzes

- AI-generated quizzes
- Multiple difficulty levels
- Quiz timer
- Automatic evaluation
- Quiz result analysis
- Weak-topic identification
- Targeted practice based on performance

### 📊 Learning Analytics

- Track quiz performance
- Identify weak topics
- Review previous assessments
- Monitor learning progress

### 💻 Coding Workspace

BodhaQ includes an interactive coding workspace with:

- AI Learn mode
- IDE mode
- Problem statements
- Input/output formats
- Constraints
- Sample test cases
- Public test cases
- Code execution
- Custom input execution
- Submission evaluation
- AI code analysis
- AI explanations
- AI improvement suggestions
- AI test-case generation
- Saved coding workspaces

Supported coding languages currently include:

- Java
- Python

### 📄 Resume Interview Preparation

- Upload a resume
- Extract resume sections
- Generate interview preparation questions
- Practice questions based on resume content
- Track preparation progress

### 🔐 BYOK API Keys

BodhaQ uses a **Bring Your Own Key (BYOK)** model.

Users provide their own:

- Gemini API key
- Tavily API key

API keys are kept only for the current browser session.

The frontend stores them in:

```text
sessionStorage
```

They are not intentionally stored in:

- `localStorage`
- application databases
- source code
- backend configuration files
- Git repositories

The frontend sends the required key to the backend on the relevant request.

> **Security note:** Browser-based BYOK means the key is available to the browser session. Users should only enter API keys they are comfortable using in this environment.

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- React Router

### API Communication

- Fetch API
- REST APIs
- Request-scoped authentication/session headers

### Browser Storage

- `sessionStorage`
  - Gemini API key
  - Tavily API key
  - anonymous session token
- `localStorage`
  - appropriate client-side application state
  - coding workspace persistence
  - saved coding solutions
  - learning-related frontend state

---

## 📁 Project Structure

```text
frontend/
├── public/
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── api/
│   │   ├── client.js
│   │   ├── codingApi.js
│   │   ├── documentApi.js
│   │   ├── doubtApi.js
│   │   ├── learningApi.js
│   │   ├── quizApi.js
│   │   ├── resumeApi.js
│   │   └── settingsApi.js
│   │
│   ├── assets/
│   │
│   ├── components/
│   │   ├── coding/
│   │   ├── common/
│   │   └── layout/
│   │
│   ├── pages/
│   │   ├── CodingPage.jsx
│   │   ├── CodingWorkspacePage.jsx
│   │   ├── DocumentStudyPage.jsx
│   │   ├── DoubtsPage.jsx
│   │   ├── HomePage.jsx
│   │   ├── MaterialsPage.jsx
│   │   ├── PracticePage.jsx
│   │   ├── QuizResultsPage.jsx
│   │   ├── QuizzesPage.jsx
│   │   ├── ResumePrepPage.jsx
│   │   ├── SettingsPage.jsx
│   │   ├── StudyPage.jsx
│   │   └── WeakTopicsPage.jsx
│   │
│   ├── utils/
│   │   ├── codingStorage.js
│   │   ├── gaps.js
│   │   └── storage.js
│   │
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── eslint.config.js
```

---

## ⚙️ Requirements

Before running the frontend, install:

- Node.js
- npm

Verify the installation:

```bash
node --version
npm --version
```

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/KOLLIJAYANTHESWAR/BodhaQ_Frontend.git
```

Enter the project:

```bash
cd BodhaQ_Frontend
```

Install dependencies:

```bash
npm install
```

---

## ▶️ Development

Start the Vite development server:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

The backend should also be running for API-dependent features.

---

## 🏗️ Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## 🔗 Backend

The frontend communicates with the BodhaQ FastAPI backend.

### BodhaQ Backend

```text
https://github.com/KOLLIJAYANTHESWAR/BodhaQ_Backend
```

### Complete BodhaQ Project

```text
https://github.com/KOLLIJAYANTHESWAR/BodhaQ
```

---

## 🔑 API Key Configuration

BodhaQ does not require users to place Gemini or Tavily API keys inside the frontend source code.

Instead, users configure their keys through the application's **Settings** page.

### Gemini

The Gemini API key is used for AI-powered functionality such as:

- Learning
- Quiz generation
- Doubt solving
- Resume analysis
- Coding assistance
- Document processing

### Tavily

The Tavily API key is used for online study-resource search.

---

## 🔒 Security Model

BodhaQ uses anonymous browser sessions instead of requiring user registration for the current application architecture.

The frontend receives an anonymous session token from the backend and sends it with authenticated application requests.

API keys are request-scoped.

```text
Browser
│
├── Gemini API Key
├── Tavily API Key
└── Anonymous Session Token
│
▼
BodhaQ Frontend
│
▼
FastAPI Backend
│
├── Gemini
├── Tavily
├── RAG
├── Document Processing
└── Code Execution
```

The frontend does not intentionally persist provider API keys in the application database.

---

## 🧩 Application Modes

### AI Learn Mode

AI Learn mode provides problem context and learning assistance, including:

- Problem statement
- Input format
- Output format
- Constraints
- Examples
- Sample tests
- Public tests
- AI assistance

### IDE Mode

IDE mode provides an independent coding environment without requiring a problem context.

Users can:

- Write code
- Run code
- Provide custom input
- Analyze code with AI
- Save their workspace

---

## 🧪 Testing

Before submitting changes, verify:

```bash
npm run build
```

The production build should complete successfully.

For API-dependent functionality, ensure the BodhaQ backend is running and the required API keys are configured through the application.

---

## 📌 Current Architecture

```text
┌──────────────────────────┐
│       BodhaQ Frontend    │
│                          │
│ React + Vite + JavaScript│
└────────────┬─────────────┘
             │
             │ REST API
             ▼
┌──────────────────────────┐
│      BodhaQ Backend      │
│                          │
│ FastAPI + Python         │
└────────────┬─────────────┘
             │
        ┌────┴─────┐
        ▼          ▼
     Gemini      Tavily
```

---

## 🗺️ Development Roadmap

Planned improvements may include:

- Further frontend performance optimization
- Improved learning analytics
- Expanded coding practice functionality
- Additional interview preparation workflows
- More advanced learning personalization
- Additional accessibility improvements
- Production deployment optimization

---

## 🤝 Related Repositories

### Full BodhaQ Project

```text
https://github.com/KOLLIJAYANTHESWAR/BodhaQ
```

### BodhaQ Backend

```text
https://github.com/KOLLIJAYANTHESWAR/BodhaQ_Backend
```

### BodhaQ Frontend

```text
https://github.com/KOLLIJAYANTHESWAR/BodhaQ_Frontend
```

---

## 👨‍💻 Author

**Kolli Jayanth Eswar**

GitHub:

```text
https://github.com/KOLLIJAYANTHESWAR
```

Portfolio:

```text
https://www.kollijayantheswar.in/
```

---

## 📄 License

See the repository for the current licensing information.