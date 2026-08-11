import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { ToastProvider } from './components/ui/toast';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import LicenseActivation from './components/LicenseActivation';
import LoginScreen from './components/LoginScreen';
import LandingPage from './components/LandingPage';
import MainShell from './components/MainShell';
import { initializeBrowserAPI } from './lib/browserApi';

type AppStage = 'splash' | 'landing' | 'license' | 'login' | 'main';

export default function App() {
  const { isAuthenticated, licenseStatus, setLicenseStatus, setDeviceId, setLicenseChecked } = useAuthStore();
  const [stage, setStage] = useState<AppStage>('splash');

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
        return <LoginScreen />;
      default:
        return <LoginScreen />;
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
