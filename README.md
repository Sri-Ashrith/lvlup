# LEVEL UP 🎮

A gamified hackathon platform with a dark GTA/Vice City inspired theme. Built for conducting 3-4 hour competitive hackathon events.

![Theme](https://img.shields.io/badge/Theme-GTA%20Vice%20City-purple)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js-blue)
![Real-time](https://img.shields.io/badge/Real--time-Socket.io-green)

## 🎯 Features

### For Teams
- **Team Dashboard** - View cash balance, power-ups, and active missions
- **4 Unique Levels** - Progress through different challenge types
- **Tech Heists** - Attack other teams and steal their cash
- **Power-ups** - Automatic and admin-granted special abilities
- **Real-time Updates** - Live leaderboard and notifications

### For Admins
- **Live Control Panel** - Monitor all teams in real-time
- **Cash Management** - Add/deduct cash from any team
- **Power-up Distribution** - Drop power-ups to specific teams
- **Level Control** - Unlock levels for all teams
- **Presentation Scoring** - Score final presentations
- **Announcements** - Broadcast messages to all teams

## 🎮 Game Levels

### Level 1: Entry Arena
- Logic Puzzles
- AI Detection challenges
- Tech Guessing games
- Auto cash rewards on completion

### Level 2: Skill Arenas
- **Brain.exe** (High Cash) - Complex algorithms
- **Build Without Code** (Mid Cash) - No-code tools
- **Prompt Wars** (Low Cash) - AI prompting
- Wrong answers deduct cash!

### Level 3: Tech Heist
- Select a target team
- Break into their "compound" (Python basics)
- Crack the safe (3 attempts, time limit)
- Success = Steal 50% of their cash
- Failure = Lose 30% to the defender

### Level 4: Grand Showdown
- Problem statement revealed
- Submit your solution
- 2-minute presentation timer
- Admin scoring panel

## 💫 Power-ups

| Power-up | Effect |
|----------|--------|
| Guardian Angel | Reduces enemy heist time by 30s |
| Double Cash | Next challenge gives 2x reward |
| Shield | Blocks one incoming heist |
| Hint Master | Reveals challenge hint |
| Time Freeze | Adds 60s to current timer |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
cd <project-root>

# Install dependencies
npm install
cd client && npm install && cd ..

# Start the development servers
npm run dev
```

The app will start:
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

### Demo Credentials

**Team Access Codes:**
- `TEAM001` - Cyber Wolves
- `TEAM002` - Digital Pirates
- `TEAM003` - Neon Raiders
- `TEAM004` - Shadow Coders
- `TEAM005` - Quantum Thieves

**Admin Password:** `admin123`

## 🏗 Project Structure

```
<project-root>/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Page components
│   │   │   └── levels/    # Level-specific pages
│   │   ├── App.jsx        # Main app component
│   │   └── index.css      # Global styles
│   └── public/            # Static assets
├── server/
│   └── index.js           # Express + Socket.io server
└── package.json           # Root package.json
```

## 🎨 Theme & Design

- **Dark mode** by default
- **Neon accents** - Purple (#9b4dca), Pink (#ff1493), Cyan (#00ffff)
- **Criminal/heist typography** - Orbitron, JetBrains Mono
- **Smooth animations** - Framer Motion
- **Mobile responsive** - Works on all devices

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
JWT_SECRET=your-secret-key
ADMIN_PASSWORD=your-admin-password
PORT=3001
```

### Customizing Challenges

Edit the `challenges` object in `server/index.js` to add/modify questions:

```javascript
const challenges = {
  level1: {
    logic: [
      { id: 'l1_1', question: 'Your question?', answer: 'answer', reward: 500, hint: 'Hint text' },
      // Add more...
    ],
    // ... other zones
  },
  // ... other levels
};
```

## 📱 Screenshots

The application features:
- GTA Vice City inspired landing page
- Neon-glow team dashboard
- Real-time animated leaderboard
- Heist alert modals with sound effects
- Admin control panel with live monitoring

## 🛠 Tech Stack

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Framer Motion
- Socket.io Client
- Lucide Icons

**Backend:**
- Node.js
- Express
- Socket.io
- JWT Authentication

## 📝 Event Setup Guide

1. **Before the event:**
   - Create team accounts via admin panel
   - Customize challenge questions
   - Test all levels work correctly
   - Prepare team access codes to distribute

2. **During the event:**
   - Use admin panel to control level progression
   - Monitor leaderboard in real-time
   - Drop power-ups to create excitement
   - Send announcements for updates

3. **Final round:**
   - Enable Level 4 for all teams
   - Use presentation timer for each team
   - Score presentations via admin panel
   - Announce final results from leaderboard

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

---

Built with 💜 for GDG Hackathon Events
