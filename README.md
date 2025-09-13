# 🔥 Firemark

![Firemark Screenshot](https://i.imgur.com/2awhsKB.jpeg)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Electron](https://img.shields.io/badge/Built_with-Electron-47848f.svg)](https://www.electronjs.org/)

A powerful and beautiful batch image watermarking utility built with Electron. Firemark allows you to add text, logos, or tiled watermarks to multiple images at once, with a range of customization options and a sleek, modern dark interface.

## ✨ Key Features

-   **🖥️ Fully Offline:** Works without an internet connection, ensuring your privacy and reliability.
-   **💧 Multiple Watermark Types:** Apply text, logos, icons, repeating tiles, frames, and pattern overlays.
-   **⚙️ Advanced Controls:** Fine-tune every aspect, including font, size, color, opacity, position, rotation, and more.
-   **🖼️ Live Preview:** Instantly see your changes on a selected image with zoom, pan, and drag-and-drop positioning.
-   **🎨 Image Effects:** Adjust blur, noise, sharpen, brightness, contrast, and more.
-   **🗂️ Batch Processing:** Apply your watermark configurations to hundreds of images at once.
-   **💾 Presets:** Save and load your favorite watermark configurations for different projects.
-   **🔄 Persistent Settings:** Your last-used settings are automatically saved and restored on launch.

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (which includes npm)

### Installation & Running

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/firemark.git
    cd firemark
    ```

2.  Install the dependencies:
    ```bash
    npm install
    ```

3.  Run the app in development mode:
    ```bash
    npm run electron:dev
    ```

## 📦 Building for Production

To build installers for your platform, run the following command:

```bash
npm run electron:build
```

This will generate an AppImage for Linux and a portable/NSIS installer for Windows inside the `dist` directory.

## 📜 Scripts

-   `npm run electron:dev`: Run the app in development mode with live reloading for the renderer process.
-   `npm run electron:build`: Build installers for your current platform.

## 📄 License

This project is licensed under the MIT License.