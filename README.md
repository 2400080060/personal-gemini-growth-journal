# Personal Gemini Growth Journal

An AI-powered personal growth journal built using Firebase, Firestore, Gemini, Google Cloud Run, and Google Cloud Secret Manager.

## Project Idea

Personal Gemini Growth Journal transforms everyday reflections into a structured personal growth experience.

The vision is:

User Reflection → Gemini Understanding → Journal History → Pattern Discovery → Personalized Growth Plan

## Technologies Used

- Firebase Authentication – Google Sign-In
- Firebase / Firestore – User data and journal storage
- Gemini API – AI-powered understanding and insights
- Google Cloud Run – Application deployment
- Google Cloud Secret Manager – Secure API key management
- Node.js + Express – Backend
- HTML, CSS, JavaScript – Frontend

## How the Application Works

1. User opens the web application.
2. User signs in securely using Google through Firebase Authentication.
3. The authenticated user's identity is verified by the backend.
4. User-specific information is designed to be stored securely in Firestore.
5. Gemini is used as the AI layer for understanding journal reflections and generating personalized insights.
6. Cloud Run hosts and serves the application.
7. Secret Manager is used to securely manage sensitive Gemini credentials.

## Project Structure

```text
personal-gemini-growth-journal/
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── src/
│   ├── middleware/
│   │   └── auth.js
│   ├── services/
│   ├── routes/
│   ├── firebaseAdmin.js
│   └── server.js
├── package.json
├── .gitignore
└── .gcloudignore
