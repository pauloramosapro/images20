import { useState, useEffect } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/zcbs.png';
import FunctieResizer from './components/Functie_resizer.jsx';
import './App.css';
import { RecordsProvider } from './components/RecordsContext.jsx';
import { checkLoginStatus, loadRuntimeConfig } from './config.js';
import FirstTimeSetup from './components/FirstTimeSetup.jsx';
import Debug from './components/Debug.jsx';




function App() {
  const isDebugRoute = (() => {
    if (typeof window === 'undefined') return false;
    const href = window.location.href || '';
    // Ondersteun pad /zcbs_frontend/debug (vooral handig in dev)
    if (href.includes('/zcbs_frontend/debug')) return true;

    // In productie kan de server alleen /zcbs_frontend/ kennen.
    // Gebruik dan een queryparameter, bijv. /zcbs_frontend/?debug=1
    const params = new URLSearchParams(window.location.search);
    const debugFlag = params.get('debug');
    return debugFlag === '1';
  })();

  if (isDebugRoute) {
    return <Debug />;
  }

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [count, setCount] = useState(0);
  const [isFirstStart, setIsFirstStart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Controleer de inlogstatus bij het laden van de component
  //Comment deze useEffect om te testen zonder login
  // useEffect(() => {
   
  //   const loggedIn = checkLoginStatus();
  //   setIsLoggedIn(loggedIn);
    
  //   // Log de inlogstatus in de console
  //   console.log('App geladen - Ingelogd:', loggedIn);
  // }, []);

  // Controleer login_exception uit config
  const [loginException, setLoginException] = useState(false);
  
  // Laad de configuratie bij het opstarten
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isSetupComplete = urlParams.get('setup_complete') === '1';
    
    // Clear any cached config when the app loads
    if (window.__APP_CONFIG_LOADED__) {
      delete window.__APP_CONFIG_LOADED__;
    }
    
    // If we're coming back from setup, clear the parameter and force reload
    if (isSetupComplete) {
      // Create a clean URL without the setup_complete parameter
      const cleanUrl = window.location.pathname + 
        window.location.search
          .replace(/[?&]setup_complete=1(&|$)/, '')
          .replace(/^&/, '?');
      
      // Replace the URL without the parameter
      window.history.replaceState({}, '', cleanUrl);
      
      // Force a hard reload with cache busting
      window.location.href = cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
      return;
    }
    
    const loadConfig = async () => {
      try {
        //console.log('Loading application configuration...');
        
        // Clear any cached config and force a fresh load
        if (window.__APP_CONFIG_LOADED__) {
          delete window.__APP_CONFIG_LOADED__;
        }
        
        // Ensure we have the latest config values with cache-busting
        const currentConfig = await loadRuntimeConfig();
        
        // Log the loaded configuration
        //console.log('Configuration loaded:', {
        //   FIRST_START: currentConfig.FIRST_START,
        //   API_BASE: currentConfig.API_BASE,
        //   PUBLIC_PATH: currentConfig.PUBLIC_PATH,
        //   LOGIN_EXCEPTION: currentConfig.LOGIN_EXCEPTION
        // });
        
        // Mark config as loaded to prevent duplicate loading
        window.__APP_CONFIG_LOADED__ = true;
        
        // Check if this is the first start (handle both string '1' and number 1)
        const isFirstStart = currentConfig.FIRST_START == 1; // Use loose equality to catch both '1' and 1
        //console.log('Is first start?', isFirstStart);
        
        if (isFirstStart) {
          //console.log('First start detected, showing setup wizard');
          setIsFirstStart(true);
        }
        
        setLoginException(currentConfig.LOGIN_EXCEPTION || false);
        
        // Als login exception actief is, zet isLoggedIn op true
        if (currentConfig.LOGIN_EXCEPTION) {
          //console.log('Login exception active, auto-login');
          setIsLoggedIn(true);
        } else {
          // Anders voer de normale login check uit
          //console.log('Performing normal login check');
          const loggedIn = checkLoginStatus();
          setIsLoggedIn(loggedIn);
        }
        
        // Zorg ervoor dat de laadstatus altijd wordt uitgeschakeld
        setIsLoading(false);
      } catch (error) {
        console.error('Fout bij laden config:', error);
        setIsLoading(false); // Zorg ervoor dat de laadstatus wordt uitgeschakeld bij fouten
      }
    };
    
    loadConfig();
  }, []);

  if (isLoading) {
    return <div>Bezig met laden...</div>;
  }

  if (isFirstStart) {
    return <FirstTimeSetup onSetupComplete={(publicPath = '/') => {
      // The FirstTimeSetup component now handles the redirect after saving the config
      // This prevents any race conditions with config loading
      //console.log('Setup complete, redirecting to:', publicPath);
    }} />;
  }

  return (
    <>
      {/* Toon de inlogstatus in de console */}
      {/*console.log('Huidige inlogstatus:', isLoggedIn ? 'Ingelogd' : 'Uitgelogd', 'Login exception:', loginException)*/}
      
      <FunctieResizer />
      
      {/* Optioneel: Toon de status in de UI */}
      <div style={{ position: 'fixed', bottom: '10px', right: '10px', padding: '5px 10px', 
                   background: isLoggedIn ? '#4CAF50' : '#f44336', color: 'white', 
                   borderRadius: '4px', fontSize: '12px', zIndex: 1000 }}>
        Status: {isLoggedIn ? 'Ingelogd' : 'Uitgelogd'}
      </div>
    </>
  )
}

export default App
