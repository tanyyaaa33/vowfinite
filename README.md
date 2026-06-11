# VowFinity

A React Native couples app built with Expo. Partners pair via invite codes, play daily connection games, earn shared points, and maintain streaks together.

## Tech Stack

- **Expo SDK 56** + React Native 0.85
- **Firebase** — Auth, Firestore, Storage (no custom Node.js backend)
- **React Navigation** — tabs + stack
- **Expo Notifications** — push via Expo Push API

## Getting Started

```bash
npm install
npm start          # Expo dev server
npm run ios        # iOS simulator
npm run android    # Android emulator
```

### Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Email/Password** auth, **Firestore**, and **Storage**
3. Deploy security rules: `firebase deploy --only firestore:rules`
4. Config lives in `src/utils/firebase.js`

### Push Notifications

Replace the placeholder EAS `projectId` in `app.json` with your real Expo project ID, then build with EAS (Expo Go has limited push support).

## App Structure

```
src/
├── screens/
│   ├── auth/         Splash, Login (forgot password)
│   ├── onboarding/   6-step profile + invite code + partner pronouns
│   ├── main/         Home, Games, Surprise, Partner, Profile
│   └── games/        5 games (13 screens)
├── components/       Shared UI + per-game widgets
├── hooks/            useCouple, useGamesHub, useGameCompletion, usePartnerProfile
├── utils/            firebase, points, notifications, per-game logic
└── constants/        gameData, colors, fonts
```

## Games

| Game | Flow | Points | Async? |
|------|------|--------|--------|
| Daily Question | Answer → Reveal | 15 | Yes — answer anytime, reveal when both done |
| Who's More Likely | 5 questions → Reveal | 10 | Yes |
| He's a 10 But | Create → Rate → Reveal | 10 | Yes — send anytime, partner rates later |
| Dare Drop | Dare → Complete → Reaction | 20 | Solo daily dare; skip limit 2/week (−5 pts) |
| Voice Bomb | Record → Listen → Reply | 20 + 10 reply | Yes |

## Gamification

- **Streak:** 3 game activities per day
- **Freeze tokens:** 2/month to protect streak
- **Partner Sync bonus:** +10 pts when couple hits 3 activities in a day
- **Levels:** New Love → Soulmates (500 pts)
- **Unlocks:** Tracked on profile (features coming soon)

## Security

- `firestore.rules` restricts reads/writes to couple members
- Points use `pointsClaimed` dedup keys — prevents double-awarding when both partners open reveal

## Scripts

```bash
node scripts/test-utils.mjs   # Run utility smoke tests
```

## License

See [LICENSE](LICENSE).
