import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { ToastProvider } from './components/ui/toast';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import LicenseActivation from './components/LicenseActivation';
import LoginScreen from './components/LoginScreen';
import LandingPage from './components/LandingPage';
import MainShell from './components/MainShell';
import { initializeBrowserAPI } from './lib/browserApi';
// Importing the appearance store applies the persisted accent color + density
// (data-accent / data-density) to <html> before the first paint.
import './stores/appearanceStore';

type AppStage = 'splash' | 'landing' | 'license' | 'login' | 'main';

/** Pre-login screen (landing / sign-in) survives a refresh. */
const STAGE_KEY = 'anpharmacy.stage';

function readSavedStage(): AppStage {
  try {
    const saved = sessionStorage.getItem(STAGE_KEY);
    if (saved === 'login' || saved === 'landing') return saved;
  } catch {
    // storage unavailable — start from the splash screen
  }
  return 'splash';
}

export default function App() {
  const { isAuthenticated, licenseStatus, setLicenseStatus, setDeviceId, setLicenseChecked } = useAuthStore();
  const [stage, setStage] = useState<AppStage>(readSavedStage);
  const wasAuthenticated = useRef(isAuthenticated);

  // Keep the pre-login screen across refreshes; clear it once signed in.
  useEffect(() => {
    try {
      if (stage === 'landing' || stage === 'login') sessionStorage.setItem(STAGE_KEY, stage);
      else if (stage === 'splash') sessionStorage.removeItem(STAGE_KEY);
    } catch {
      // ignore
    }
  }, [stage]);

  // Signing out lands on the sign-in screen rather than the marketing page.
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) setStage('login');
    wasAuthenticated.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    // Initialize browser-compatible API layer if Electron is not available
    initializeBrowserAPI();
    
    // Initialize database on app start
    if (window.electronAPI) {
      window.electronAPI.dbInit().catch(() => {
        // Silently handle init errors
      });
    }
  }, []);

  const handleSplashComplete = async () => {
    setStage('landing');
  };

  const handleStart = () => {
    if (window.electronAPI) {
      (async () => {
        try {
          const result = await window.electronAPI.getLicenseStatus();
          setLicenseStatus(result.status);
          setDeviceId(result.deviceId || '');
          setLicenseChecked(true);
          setStage(result.status === 'not_activated' || result.status === 'invalid' ? 'license' : 'login');
        } catch {
          setLicenseStatus('active');
          setLicenseChecked(true);
          setStage('login');
        }
      })();
    } else {
      setLicenseStatus('active');
      setLicenseChecked(true);
      setStage('login');
    }
  };

  const handleLicenseActivated = () => {
    setStage('login');
  };

  const renderContent = () => {
    if (isAuthenticated) {
      return <MainShell />;
    }

    switch (stage) {
      case 'splash':
        return <SplashScreen onComplete={handleSplashComplete} />;
      case 'landing':
        return <LandingPage onStart={handleStart} />;
      case 'license':
        return <LicenseActivation onActivated={handleLicenseActivated} />;
      case 'login':
        return <LoginScreen onBack={() => setStage('landing')} />;
      default:
        return <LoginScreen onBack={() => setStage('landing')} />;
    }
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        {renderContent()}
      </ToastProvider>
    </ErrorBoundary>
  );
}
