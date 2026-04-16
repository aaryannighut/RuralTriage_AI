# 🏥 RuralTriage AI: Clinical Grade Healthcare for Remote Regions

### "Democratizing Specialist Care through High-Speed AI & Telemedicine"

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/React-18.x-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-v0.100+-005863?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Groq--Inference-High_Speed-orange?style=for-the-badge&logo=fastapi" alt="Groq">
</p>

---

## 📖 Vision & Overview

**RuralTriage AI** was born from a simple but powerful mission: **Distance should not be a barrier to clinical excellence.** 

In many rural regions, patients either ignore critical symptoms due to travel costs or overburden tertiary hospitals with minor ailments. Our platform bridges this gap by providing an **AI-driven Triage Engine** that acts as the first line of defense. By combining lightning-fast LLM inference with modern telemedicine, we ensure that every patient receives a specialist-grade assessment within seconds.

---

## ✨ Multi-Persona Core Features

| Feature | For Patients | For Doctors | For Pharmacists |
| :--- | :--- | :--- | :--- |
| **🩺 AI Triage** | Instant symptom checker & risk categorization. | High-priority patient flags & diagnostic assist. | — |
| **👨‍⚕️ Tele-Consult** | Bookings & secure WebRTC video/audio calls. | Queue management & clinical record access. | — |
| **💊 Prescriptions** | Digital access to medication & AI notes. | Real-time generation & dispatch to registry. | Order tracking & dispensary workflow. |
| **📁 Health Records** | Personal medical cloud & AI report parsing. | Archive review & laboratory history analysis. | — |
| **📦 Pharmacy Hub** | Local medicine availability & search. | — | Full inventory control & stock management. |
| **🚨 Priority Care** | Fast-track triage for critical indicators. | Emergency alerts for high-risk triage cases. | — |


---

## 📂 Project Structure

```text
RuralTriage_AI/
├── backend/                # FastAPI Backend
│   ├── app/
│   │   ├── main.py         # Main entry point & API routes
│   │   ├── models.py       # SQLAlchemy Database Models
│   │   ├── database.py     # DB connection & session management
│   │   ├── routes/         # Feature-specific API routes (Doctor, Patient, Triage)
│   │   ├── schemas/        # Pydantic data validation models
│   │   └── services/       # Core logic (AI Integrations, ML Inference)
│   ├── requirements.txt    # Python dependencies
│   └── .env                # System configuration (API Keys)
├── frontend/               # React Vite Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/ # Reusable UI components
│   │   │   └── pages/      # Main workflow pages (Consultation, Dashboard)
│   │   ├── styles/         # Global CSS & Tailwind configuration
│   │   └── main.tsx        # React entry point
│   ├── public/             # Assets (Logo, Icons, Banners)
│   └── package.json        # Frontend dependencies
├── README.md               # You are here 📍
└── test.db                 # Local development database (SQLite)
```

---

## 🧠 AI Techniques & Methodologies

### ⚡ Powered by Groq LLaMA-3
The "brain" of RuralTriage AI is powered by the **Groq LLaMA-3 70B** model. 

**Why Groq?**
In emergency medical triage, every second counts. Traditional LLM APIs can be slow, but **Groq's LPU™ (Language Processing Unit)** technology allows us to generate complex medical decisions in **milliseconds**. 

**Core AI Functions:**
1.  **Symptom Differential**: AI analyzes patient-reported symptoms and cross-references them with common/rare conditions.
2.  **Risk Triage**: Categorizes patients into Low, Medium, or High risk based on clinical red flags (e.g., chest pain, respiratory distress).
3.  **Prescription Assistance**: Suggests appropriate drug classes and dosages to doctors to reduce human error.
4.  **Medical Report Interpretation**: Simplifies complex lab results (X-rays, blood work) into humanized, easy-to-understand language for patients.

---

## ⚙️ Professional Setup & Installation

Follow these steps exactly to get the system up and running on your local machine.

### **1. Prerequisites**
*   **Python 3.10+** (Check with `python --version`)
*   **Node.js 18+** (Check with `node --version`)
*   **Git**

### **2. Backend Setup**
Open a terminal and run the following:
```bash
# Navigate to backend
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file in the root of 'backend' directory
# Contents:
# GROQ_API_KEY=your_key_here
# DATABASE_URL=sqlite:///./test.db

# Start the server
python -m uvicorn app.main:app --reload
```
*Backend runs at: `http://localhost:8000`*

### **3. Frontend Setup**
Open a **new** terminal and run:
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Launch Development Server
npm run dev
```
*Frontend runs at: `http://localhost:5173`*

---

## 🔑 Required API Credentials

To enable the full power of RuralTriage AI, you need the following keys in your `backend/.env` file:

| Key | Why it's needed |
| :--- | :--- |
| `GROQ_API_KEY` | **Critical**: Powers the entire triage and clinical diagnostic engine. |
| `CLOUDINARY_URL` | **Optional**: Used for cloud-based storage of medical reports. The system will fallback to local storage if this is missing. |

---

## 🔄 The RuralTriage Ecosystem
1.  **Triage Phase**: Patient enters symptoms → AI calculates urgency.
2.  **Clinical Phase**: High-risk patients are pushed to the top of the **Doctor's Master Queue**.
3.  **Tele-Consultation**: Secure video/audio link established via the dashboard.
4.  **Resolution**: Doctor issues an **E-Prescription** which is instantly visible to the patient and their local **Pharmacy Registry**.

---

## 👥 The Development Team

This project was envisioned and developed by a dedicated team of innovators focused on making an impact in healthcare accessibility:

*   **Aaryan Nighut** — Lead Architect & Backend Engineering
*   **Ekanksh Mohite** — Full Stack Development & UI/UX Specialist
*   **Aarya Nighut** — Frontend Strategy & Clinical Workflow Logic

---

<p align="center">
  <h3>🌟 <i>Bridging the distance between patients and specialists with intelligence.</i> 🏥</h3>
</p>
