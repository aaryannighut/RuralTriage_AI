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

## 👥 The Development Team

This project was envisioned and developed by a dedicated team of innovators focused on making an impact in healthcare accessibility:

*   **Aaryan Nighut** — Lead Architect & Backend Engineering
*   **Ekanksh Mohite** — Full Stack Development & UI/UX Specialist
*   **Aarya Nighut** — Frontend Strategy & Clinical Workflow Logic

---

## 🏗️ Detailed Project Architecture

The system is split into two main high-performance modules, meticulously organized for scalability and maintainability.

### 📂 Backend Architecture (`/backend`)
Built with **FastAPI**, focusing on asynchronous performance and strict data validation.

*   `app/main.py`: The central nervous system of the API. Manages middleware, exception handlers, and route registration.
*   `app/models.py`: Defines the **SQLAlchemy** schemas for Patients, Doctors, Appointments, and Prescriptions.
*   `app/database.py`: Orchestrates the database connection pooling and session management.
*   `app/routes/`: 
    *   `doctor_dashboard_routes.py`: Specialized endpoints for clinical stats, high-risk patient flags, and queue management.
    *   `patient_routes.py`: Handles profile creation, symptom logging, and family doctor enrollment.
    *   `appointment_routes.py`: Manages the lifecycle of a consultation (Scheduled → Completed → Cancelled).
*   `app/schemas/`: Contains **Pydantic** models that ensure every piece of data entering the system is valid and secure.
*   `app/settings.py`: Environment-aware configuration for API Keys and Server Settings.

### 📂 Frontend Architecture (`/frontend`)
A modern **React** SPA designed for speed and responsiveness in low-bandwidth environments.

*   `src/app/pages/`:
    *   `TalkToDoctor.tsx`: The core tele-consultation hub featuring real-time appointment tracking and the family doctor interface.
    *   `DoctorDashboard.tsx`: A comprehensive workspace for practitioners to manage their clinical queue and issue AI-assisted reports.
    *   `SymptomTriage.tsx`: The primary interface for the AI diagnostic engine.
    *   `HealthRecords.tsx`: A secure portal for uploading and interpreting medical documents.
*   `src/app/components/`: Reusable, atomic UI components (Stats Cards, Navbars, Badge systems).
*   `src/styles/`: Global **Tailwind CSS** configurations and design system tokens.

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

### *Bridging the distance between patients and specialists with intelligence.*
