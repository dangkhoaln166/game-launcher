<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/PlayStation_5_logo.svg/1024px-PlayStation_5_logo.svg.png" alt="Logo" width="200" height="auto" />
  <h1>PS5 Style Desktop Game Launcher</h1>
  
  <p>
    A modern, visually stunning desktop game launcher built with Electron and React, featuring a PlayStation 5-inspired user interface. Manage, organize, and launch your local PC games (Steam, Epic Games, and custom executables) with premium aesthetics and smooth animations.
  </p>

  <p>
    <a href="#features"><strong>Explore Features</strong></a> ·
    <a href="#tech-stack"><strong>Tech Stack</strong></a> ·
    <a href="#installation"><strong>Installation</strong></a>
  </p>
</div>

<br />

## ✨ Features

- **🎮 Universal Game Management:** Automatically scans and imports games from Steam and Epic Games. Supports adding custom `.exe` files manually.
- **🎨 Premium PS5 Interface:** Implements a cinematic, horizontal-scrolling carousel with dynamic hero backgrounds, glassmorphism UI, and spatial navigation.
- **🪄 Smooth Animations:** Powered by `framer-motion` for fluid transitions, spring-based drag-and-drop, and micro-interactions.
- **🔍 Smart Search & Filtering:** Instantly find games by title or developer.
- **🗂️ Advanced Sorting:** Sort your library Alphabetically, by Most Played, or keep your Favorites at the front.
- **🖱️ Drag & Drop Reordering:** Intuitive Grid Modal allowing you to custom-arrange your library order via drag-and-drop.
- **💾 Local First & Fast:** Zero cloud dependency. Data is stored locally using lightweight JSON persistence. Bypasses strict Chromium security policies via base64 image encoding for instant local asset loading.
- **⏱️ Playtime Tracking:** Automatically tracks your "Play Count" and "Last Played" timestamps.

## 🛠️ Tech Stack

- **Core:** [Electron](https://www.electronjs.org/) (Desktop Engine) + [Vite](https://vitejs.dev/) (Bundler)
- **Frontend:** [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Utility-first styling)
- **Animations:** [Framer Motion](https://www.framer.com/motion/) (Complex gesture and layout animations)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Data Persistence:** `fs-extra` (Local JSON Storage)

## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ps5-game-launcher.git
   cd ps5-game-launcher
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production (Windows/Mac/Linux):**
   ```bash
   npm run build:win  # For Windows .exe
   ```

## 🧠 Technical Highlights (For CV / Portfolio)

- **Complex State Management:** Orchestrated synchronized states across multiple React components and Electron's Main-Renderer IPC bridge.
- **Custom Horizontal Carousel:** Engineered a math-based 3D-like horizontal scroll system simulating the PS5 dashboard, completely independent of standard CSS scroll snap.
- **Advanced File System Access:** Built robust IPC handlers to bypass Electron's `file://` webSecurity restrictions by reading and converting local user images to Base64 buffers natively in Node.js.
- **Drag & Drop Integration:** Implemented complex gesture-based reordering logic over virtualized grids.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
