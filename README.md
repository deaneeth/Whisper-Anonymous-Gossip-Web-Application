# 🕵️ Whisper — Anonymous Gossip Web App

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build](https://img.shields.io/badge/build-failed-red.svg)]()
[![React](https://img.shields.io/badge/Made%20with-React-blue.svg)](https://reactjs.org/)
[![Status](https://img.shields.io/badge/status-archived-lightgrey)]()

Whisper is a prototype web application designed for **anonymous gossip-style posting**, developed using **React**, **Webpack**, and **Node.js**. It was built as a practical exploration into modern front-end frameworks, module bundlers, and SPA architecture.

> ⚠️ **Note:** The project currently doesn't run due to `ERR_OSSL_EVP_UNSUPPORTED` related to Webpack & newer Node.js versions. This repository is preserved as a **learning artifact** and stepping stone toward more advanced projects.

---

## 📸 Preview

> I'll add a screenshot when it's ready <

---

## 🧠 Features Explored

- 🔐 Anonymous message posting logic
- ⚛️ Front-end SPA using React
- ⚙️ Webpack + Babel for module bundling and modern JS transpiling
- 🎨 Component-based UI styling with CSS
- 🧰 Structured development with `npm` and environment config

---

## 🧑‍💻 Languages & Tools Used

| Language / Tool     | Purpose                         |
|---------------------|---------------------------------|
| **JavaScript (JSX)**| Main application logic          |
| **React.js**        | Front-end framework             |
| **Node.js**         | Backend environment/runtime     |
| **Webpack**         | Module bundler                  |
| **Babel**           | JS transpiler for compatibility |
| **HTML5**           | Markup structure                |
| **CSS3**            | Styling                         |
| **npm**             | Dependency management           |

---

## 🛠️ Installation (⚠️ Not Currently Functional)

> This version may not work due to Node.js v17+ compatibility issues. A fix involves using the `--openssl-legacy-provider` or downgrading Node.js to v16.x.

## 🛠️ Recommended Fix (Future Plan)
Refactor project using Vite or Next.js for better support with modern Node.js versions.

## 🚧 Project Status
❌ Archived	 - Due to Webpack/Node.js compatibility issues
✅ Learning	 - Preserved for educational reference
🔜 Planned	 - Rewrite using modern build tools


### 🧪 Attempt Local Setup (Optional)
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/whisper-anonymous-gossip.git
cd whisper-anonymous-gossip

# Set legacy OpenSSL support (PowerShell)
$env:NODE_OPTIONS="--openssl-legacy-provider"

# Install dependencies
npm install

# Start development server
npm start
