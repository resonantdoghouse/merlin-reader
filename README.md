# Merlin Reader 🧙‍♂️📜

> "In a land of myth, and a time of magic, the destiny of a great kingdom rests on the shoulders of a young boy. His name... Merlin."

Merlin Reader is a powerful, magical Desktop Application for managing and reading your collection of grimoires (PDFs). Built with the finest technologies from the future (Electron, React, TypeScript), it offers a seamless reading experience worthy of Camelot.

## Features ✨

### 🏰 The Great Library (`Camelot`)

- **Drag & Drop**: Simply cast your scrolls into the lake (drag PDFs onto the window) to add them to your collection.
- **Kingdom Scan**: Scan entire folders to discovering hidden tomes.
- **Organization**: Sort your library by Title, Date Added, or Recently Read status.
- **Search**: Quickly find specific spells using the search bar.
- **View Options**: Toggle between Grid and List views, and resize thumbnails (Small, Medium, Large).
- **Persistence**: The library remembers where you left off, archiving your progress in the Great Dragon's keep (`SQLite`).
- **Random Tome**: Let destiny choose your next read with the "Random Book" feature.

### ⚔️ The Reader (`Excalibur`)

- **Seamless Reading**: High-fidelity PDF rendering using `react-pdf`.
- **Progress Tracking**: Your progress is saved automatically as you turn each page.
- **Magical Lighting**: Toggle between Day mode and **Morgana's Shadow** (Dark Mode with high contrast and hue rotation).
- **Navigation Controls**:
  - Keyboard arrows (Left/Right)
  - On-screen buttons
  - **Auto-Advance**: Automatically turn the page when scrolling to the bottom.
- **Review Tools**:
  - **Rotation**: Rotate pages for easier reading of sideways charts.
  - **Zoom**: Scale the text to your liking.

### 🛡️ Security & Architecture

- **Secure Protocol**: Uses a custom `media://` protocol to safely load local files without compromising security (`webSecurity: true`).
- **Robust Path Handling**: Compatible with both standard and magical (Windows) file paths.

## Technologies (The Old Religion) 🧪

- **Electron**: For the Desktop shell (`King Arthur`).
- **React + Vite**: For the enchanted interface (`Camelot`).
- **TypeScript**: For type-safe incantations.
- **TailwindCSS**: For style and elegance.
- **SQLite (better-sqlite3)**: For data persistence (`Kilgharrah`).

## Installation 💿

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/merlin-reader.git
   cd merlin-reader
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Run in Development Mode**:

   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```
   The executable tome will appear in the `dist` directory.

## License 📜

MIT License. Free for all citizens of Camelot.
