import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import LanguageSwitcher from './components/LanguageSwitcher';
import HeroSection from './components/HeroSection';
import FeatureHighlights from './components/FeatureHighlights';
import DemoSnapshot from './components/DemoSnapshot';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import WeatherDashboard from './components/weather/WeatherDashboard';
import YieldPrediction from './components/yield/YieldPrediction';
import CropMonitoring from './components/monitoring/CropMonitoring';
import MandiDashboard from './components/mandi/MandiDashboard';
import MandiInsights from './components/mandi/MandiInsights';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import Dashboard from './components/Dashboard';
import { isAuthenticated } from './services/authService';
import DiseaseDetection from './components/DiseaseDetection';

function App() {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  
  // Sync i18n with currentLanguage state
  useEffect(() => {
    if (i18n.language !== currentLanguage) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [currentLanguage, i18n]);
  
  // Sync currentLanguage with i18n language changes (from LanguageSwitcher)
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      if (lng !== currentLanguage) {
        setCurrentLanguage(lng);
      }
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [currentLanguage, i18n]);
  const [currentPage, setCurrentPage] = useState<'home' | 'weather' | 'mandi' | 'insights' | 'yield' | 'monitor' | 'login' | 'signup' | 'dashboard' | 'disease'>(() => {
    const path = window.location.pathname;
    if (path === '/login') return 'login';
    if (path === '/signup') return 'signup';
    if (path === '/yield') return 'yield';
    if (path === '/monitor') return 'monitor';
    if (path === '/disease') return 'disease';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/home' || path === '/') return 'home';
    return 'home';
  });

  useEffect(() => {
    (window as any).appSetPage = (p: any) => setCurrentPage(p as any);
    return () => { try { delete (window as any).appSetPage; } catch (_) {} };
  }, []);

  useEffect(() => {
    // reflect page in URL path for simple navigation
    const targetPath = currentPage === 'home' ? '/' : `/${currentPage}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  }, [currentPage]);

  const handleLanguageChange = (language: string) => {
    setCurrentLanguage(language);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return (
          <LoginPage 
            onSuccess={() => setCurrentPage('home')} 
            switchToSignup={() => setCurrentPage('signup')} 
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            onGoHome={() => setCurrentPage('home')}
          />
        );
      case 'signup':
        return (
          <SignupPage 
            onSuccess={() => setCurrentPage('home')} 
            switchToLogin={() => setCurrentPage('login')} 
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
            onGoHome={() => setCurrentPage('home')}
          />
        );
      case 'weather':
        return <WeatherDashboard />;
      case 'disease':
        return <DiseaseDetection />;
      case 'mandi':
        return <MandiDashboard language={currentLanguage as any} />;
      case 'insights':
        return <MandiInsights />;
      case 'yield':
        return <YieldPrediction />;
      case 'monitor':
        return <CropMonitoring />;
      case 'home':
      default:
        return (
          <>
            <HeroSection 
              currentLanguage={currentLanguage}
              onLoginSignup={() => setCurrentPage('login')}
              onExplore={() => setCurrentPage('weather')}
            />
            <FeatureHighlights currentLanguage={currentLanguage} />
            <DemoSnapshot 
              currentLanguage={currentLanguage} 
              onNavigateToWeather={() => setCurrentPage('weather')}
            />
          </>
        );
    }
  };

  const isAuthPage = currentPage === 'login' || currentPage === 'signup';
  return (
    <div className="min-h-screen bg-white">
      {!isAuthPage && <LanguageSwitcher />}
      {!isAuthPage && (
        <Navbar 
          currentLanguage={currentLanguage} 
          onLanguageChange={handleLanguageChange}
          currentPage={currentPage}
          onPageChange={(p: string) => setCurrentPage(p as any)}
        />
      )}
      <main>
        {/* If user navigates to dashboard without login, show a lightweight login CTA */}
        {currentPage === 'dashboard' && !isAuthenticated() && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 px-4 py-3 mx-auto max-w-7xl mt-20 rounded-lg flex items-center justify-between">
            <div className="text-sm">You're viewing a demo of the dashboard. For full access, please login.</div>
            <button
              onClick={() => setCurrentPage('login')}
              className="ml-4 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
            >
              Go to Login
            </button>
          </div>
        )}
        {currentPage === 'dashboard' ? <Dashboard /> : renderPage()}
      </main>
      {!isAuthPage && (
        <Footer 
          currentLanguage={currentLanguage} 
          onLanguageChange={handleLanguageChange} 
        />
      )}
      {!isAuthPage && (
        <Chatbot currentLanguage={currentLanguage} />
      )}
    </div>
  );
}

export default App;
