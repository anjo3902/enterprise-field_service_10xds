# AI Field Service Diagnosis System

A complete AI-powered field service diagnosis system with React frontend and Python backend.

## 🏗️ Project Structure

```
FIELD_SERVICE_DISPATCHER_NEW/
├── frontend/              # React + Vite frontend
│   ├── src/              # React components and pages
│   ├── package.json      # Frontend dependencies
│   └── .env              # Frontend environment config
│
├── ai_engine/            # AI diagnosis engine
│   ├── diagnosis_engine.py
│   ├── gemini_diagnosis.py
│   └── technician_mapper.py
│
├── config/               # Configuration files
│   └── gcp_config.py     # Google Cloud AI setup
│
├── demo_ui/              # Streamlit demo (legacy)
│   └── app.py
│
├── api_server.py         # Flask REST API for frontend
├── requirements.txt      # Python dependencies
└── service-account.json  # Google Cloud credentials
```

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start Backend API Server

```bash
python api_server.py
```

Backend runs at: **http://localhost:8000**

### 3. Start React Frontend

```bash
cd frontend
npm install  # First time only
npm run dev
```

Frontend runs at: **http://localhost:3000**

## 🔧 Development

- **Backend API**: Flask server wrapping AI diagnosis engine
- **Frontend**: React 18 + Vite + TailwindCSS
- **AI Engine**: Google Vertex AI Gemini for image analysis

## 📝 Environment Variables

- Copy `.env.example` to `frontend/.env` and configure
- Add `service-account.json` for Google Cloud authentication

## 🧪 Testing

Open frontend at http://localhost:3000 and submit a diagnosis request with:
1. Upload fault image
2. Enter description
3. Enter location and contact
4. View AI diagnosis results

## 📦 Tech Stack

**Frontend:**
- React 18
- Vite
- TailwindCSS
- Axios

**Backend:**
- Python 3.12
- Flask + Flask-CORS
- Google Vertex AI
- PIL/Pillow

---

Built with ❤️ for intelligent field service management
