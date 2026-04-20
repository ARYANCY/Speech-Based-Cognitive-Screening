# 🎨 Dementia Detection Frontend

React-based frontend application for dementia detection with interactive charts, real-time audio recording, and comprehensive analysis visualization.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [File Structure](#file-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Dependencies](#dependencies)
- [Configuration](#configuration)
- [Usage](#usage)
- [Components](#components)
- [Styling](#styling)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The frontend is a React single-page application (SPA) that provides:
- Interactive user interface for text and audio analysis
- Real-time audio recording with waveform visualization
- Memory test functionality
- Comprehensive results visualization with Chart.js
- History tracking with localStorage
- Responsive design with modern CSS

### Key Technologies
- **React 18.2**: UI framework
- **Chart.js 4.5**: Data visualization
- **React-Chartjs-2 5.3**: React wrapper for Chart.js
- **Axios**: HTTP client for API calls
- **React Icons**: Icon library

---

## ✨ Features

### Core Functionality
- **📝 Text Analysis**: Direct text input for dementia prediction
- **🎤 Audio Analysis**: Upload audio files or record directly
- **📊 Interactive Charts**: Bar, doughnut, line, and gauge charts
- **📈 Statistics Dashboard**: View analysis trends and patterns
- **📚 History Tracking**: Review past analyses with localStorage
- **🧮 Calculation Breakdown**: Step-by-step probability calculation
- **🎯 Memory Test**: Text recall accuracy assessment

### Advanced Features
- **🎵 Real-time Waveform**: Visualize audio signal during recording
- **⏱️ Time Analysis**: WPM, pause ratios, speaking efficiency
- **📉 Multi-class Visualization**: Healthy, MCI, Moderate, Severe probabilities
- **🎨 Modern UI/UX**: Glassmorphism, gradients, animations
- **📱 Responsive Design**: Works on desktop, tablet, and mobile

---

## 📁 File Structure

```
frontend/
├── README.md                    # This file
├── package.json                  # Node.js dependencies
├── public/
│   └── index.html               # HTML template
│
└── src/
    ├── index.js                 # React entry point
    ├── index.css                # Global styles
    ├── App.js                   # Main app component
    ├── App.css                  # App-level styles
    │
    ├── components/              # React components
    │   ├── TextAnalysis.js     # Text input and analysis
    │   ├── TextAnalysis.css
    │   │
    │   ├── AudioAnalysis.js    # Audio recording and upload
    │   ├── AudioAnalysis.css
    │   │
    │   ├── ResultsDisplay.js   # Results visualization
    │   ├── ResultsDisplay.css
    │   │
    │   ├── StatsPanel.js       # Statistics dashboard
    │   ├── StatsPanel.css
    │   │
    │   ├── HistoryPanel.js     # Analysis history
    │   ├── HistoryPanel.css
    │   │
    │   ├── Charts.js            # Chart.js components
    │   ├── Charts.css
    │   │
    │   ├── ProbabilityCalculation.js  # Calculation breakdown
    │   ├── ProbabilityCalculation.css
    │   │
    │   ├── MemoryTest.js        # Memory test component (integrated)
    │   ├── MemoryTest.css
    │   │
    │   └── Buttons.css          # Shared button styles
    │
    └── services/
        └── apiService.js        # API client
```

---

## 📦 Prerequisites

### Required Software
- **Node.js** 14+ ([Download](https://nodejs.org/))
- **npm** (comes with Node.js) or **yarn**
- **Git** (for cloning repository)

### Backend Requirements
- Backend server running on `http://localhost:5000`
- See [Backend README](../backend/README.md) for setup

---

## 🚀 Installation

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure API Endpoint

Edit `src/services/apiService.js` if backend is on a different URL:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
```

Or create a `.env` file in `frontend/`:

```env
REACT_APP_API_URL=http://localhost:5000
```

### 3. Start Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
```

Creates optimized production build in `build/` directory.

---

## 📚 Dependencies

### Production Dependencies (`package.json`)

```json
{
  "axios": "^1.6.2",              // HTTP client for API calls
  "chart.js": "^4.5.1",          // Charting library
  "react": "^18.2.0",            // React framework
  "react-chartjs-2": "^5.3.1",   // React wrapper for Chart.js
  "react-dom": "^18.2.0",        // React DOM renderer
  "react-icons": "^4.12.0",      // Icon library
  "react-scripts": "5.0.1"       // Create React App scripts
}
```

### Development Dependencies
- **ESLint**: Code linting (configured via react-scripts)
- **React Scripts**: Build tools, webpack, Babel, etc.

---

## ⚙️ Configuration

### Environment Variables

Create `.env` in `frontend/` directory:

```env
REACT_APP_API_URL=http://localhost:5000
```

### API Configuration

Edit `src/services/apiService.js`:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
```

---

## 💻 Usage

### Development Mode

```bash
npm start
```

- Opens browser at `http://localhost:3000`
- Hot reload on file changes
- ESLint warnings in console

### Production Build

```bash
npm run build
```

- Creates optimized build in `build/`
- Minified JavaScript and CSS
- Ready for deployment

### Testing

```bash
npm test
```

Runs React testing suite (if configured).

### Eject (Advanced)

```bash
npm run eject
```

**⚠️ Warning:** This is irreversible. Ejects from Create React App to expose full webpack configuration.

---

## 🧩 Components

### `App.js`
Main application component with tab navigation:
- Text Analysis tab
- Audio Analysis tab
- Statistics tab
- History tab

### `TextAnalysis.js`
Text input and analysis component:
- Text area for user input
- Analyze button
- Results display integration

### `AudioAnalysis.js`
Audio recording and upload component:
- Real-time audio recording
- Waveform visualization
- File upload support
- Memory test integration
- Audio playback

### `ResultsDisplay.js`
Results visualization component:
- Dementia probability gauge
- Class probabilities chart
- Audio signal analysis chart
- Time analysis chart
- Calculation breakdown
- Recall accuracy display

### `StatsPanel.js`
Statistics dashboard:
- Stats distribution chart
- History trends chart
- Summary statistics

### `HistoryPanel.js`
Analysis history:
- Past analyses list
- localStorage persistence
- Clear history functionality

### `Charts.js`
Chart.js components:
- `ClassProbabilitiesChart`: Bar chart for class probabilities
- `DementiaProbabilityGauge`: Doughnut chart for probability
- `TimeAnalysisChart`: Line chart for time metrics
- `AudioSignalChart`: Bar chart for audio features
- `StatsDistributionChart`: Bar chart for stats
- `HistoryTrendsChart`: Line chart for trends

### `ProbabilityCalculation.js`
Calculation breakdown component:
- Collapsible section
- Step-by-step calculation
- Base probability
- Individual boosts
- Final probability

---

## 🎨 Styling

### CSS Architecture
- **Component-level CSS**: Each component has its own CSS file
- **Global styles**: `index.css` for base styles
- **Shared styles**: `Buttons.css` for common button styles

### Design System
- **Color Scheme**: Dark theme with gradients
- **Typography**: Modern sans-serif fonts
- **Spacing**: Consistent padding and margins
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Mobile-first design approach

### Key CSS Features
- Glassmorphism effects
- Gradient backgrounds
- Box shadows
- Smooth animations
- Responsive breakpoints
- Modern button styles

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Backend Connection Errors
**Error:** `Network Error` or `Failed to fetch`
**Solution:**
- Verify backend is running on `http://localhost:5000`
- Check CORS configuration in backend
- Verify API URL in `apiService.js`

#### 2. Port Already in Use
**Error:** `Port 3000 is already in use`
**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

Or use a different port:
```bash
PORT=3001 npm start
```

#### 3. Module Not Found
**Error:** `Cannot find module 'chart.js'`
**Solution:**
```bash
npm install
```

#### 4. Build Errors
**Error:** `Failed to compile`
**Solution:**
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check for syntax errors in components
- Verify all imports are correct

#### 5. Chart Not Displaying
**Error:** Charts not rendering
**Solution:**
- Verify Chart.js and react-chartjs-2 are installed
- Check browser console for errors
- Ensure data is properly formatted

#### 6. Audio Recording Not Working
**Error:** `getUserMedia is not defined`
**Solution:**
- Use HTTPS or localhost (required for microphone access)
- Check browser permissions
- Verify browser supports MediaRecorder API

---

## 📱 Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 11+)
- **Opera**: Full support

### Required Browser Features
- ES6+ JavaScript support
- MediaRecorder API (for audio recording)
- LocalStorage API (for history)
- Canvas API (for charts)

---

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Static Hosting

**Netlify:**
1. Build: `npm run build`
2. Publish directory: `build`
3. Deploy

**Vercel:**
1. Connect repository
2. Build command: `npm run build`
3. Output directory: `build`

**GitHub Pages:**
```bash
npm install -g gh-pages
npm run build
gh-pages -d build
```

### Environment Variables in Production

Set `REACT_APP_API_URL` in your hosting platform's environment variables.

---

## 📝 Notes

- History is stored in browser localStorage (cleared on browser data clear)
- Audio files are sent to backend for processing (not stored in frontend)
- Charts are rendered client-side using Chart.js
- All API calls are made to backend server
- Responsive design works on mobile, tablet, and desktop

---

## 📄 License

MIT License - See main project README for details.

---

## 🔗 Related Documentation

- [Backend README](../backend/README.md)
- [Main Project README](../README.md)
- [Setup Guide](../SETUP.md)

