# 🕵️ Whisper — Anonymous Gossip Web App

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Build Status](https://img.shields.io/badge/build-N/A-lightgrey)]()
[![React](https://img.shields.io/badge/Made%20with-React-blue.svg)](https://reactjs.org/)
[![Status](https://img.shields.io/badge/status-archived-lightgrey)]()

Whisper is a prototype web application designed for **anonymous gossip-style posting**, developed using **React**, **Webpack**, and **Node.js**. It was built as a hands-on exploration of modern front-end frameworks, module bundlers, and SPA architecture.

> ⚠️ **Note:** This project currently doesn't run due to a `ERR_OSSL_EVP_UNSUPPORTED` error caused by Webpack and newer Node.js versions. It's being preserved as a **learning artifact** and stepping stone for future, more refined projects.

---

## 📸 Preview

![file_2025-04-13_13 33 41 1](https://github.com/user-attachments/assets/4ab15037-87b1-40f6-b939-c0fc026bfe65)

---

## 🧠 Features Explored

- 🔐 Anonymous message posting logic
- ⚛️ Single-page application built with React
- ⚙️ Webpack + Babel for module bundling and JS transpilation
- 🎨 Component-based UI styled with CSS
- 🧰 Structured project with `npm` and environment configs

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

## 🛠️ Installation Guide *(⚠️ Project not currently functional)*

> This version may not run due to compatibility issues with Node.js 17+. A temporary fix involves using `--openssl-legacy-provider` or downgrading to Node.js v16.
> 
---

## 🚧 Project Status
❌ Archived	 - Due to Webpack/Node.js compatibility issues

✅ Learning	 - Preserved for educational reference

🔜 Planned	 - Rewrite using modern build tools

---


### 🧪 Try Local Setup (Optional)
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
```

Built with ❤️ by Deaneeth
