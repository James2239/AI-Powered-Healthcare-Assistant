# AI-Powered Healthcare Assistant

A fullstack application that leverages AI to assist users in identifying possible diseases based on their symptoms.

## Features
- Symptom-based disease prediction using AI/ML
- Multi-prediction support with confidence scores
- Medicine and description suggestions
- Multilingual UI (English, Spanish, German, French, Hindi, Swahili, Chinese)
- Feedback collection for continuous improvement
- Auto-complete for symptom input
- Search history for previous queries

## Project Structure
- `backend/` — Python FastAPI backend for predictions
- `frontend/` — React frontend for user interaction

## Getting Started

### Backend
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the backend:
   ```bash
   python main.py
   ```

### Frontend
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Run the frontend:
   ```bash
   npm start
   ```

## Usage
- Enter your symptoms in the input field.
- Use the auto-complete suggestions for faster entry.
- View possible conditions and their details.
- Add more info if prompted.
- Review your previous searches in the history section.

## License
MIT
