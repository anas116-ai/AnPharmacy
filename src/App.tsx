import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { ToastProvider } from './components/ui/toast';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import LicenseActivation from './components/LicenseActivation';
import LoginScreen from './components/LoginScreen';
import MainShell from './components/MainShell';
import { initializeBrowserAPI } from './lib/browserApi';

type AppStage = 'splash' | 'license' | 'login' | 'main';

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
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.getLicenseStatus();
        setLicenseStatus(result.status);
        setDeviceId(result.deviceId || '');
        setLicenseChecked(true);

        if (result.status === 'not_activated' || result.status === 'invalid') {
          setStage('license');
        } else {
          setStage('login');
        }
      } catch {
        setLicenseStatus('active');
        setLicenseChecked(true);
        setStage('login');
      }
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
