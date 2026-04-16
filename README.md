# 🏥 RuralTriage AI: Clinical Grade Healthcare for Remote Regions

### "Democratizing Specialist Care through High-Speed AI & Telemedicine"

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/React-18.x-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-v0.100+-005863?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Groq--Inference-High_Speed-orange?style=for-the-badge&logo=fastapi" alt="Groq">
</p>

---

## 🚀 Quick Links & Access

| Resource | Access Link |
| :--- | :--- |
| **🌐 Live Deployment** | [RuralTriage Web App](https://rural-triage-ai--aaryannighut07.replit.app) |
| **📱 Mobile App (APK)** | [Download RuralTriage.apk](https://drive.google.com/file/d/1bx5dD6vx2LjZByKunSMRyB5qqPsL5b0k/view?usp=sharing) |
| **📊 Project PPT** | [View Presentation](https://drive.google.com/file/d/14dT2fB4_zuSmC9LVt7mRwrOrak7EvMr1/view?usp=sharing) |

---

## 📖 Vision & Overview

**RuralTriage AI** is a comprehensive clinical decision support system designed for rural healthcare ecosystems. It bridges the gap between remote patients and specialist care by providing an **AI-driven Triage Engine** that acts as the first line of defense. By combining lightning-fast LLM inference with modern telemedicine and a **synchronized multi-role workflow**, we ensure that every stakeholder in the clinical cycle—Patient, Doctor, and Pharmacist—is seamlessly connected.

---

## ✨ Multi-Persona Core Features

| Feature | For Patients | For Doctors | For Pharmacists |
| :--- | :--- | :--- | :--- |
| **🩺 AI Triage** | Instant symptom checker & 4-tier risk categorization. | High-priority patient flags & AI diagnostic reasoning. | — |
| **👨‍⚕️ Tele-Consult** | Secure WebRTC video/audio calls with "Join" links. | Master Queue management & family patient registry. | — |
| **💊 Prescriptions** | Digital access to medication & AI clinical notes. | Real-time generation & dispatch to pharmacy registry. | Order tracking & full dispensary workflow. |
| **📁 Health Records** | Personal medical cloud & AI report parsing. | Archive review & laboratory history analysis. | — |
| **📦 Pharmacy Hub** | Local medicine availability & search. | — | Inventory control, revenue tracking & stock alerts. |
| **🔄 Live Sync** | Real-time updates for booked consultations. | Background polling for instant queue updates. | Auto-refresh for new incoming prescriptions. |

---

## 🛠️ Key Technical Implementations

1.  **Independent Tab Sessions**: Leverages `sessionStorage` to allow developers and testers to run different roles (Doctor, Patient, Pharmacist) in independent browser tabs simultaneously.
2.  **High-Speed AI Inference**: Powered by **Groq LLaMA-3 70B**, generating structured clinical triage decisions in under 500ms.
3.  **Cross-Dashboard Synchronization**: Real-time background polling ensures that once a doctor issues a prescription, it appears on the pharmacist's dispensary terminal within seconds.
4.  **Clinical Triage Logic**: A robust 4-tier decision system (Treat Locally, Monitor, Refer, Emergency) backed by deterministic clinical red-flag heuristics.

---

## 📂 Project Structure

```text
RuralTriage_AI/
├── backend/                # FastAPI Backend
│   ├── app/
│   │   ├── main.py         # Main entry point & API routes
│   │   ├── models.py       # SQLAlchemy Database Models
│   │   ├── database.py     # DB connection (SQLite locally, PostgreSQL in Prod)
│   │   ├── routes/         # Feature-specific API routes (Doctor, Pharmacist, Patient)
│   │   └── services/       # Core AI & Triage logic
├── frontend/               # React Vite Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── context/    # Auth & Language state management
│   │   │   └── pages/      # Dashboards (Doctor, Patient, Pharmacist)
│   │   ├── styles/         # Vanilla CSS & Tailwind integrations
├── README.md               # Documentation
└── ruraltriage.db          # Active development database
```

---

## 🧠 AI Techniques & Methodologies

The system uses **Groq's LPU™ (Language Processing Unit)** to provide authoritative clinical assessments.
*   **Symptom Differential**: AI analyzes patient inputs and cross-references them with clinical red flags.
*   **Risk Triage**: Categorizes patients based on clinical urgency.
*   **Report Interpretation**: Uses LLMs to simplify complex lab reports into patient-friendly language.

---

## 👥 The Development Team

*   **Aaryan Nighut** — Lead Architect & Backend Engineering
*   **Ekanksh Mohite** — Full Stack Development & UI/UX Specialist
*   **Aarya Nighut** — Frontend Strategy & Clinical Workflow Logic

---

## ⚙️ Setup & Installation

Please refer to our [Deployment Documentation](https://rural-triage-ai--aaryannighut07.replit.app) for full setup instructions (Python 3.10+, Node.js 18+).

---

<p align="center">
  <h3>🌟 <i>Bridging the distance between patients and specialists with intelligence.</i> 🏥</h3>
</p>
