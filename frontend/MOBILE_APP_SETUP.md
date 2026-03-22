# 📱 Mobile App Setup Guide - The Mughals Dastarkhwan

## ✅ **Setup Complete!**

Your React website has been successfully converted to a native Android app using Capacitor!

---

## 📂 **Project Structure**

```
frontend/
├── android/              ← Native Android project
├── build/                ← React production build
├── capacitor.config.ts   ← Capacitor configuration
└── src/                  ← React source code
```

---

## 🚀 **Next Steps - Build & Test Android App**

### **Option 1: Open in Android Studio** (Recommended)

1. **Install Android Studio** (if not installed)
   - Download from: https://developer.android.com/studio
   - Install with default settings
   - Install Android SDK (API 33 or higher)

2. **Open the Android Project**
   ```bash
   cd frontend
   npx cap open android
   ```
   This will open the project in Android Studio

3. **Run on Emulator or Real Device**
   - In Android Studio, click the green ▶️ **Run** button
   - Select an emulator or connected Android device
   - Wait for the app to build and install

4. **Generate APK (Release Build)**
   - In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

### **Option 2: Build APK via Command Line**

```bash
cd frontend/android
./gradlew assembleDebug
```

APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔧 **Important Configuration**

### **Backend API URL**
The app is configured to connect to:
```
http://192.168.29.128:8000
```

**⚠️ Make sure:**
1. Your backend server is running on port 8000
2. Your phone/emulator is on the same WiFi network
3. Backend allows connections from mobile (check CORS settings)

### **To Change Backend URL:**
Edit `frontend/.env.production`:
```env
REACT_APP_BACKEND_URL=http://YOUR_IP:8000
```

Then rebuild:
```bash
npm run build
npx cap sync
```

---

## 📱 **App Features**

✅ Full restaurant website as native Android app
✅ Offline splash screen
✅ Native navigation and back button support
✅ Works exactly like the web version
✅ Can access device features (camera, notifications, etc.)

---

## 🎨 **Customization**

### **App Icon**
Replace these files in `android/app/src/main/res/`:
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

### **Splash Screen**
Edit `capacitor.config.ts`:
```typescript
SplashScreen: {
  launchShowDuration: 2000,
  backgroundColor: "#ECEC75",  // Your brand color
}
```

### **App Name**
Edit `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">The Mughals Dastarkhwan</string>
```

---

## 🐛 **Troubleshooting**

### **Build Errors**
```bash
cd frontend
npm run build
npx cap sync
```

### **API Not Connecting**
1. Check backend is running: `http://192.168.29.128:8000/docs`
2. Verify phone is on same WiFi
3. Check backend CORS settings allow mobile connections

### **App Crashes**
Check Android Studio Logcat for error messages

### **Update App After Code Changes**
```bash
cd frontend
npm run build        # Rebuild React app
npx cap sync         # Sync to native project
npx cap open android # Open in Android Studio and run
```

---

## 📦 **Publishing to Google Play Store**

1. **Create signed release build**
   - Generate keystore
   - Update `android/app/build.gradle` with signing config
   - Build release APK: `./gradlew assembleRelease`

2. **Create Google Play Console account**
   - Pay $25 one-time fee
   - Create app listing
   - Upload APK
   - Submit for review

---

## 🍎 **iOS App (Optional)**

To build for iOS:
```bash
npx cap add ios
npm run build
npx cap sync
npx cap open ios
```

**Requirements:**
- macOS computer
- Xcode installed
- Apple Developer account ($99/year)

---

## 📞 **Support**

For issues:
1. Check Android Studio Logcat
2. Run `npx cap doctor` for diagnostics
3. Visit Capacitor docs: https://capacitorjs.com/docs

---

## ✨ **You're All Set!**

Run this command to test your mobile app:
```bash
cd frontend
npx cap open android
```

Then click the green play button in Android Studio! 🚀
