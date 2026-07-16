# web_work_ai

![Build status](https://img.shields.io/github/actions/workflow/status/MuhammadBaibarsZainUlAbideen/web_work_ai/ci.yml?style=for-the-badge&logo=githubactions&logoColor=white&label=CI) ![GitHub stars](https://img.shields.io/github/stars/MuhammadBaibarsZainUlAbideen/web_work_ai?style=for-the-badge&logo=github) ![GitHub forks](https://img.shields.io/github/forks/MuhammadBaibarsZainUlAbideen/web_work_ai?style=for-the-badge&logo=github) ![GitHub issues](https://img.shields.io/github/issues/MuhammadBaibarsZainUlAbideen/web_work_ai?style=for-the-badge&logo=github) ![Last commit](https://img.shields.io/github/last-commit/MuhammadBaibarsZainUlAbideen/web_work_ai?style=for-the-badge&logo=github)

## 📑 Table of Contents

- [Description](#description)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Key Dependencies](#key-dependencies)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Contributors](#contributors)
- [Contributing](#contributing)

## 📝 Description

web_work_ai — a backend api built with FastAPI, PostgreSQL, Python, Redis.

## 🛠️ Tech Stack

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white) ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) ![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

**Notable libraries:** NumPy, OpenAI, Uvicorn

## ⚡ Quick Start

```bash

# 1. Clone the repository
git clone https://github.com/MuhammadBaibarsZainUlAbideen/web_work_ai.git

# 2. Create & activate a virtualenv
python -m venv venv && source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# Run the API
uvicorn main:app --reload
```

## 📁 Project Structure

```
.
├── backend
│   ├── __init__.py
│   ├── building_embeding_text.py
│   ├── data_base.py
│   ├── helper_function.py
│   ├── redis_verification.py
│   ├── server.py
│   ├── session.py
│   └── stripe_routes.py
├── extension
│   ├── 128x128.png
│   ├── 16x16.png
│   ├── 32x32.png
│   ├── 48x48.png
│   ├── Auth.js
│   ├── Premium_Manage.js
│   ├── Refrsh_token.js
│   ├── Terms_of_services.js
│   ├── background.js
│   ├── content.js
│   ├── dropdown.js
│   ├── editcrumbs.js
│   ├── getStoredCrumbs.js
│   ├── goPremimum_overly.js
│   ├── logout.js
│   ├── manage_subscrption.js
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── reloadExtension.js
│   ├── send_message.js
│   ├── solve_endpoint.js
│   └── style.css
├── landing_page
│   ├── cancel.html
│   ├── icons
│   │   ├── Sub-topics.png
│   │   ├── Topics.png
│   │   ├── fact 1.png
│   │   ├── facts.png
│   │   ├── gear.png
│   │   ├── image 2.png
│   │   ├── image1.png
│   │   ├── step 1.png
│   │   └── step2.png
│   ├── index.html
│   ├── stripe.html
│   ├── stripe.js
│   └── success.html
└── requirements.txt
```

## 🛠️ Development Setup

### Python
1. Install Python (v3.10+ recommended)
2. `python -m venv venv && source venv/bin/activate`  (Windows: `venv\Scripts\activate`)
3. `pip install -r requirements.txt`

## 👥 Contributors

Thanks to everyone who has contributed to this project:

<p align="left">
<a href="https://github.com/MuhammadBaibarsZainUlAbideen" title="MuhammadBaibarsZainUlAbideen"><img src="https://avatars.githubusercontent.com/u/228825694?v=4&s=64" width="64" height="64" alt="MuhammadBaibarsZainUlAbideen" style="border-radius:50%" /></a>
</p>

[See the full list of contributors →](https://github.com/MuhammadBaibarsZainUlAbideen/web_work_ai/graphs/contributors)

## 👥 Contributing

Contributions are welcome! Here's the standard flow:

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/MuhammadBaibarsZainUlAbideen/web_work_ai.git`
3. **Branch**: `git checkout -b feature/your-feature`
4. **Commit**: `git commit -m 'feat: add some feature'`
5. **Push**: `git push origin feature/your-feature`
6. **Open** a pull request

Please follow the existing code style and include tests for new behavior where applicable.

---

<div align="center">

[![Made with ReadmeBuddy](https://img.shields.io/badge/Made%20with-ReadmeBuddy-8B5CFF?style=for-the-badge&logo=markdown&logoColor=white)](https://readmebuddy.com)

<sub>Generate beautiful READMEs in seconds → <a href="https://readmebuddy.com">readmebuddy.com</a></sub>

</div>
