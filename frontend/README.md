# AI-Powered Healthcare Assistant

This project is a fullstack AI-powered healthcare assistant that predicts possible diseases based on user symptoms. It features a Python FastAPI backend and a React frontend.

## Project Structure

- `backend/` — FastAPI backend (disease prediction, symptom extraction, feedback)
- `frontend/` — React frontend (user interface, multi-language support)

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js (v18+ recommended) & npm

### Backend Setup
1. Navigate to the backend folder:
   ```sh
   cd backend
   ```
2. (Optional) Create and activate a virtual environment:
   ```sh
   python -m venv venv
   .\venv\Scripts\activate  # On Windows
   ```
3. Install dependencies:
   ```sh
   pip install fastapi uvicorn pandas medspacy torch
   ```
4. Run the backend server:
   ```sh
   uvicorn main:app --reload
   ```
   The backend will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000)

### Frontend Setup
1. Navigate to the frontend folder:
   ```sh
   cd frontend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the frontend:
   ```sh
   npm start
   ```
   The frontend will be available at [http://localhost:3000](http://localhost:3000)

## Usage
- Enter your symptoms in the input field and submit.
- The app will display a prediction or possible conditions.
- If more information is needed, you will be prompted to add more symptoms.
- You can provide feedback on the predictions.

## Features
- Multi-disease prediction with confidence scores
- Multi-language support
- Feedback collection
- Modern, responsive UI

## Development
- Backend: FastAPI, PyTorch, medspaCy
- Frontend: React, i18next

## License
MIT
