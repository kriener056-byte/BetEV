# BetEV

Bet EV is a sports betting optimization app that helps users find the most valuable parlays across major sportsbooks.  
The app scans live odds, calculates expected value (EV), and builds conservative or aggressive parlay recommendations tailored to user risk preferences.  

---

## 📖 Features

- 🔍 **Live Odds Integration** – Pulls real-time odds from DraftKings (starting provider).
- 📊 **Expected Value Calculator** – Automatically runs EV across single bets and parlays.
- 🏈 **League Support** – NFL & NCAA Football at launch, with NBA, NCAA Basketball, NHL, MLB, NCAA Baseball, and Soccer planned.
- 🧩 **Same-Game Parlay X (SGPx)** – Build optimized SGPx combos with props and game lines.
- ⚙️ **Risk Modes** – Default “Conservative” mode with adjustable risk profiles.
- 🎨 **Clean UI** – White and blue theme with green accents for clarity and emphasis.
- 🔐 **Subscription Model** – $49.99/month, with promo code support (to be added in backend).

---

## 🛠 Tech Stack

- **Frontend:** React (with Tailwind for styling, shadcn/ui components)  
- **Backend:** Node.js / Express (Python optional for data-heavy EV calcs)  
- **Database:** PostgreSQL (recommended)  
- **API:** DraftKings Odds API (with plans for expansion to other books)  
- **Auth & Payments:** Stripe (for subscriptions), Google Pay & Apple Pay integration planned  
- **Hosting:** Vercel / AWS / DigitalOcean (flexible deployment)  

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- PostgreSQL running locally or on a cloud instance
- API key (DraftKings odds API) – currently using: `257ca23142fe54645a5eb86e287a728d`

### Installation
```bash
# Clone the repo
git clone https://github.com/yourusername/bet-ev.git

# Navigate into project directory
cd bet-ev

# Install dependencies
npm install

# Add environment variables
cp .env.example .env
# Edit .env with your API keys and database credentials

# Run dev server
npm run dev

