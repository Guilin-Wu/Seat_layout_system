# AGENTS.md - Agent Guidelines for Seat Layout System

## Project Overview

This is a pure JavaScript/HTML/CSS frontend project - a classroom seat arrangement system. There is **no build system**, **no package manager**, and **no test framework**. The project runs directly in the browser by opening `index.html`.

### Core Files
- `index.html` - Main HTML entry point
- `script.js` - Core application logic (~920 lines)
- `style.css` - Styling (~633 lines)
- External CDN: `xlsx` library for Excel file parsing

---

## Build / Run Commands

### Running the Application
Simply open `index.html` in a web browser. No build or server required.

```bash
# No build commands available
# Open index.html directly in browser
```

### Development Tools
- Use browser DevTools (F12) for debugging
- Use the browser's JavaScript console for logging
- Use `console.error()` for error logging (already used throughout code)

### Testing
**There are no automated tests.** Manual testing is required:
1. Open `index.html` in browser
2. Test each feature manually:
   - Excel upload and parsing
   - Seat generation with various rules
   - Drag and drop seat assignment
   - Lottery/draw feature
   - Settings import/export
   - Theme toggle

---

## Code Style Guidelines

### General Principles
- This is vanilla JavaScript (no frameworks)
- Code is contained within a single `DOMContentLoaded` event handler
- No TypeScript - plain JavaScript only

### Naming Conventions
- **Variables**: Use camelCase (e.g., `studentGroups`, `allStudents`)
- **Constants**: Use camelCase with descriptive names (e.g., `maxRows`, `maxCols`)
- **DOM Elements**: Use `$` prefix helper function: `const $ = (id) => document.getElementById(id)`
- **Functions**: Use camelCase, descriptive Chinese/English names (e.g., `processAndStoreStudents`, `generateSeating`)
- **Chinese comments**: Comments are in Chinese - maintain this style

### Functions (script.js:47-919)
- Use `async/await` for asynchronous operations (see `generateSeating` at line 609)
- Use arrow functions for simple utilities: `const shuffle = arr => {...}`
- Keep functions focused and reasonably sized
- Functions are nested inside the main DOMContentLoaded handler

### Variables (script.js:4-12)
```javascript
let studentGroups = [];
let allStudents = [];
let studentDetails = [];
let nameToGenderMap = new Map();
let avoidPairs = [];
let fixedSeats = {}; // { "张三": {row: 0, col: 0} }
let maxRows = 6;
let maxCols = 7;
let bgmPlaylist = [];
let isPaused = false;
let isCancelled = false;
```

### Data Structures
- **Arrays**: Use for lists (e.g., `studentGroups`, `allStudents`)
- **Maps**: Use for lookups (e.g., `nameToGenderMap`)
- **Objects**: Use for structured data (e.g., `fixedSeats`, settings objects)
- **Chinese keys**: Excel data uses Chinese column names as keys (e.g., `student['姓名']`, `student['性别']`, `student['身高']`)

### DOM Manipulation
- Use `$('id')` helper for `getElementById`
- Create elements with `document.createElement()`
- Use template literals for innerHTML when safe
- Event listeners use arrow functions: `div.addEventListener('dragstart', (e) => {...})`

### Error Handling
- Use try-catch blocks for file operations (see line 73, 218)
- Show user-friendly errors via `showToast(message, 'error')`
- Log errors to console: `console.error("导入失败:", error)`

### Event Handling
- Use inline handlers sparingly; prefer `addEventListener`
- Drag events: `dragstart`, `dragend`, `dragover`, `drop`
- File inputs: `change` event for file selection

### CSS (style.css)
- CSS custom properties (variables) defined in `:root`
- Dark theme by default with light theme toggle
- Use flexbox for layout
- Responsive design with max-width containers

### LocalStorage Keys (used in code)
- `theme` - 'light' or 'dark'
- `bgmPlaylist` - JSON array of {name, url} objects
- `lastSelectedBgmUrl` - Currently selected BGM URL
- `seatingAppSettings` - JSON object with row/col counts, rules
- `classStudentData` - JSON array of student records

### Import/Export Format (script.js:68)
```javascript
{
  studentDetails: [...],
  avoidPairs: [[name1, name2], ...],
  fixedSeats: { "姓名": {row, col}, ... },
  bgmPlaylist: [{name, url}, ...],
  lastSelectedBgmUrl: "...",
  seatingAppSettings: {...},
  rules: {
    enableGenderRule: boolean,
    forceGenderPairing: boolean,
    deskPairDefinition: "1-2,3-4",
    includeDiagonals: boolean,
    autoBalance: boolean
  }
}
```

### Key Algorithms
- **Seat generation** (`generateSeating`, line 609): Async function with animation
- **Shuffling** (`shuffle`, line 120): Fisher-Yates algorithm
- **Conflict detection**: Check avoidPairs, gender rules, desk pair rules
- **Grouping**: Sort by height, divide into groups

### Adding New Features
1. Add new state variables at top of handler (after line 12)
2. Add new DOM element references (after line 44)
3. Add new functions after existing functions
4. Register event listeners in `init()` function (line 865)
5. Test manually in browser

### Browser Compatibility
- Uses modern ES6+ features (arrow functions, async/await, Map, let/const)
- Requires modern browser with ES6 support
- Uses XLSX library from cdnjs for Excel parsing

---

## Working with This Codebase

### Common Tasks
- **Adding a new setting**: Add HTML input in `index.html`, reference in `script.js`, save/load in settings functions
- **Modifying seat generation**: Edit `generateSeating` or related validation functions
- **Adding new rules**: Add checkbox in HTML, add logic in validation functions
- **Styling changes**: Edit `style.css` - use existing CSS variables

### Important Notes
- All code lives in `script.js` - it's a monolithic file
- No linting/formatting tools configured
- No TypeScript - any additions should use plain JavaScript
- Remember to handle both light and dark themes when adding UI elements
