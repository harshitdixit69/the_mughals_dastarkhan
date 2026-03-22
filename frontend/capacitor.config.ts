import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mughals.dastarkhwan',
  appName: 'The Mughals Dastarkhwan',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ECEC75",
      androidSplashResourceName: "splash",
      iosSplashResourceName: "Default"
    }
  }
};

export default config;
