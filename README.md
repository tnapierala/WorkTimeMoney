# 📱 WorkTimeMoney

A lightweight **time‑tracking** app built with **Expo** and **React Native**.

---

## ✨ Main Features
- **🛠️ Onboarding flow** – guides first‑time users through a brief setup.
- **🔐 Authentication** – Firebase auth integration with automatic session handling.
- **🎨 Theme support** – dark/light mode powered by a custom `ThemeContext`.
- **⏳ Loading indicator** – shows a spinner while the app initializes.
- **🔀 Responsive navigation** – redirects based on auth state and onboarding status.

---

## 🚀 Getting Started
```bash
# Clone the repository
git clone "https://github.com/tnapierala/WorkTimeMoney"
cd WorkTimeMoney

# Install dependencies
npm install

# Run the app (Expo development server)
npm run dev
# or:
npx expo start
```
The app will open in the **Expo Go** client (iOS/Android) or in a web browser.

---

## ⚙️ Configuration
1. **Firebase** – copy `config/firebaseConfig.example.ts` to `config/firebaseConfig.ts` and fill in your Firebase project credentials.
2. **AsyncStorage** – no extra setup needed; onboarding flag is stored locally.
3. **Theme** – customize colors in `context/ThemeContext.tsx` if desired.

### 🗄️ Database / Firebase Configuration
Create the local config file (it is ignored by Git):
```bash
cp config/firebaseConfig.example.ts config/firebaseConfig.ts
```
Edit `config/firebaseConfig.ts` and add your Firebase credentials:
```ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:      "YOUR_API_KEY",
  authDomain:  "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:   "YOUR_PROJECT_ID",
  storageBucket:"YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:       "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
```
Enable **Authentication** (e.g., Email/Password) and **Firestore** in the Firebase console.

---

## 🛠️ How to Use the App
1. **Launch** the app on your device or emulator.
2. **Onboarding** – on first launch you’ll be taken through a short onboarding flow where you can set your preferred theme.
3. **Sign‑In / Register** – use the login or register screens to create an account (Firebase Auth).
4. **Track Time** – after signing in you’ll see the main tab view where you can start, pause, and stop timers for different tasks.
5. **View History** – the `History` tab shows a list of recorded sessions with timestamps and durations.
6. **Settings** – access the settings screen to toggle dark/light mode, sign out, or clear onboarding data.

---

## 📚 Compatibility & Development
- **Platforms**: iOS 14+, Android 8.0+ (tested on iPhone 13, Pixel 6, Pixel 10 Pro, OnePlus 8 Pro).
- **Expo SDK**: 50 (or later). Ensure you have the latest Expo CLI (`npm i -g expo-cli`).
- **Node.js**: v18 or newer.
- **Development**: Run `npm run dev` for hot‑reloading. Use React Native Debugger or Flipper for debugging.

---

## ✍️ Author
**Tomasz Napierala** – [tnapierala](https://github.com/tnapierala)

---

## 📖 Resources & Documentation
- **Expo Documentation** – https://docs.expo.dev/
- **React Native** – https://reactnative.dev/docs/getting-started
- **Firebase Web SDK** – https://firebase.google.com/docs/web/setup
- **React Navigation** – https://reactnavigation.org/docs/getting-started
- **AsyncStorage** – https://github.com/react-native-async-storage/async-storage

---

## 🛠️ Troubleshooting & How to Solve Common Issues
- **Expo CLI not found** – install globally with `npm i -g expo-cli` and ensure it’s in your PATH.
- **Metro bundler hangs** – clear caches: `expo start -c` or `npm start -- --reset-cache` or `npx expo start --clear` if new changes in CSS don't load.
- **Firebase auth errors** – verify that the API key and authDomain in `firebaseConfig.ts` match the Firebase project settings.
- **App stuck on loading screen** – check that `config/firebaseConfig.ts` exists and is correctly exported; also ensure AsyncStorage is not blocked.
- **Android build fails** – make sure Android SDK and Java 11+ are installed; run `expo doctor` to identify missing dependencies.
- **iOS simulator crashes** – update Xcode to the latest version and run `pod install` inside the `ios` folder if using bare workflow.
- **Network requests blocked** – if you’re behind a corporate proxy, set `HTTPS_PROXY` and `HTTP_PROXY` environment variables.

---

## 🚀 Future Development (Roadmap)
- **Export/Import data** – allow users to back up their time logs to CSV or JSON and import them later.
- **Team collaboration** – shared projects where multiple users can log time against the same tasks.
- **Analytics dashboard** – visual charts (daily/weekly/monthly) showing time distribution per project.
- **Push notifications** – remind users to start/stop timers or to take breaks.
- **Customizable tags & categories** – let users create their own task categories and colour‑code them.
- **Offline sync** – store logs locally and sync automatically when the device regains connectivity.
- **Integration with calendar services** – import events from Google Calendar or Outlook to pre‑populate tasks.

---

*Happy coding!*