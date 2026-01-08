# 📱 WorkTimeMoney

A lightweight **calculate** your earnings based on hours worked and your hourly rate built app with **Expo** and **React Native**.

---

## ✨ Main features
- **🛠️ Onboarding flow** – guides first‑time users through a brief setup.
- **🔐 Authentication** – Firebase auth integration with automatic session handling.
- **🎨 Theme support** – dark/light mode powered by a custom `ThemeContext`.
- **⏳ Loading indicator** – shows a spinner while the app initializes.
- **🔀 Responsive navigation** – redirects based on auth state and onboarding status.
- **💰 Calculate amount of money** – compute earnings based on hours worked and hourly rate.
- **💾 Save data to database** – persist records in Firestore.
- **📊 View history** – display logged hours and earnings per month.
- **👤 Profile** – view and edit user profile information.

---

## 🚀 Getting started
```bash
# Clone the repository
git clone "https://github.com/tnapierala/WorkTimeMoney"
cd WorkTimeMoney
```
```bash
# Install dependencies
npm install
```
```bash
# Run the app (Expo development server)
npm run dev
```
```bash
# or:
npx expo start
```
The app will open in the **Expo Go** client (iOS/Android) or in a web browser.

---

## ⚙️ Configuration
1. **Firebase** – copy `config/firebaseConfig.example.ts` to `config/firebaseConfig.ts` and fill in your Firebase project credentials.
2. **AsyncStorage** – no extra setup needed; onboarding flag is stored locally.
3. **Theme** – customize colors in `context/ThemeContext.tsx` if desired.

### 🗄️ Database / Firebase configuration
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

## 🛠️ How to use the app
1. **🚀 Launch** the app on your device or emulator.
2. **🧭 Onboarding** – first launch presents a short onboarding process explaining the app.
3. **🔐 Sign‑In / Register** – create or log into your account via Firebase Auth.
4. **⏱️ Track Time** – add hours worked and hourly rate, then save to the database.
5. **📊 View History** – see a summary of logged hours and earned money per month.
6. **👤 Profile** – manage your profile, toggle dark/light mode, sign out, or clear onboarding data.

---

## 📚 Compatibility & Development
- **Platforms**: iOS 14+, Android 8.0+ (tested on Pixel 10 Pro, OnePlus 8 Pro).
- **Expo SDK**: 50 (or later). Ensure you have the latest Expo CLI (`npm i -g expo-cli`).
- **Node.js**: v18 or newer.
- **Development**: Run `npm run dev` for hot‑reloading. Use React Native Debugger or Flipper for debugging.

---

## ✍️ Author
**Tomasz Napierala** – [tnapierala](https://github.com/tnapierala)

---

## 📖 Resources & Documentation
- **Expo Documentation** – https://docs.expo.dev/
- **React Native** – https://reactnative.dev/docs/getting-started
- **Firebase Web SDK** – https://firebase.google.com/docs/web/setup
- **React Navigation** – https://reactnavigation.org/docs/getting-started
- **AsyncStorage** – https://github.com/react-native-async-storage/async-storage

---

## 🛠️ Troubleshooting & How to solve common issues
- **Expo CLI not found** – install globally with `npm i -g expo-cli` and ensure it’s in your PATH.
- **Metro bundler hangs** – clear caches: `expo start -c` or `npm start -- --reset-cache` or `npx expo start --clear` if new changes in CSS don't load.
- **Firebase auth errors** – verify that the API key and authDomain in `firebaseConfig.ts` match the Firebase project settings.
- **App stuck on loading screen** – check that `config/firebaseConfig.ts` exists and is correctly exported; also ensure AsyncStorage is not blocked.
- **Android build fails** – make sure Android SDK and Java 11+ are installed; run `expo doctor` to identify missing dependencies.
- **iOS simulator crashes** – update Xcode to the latest version and run `pod install` inside the `ios` folder if using bare workflow.
- **Network requests blocked** – if you’re behind a corporate proxy, set `HTTPS_PROXY` and `HTTP_PROXY` environment variables.

---

## 🚀 Future development (Roadmap)
- **📤 Export/Import data** – allow users to back up their time logs to CSV or JSON and import them later.
- **👥 Team collaboration** – shared projects where multiple users can log time against the same tasks.
- **📊 Analytics dashboard** – visual charts (daily/weekly/monthly) showing time distribution per project.
- **🔔 Push notifications** – remind users to save data or make calculations.
- **🏷️ Customizable tags & categories** – let users create their own task categories and colour‑code them.
- **🌐 Offline sync** – store logs locally and sync automatically when the device regains connectivity.
- **📅 Integration with calendar services** – import events from Google Calendar or Outlook to pre‑populate tasks.

---

*Happy coding!*
