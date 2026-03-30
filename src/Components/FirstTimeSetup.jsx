import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './FirstTimeSetup.css';
import { getRecordIdentifiers } from '../utils/configParser';
import packageJson from '../../package.json';

function isPhpVersionAtLeast(versionString, minMajor, minMinor) {
  if (!versionString || typeof versionString !== 'string') return false;
  const m = versionString.trim().match(/^(\d+)(?:\.(\d+))?/);
  if (!m) return false;
  const major = Number(m[1]);
  const minor = Number(m[2] || 0);
  if (Number.isNaN(major) || Number.isNaN(minor)) return false;
  if (major !== minMajor) return major > minMajor;
  return minor >= minMinor;
}

// Draggable item component
const DraggableItem = ({ id, index, moveItem, children }) => {
  const ref = useRef(null);
  
  const [{ isDragging }, drag] = useDrag({
    type: 'IMAGE_BANK',
    item: () => ({ id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'IMAGE_BANK',
    hover: (item, monitor) => {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) return;
      
      // Get the bounding rectangle of the hovered item
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      if (!hoverBoundingRect) return;
      
      // Get vertical middle of the hovered item
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Get mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      
      // Get pixels to the top of the hovered item
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;
      
      // Time to actually perform the action
      if (moveItem) {
        moveItem(dragIndex, hoverIndex);
      }
      
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const opacity = isDragging ? 0.5 : 1;
  
  // Use the drag and drop refs
  const dragDropRef = useCallback(
    (node) => {
      drag(drop(node));
      ref.current = node;
    },
    [drag, drop]
  );
  
  return (
    <div ref={dragDropRef} style={{ opacity, cursor: 'move', marginBottom: '8px' }}>
      {children}
    </div>
  );
};

// Main component with DnD provider
const DnDContainer = ({ children }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      {children}
    </DndProvider>
  );
};
const FirstTimeSetup = ({ onSetupComplete }) => {
  const [apiUrl, setApiUrl] = useState(window.location.origin);
  const [uploadPath] = useState('');
  const [beeldbanken, setBeeldbanken] = useState([{naam: 'demo', format: '0'}]); // Default to [{naam: 'demo', format: '0'}]
  const [newBeeldbank, setNewBeeldbank] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(2); // Start directly at step 2 (API config)
  const [backendStatus, setBackendStatus] = useState({ online: false, message: '', version: '', phpVersion: '' });
  const [refreshKey, setRefreshKey] = useState(0); // Nieuwe state voor forceren van herladen
  const [phpMinVersionAlertShown, setPhpMinVersionAlertShown] = useState(false);

  // Add this useEffect to fetch available image banks on component mount
  useEffect(() => {
    const fetchBeeldbanken = async () => {
      try {
        let apiBaseUrl = window.location.origin;
        
        // In development mode, remove the port if it's the default dev server port
        if (process.env.NODE_ENV === 'development') {
          apiBaseUrl = apiBaseUrl.replace(/\/\/([^:]+):\d+$/, '//$1');
        }
        
        const apiUrl = `${apiBaseUrl}/misc/api/zcbs_backend.php?endpoint=/api/beeldbanken`;
        //console.log('Fetching beeldbanken from:', apiUrl);

        let phpVersion = 'Onbekend';
        try {
          const phpInfoUrl = 'http://localhost/zcbs_frontend/phpinfo.php';
          console.log('[FirstTimeSetup] PHP version fetch: start', {
            nodeEnv: process.env.NODE_ENV,
            apiBaseUrl,
            phpInfoUrl
          });

          const phpInfoResponse = await axios.get(phpInfoUrl);
          console.log('[FirstTimeSetup] PHP version fetch: response meta', {
            url: phpInfoUrl,
            status: phpInfoResponse?.status,
            contentType: phpInfoResponse?.headers?.['content-type']
          });
          if (typeof phpInfoResponse?.data === 'string') {
            console.log(
              '[FirstTimeSetup] PHP version fetch: response preview (string)',
              phpInfoResponse.data.slice(0, 200)
            );
          } else {
            console.log('[FirstTimeSetup] PHP version fetch: response preview (non-string)', phpInfoResponse?.data);
          }

          if (phpInfoResponse?.status === 200 && typeof phpInfoResponse?.data === 'string') {
            const versionMatch = phpInfoResponse.data.match(/<h1[^>]*>PHP Version ([^<]+)<\/h1>/i);
            console.log('[FirstTimeSetup] PHP version fetch: regex match', versionMatch);
            phpVersion = versionMatch ? versionMatch[1].trim() : 'Onbekend';
          }

          console.log('[FirstTimeSetup] PHP version fetch: parsed phpVersion', phpVersion);
        } catch (err) {
          console.error('Fout bij ophalen PHP versie:', err);
        }

        if (phpVersion === 'Onbekend') {
          try {
            const phpInfoUrl = 'http://localhost/zcbs_frontend/phpinfojson.php';
            console.log('[FirstTimeSetup] PHP version fetch: fallback start', {
              nodeEnv: process.env.NODE_ENV,
              apiBaseUrl,
              phpInfoUrl
            });

            const phpInfoResponse = await axios.get(phpInfoUrl);
            console.log('[FirstTimeSetup] PHP version fetch: fallback response meta', {
              url: phpInfoUrl,
              status: phpInfoResponse?.status,
              contentType: phpInfoResponse?.headers?.['content-type']
            });
            if (typeof phpInfoResponse?.data === 'string') {
              console.log(
                '[FirstTimeSetup] PHP version fetch: fallback response preview (string)',
                phpInfoResponse.data.slice(0, 200)
              );
            } else {
              console.log('[FirstTimeSetup] PHP version fetch: fallback response preview (non-string)', phpInfoResponse?.data);
            }

            if (phpInfoResponse?.status === 200 && phpInfoResponse?.data?.php_version) {
              phpVersion = phpInfoResponse.data.php_version;
            }

            console.log('[FirstTimeSetup] PHP version fetch: fallback parsed phpVersion', phpVersion);
          } catch (err) {
            console.error('Fout bij ophalen PHP versie via fallback:', err);
          }
        }

        setBackendStatus((prev) => ({
          ...prev,
          phpVersion,
        }));
        
        // Use the hardcoded API key that matches the backend's expected value
        const response = await axios.get(apiUrl, {
          headers: {
            'Accept': 'application/json',
            'X-Node-Env': process.env.NODE_ENV,
            'X-API-Key': 'ZCBSSystemimages2.0' // Hardcoded API key from backend
          },
          validateStatus: function (status) {
            return status < 500; // Resolve only if the status code is less than 500
          }
        });

        //console.log('Beeldbanken API response:', response);

        if (response.data && response.data.success) {
          const healthUrl = `${apiBaseUrl}/misc/api/zcbs_backend.php?endpoint=/api/health`;
          const healthResponse = await axios.get(healthUrl, {
            headers: {
              'Accept': 'application/json',
              'X-API-Key': 'ZCBSSystemimages2.0'
            }
          });

          const version = healthResponse.data?.version || 'Onbekende versie';
                    if (response.data.beeldbanken && response.data.beeldbanken.length > 0) {
            //console.log('Beeldbanken gevonden:', response.data.beeldbanken);
            setBeeldbanken(response.data.beeldbanken);
            setBackendStatus({ 
              online: true, 
              message: 'Backend is online',
              version: version,
              phpVersion: phpVersion
            });
          } else {
            
            // Keep the default 'demo' image bank if none found
            setBeeldbanken([{naam: 'demo', format: '0'}]);
            setBackendStatus({ 
              online: true, 
              message: 'Backend is online',
              version: version,
              phpVersion: phpVersion
            });
          }      } else {
          console.error('Ongeldig antwoord van de server:', response.data);
          setBackendStatus({ online: false, message: 'De Backend bestand is niet goed beschikbaar', phpVersion });
          setError('De Backend bestand is niet goed beschikbaar');
        }
      } catch (err) {
        console.error('Fout bij ophalen beeldbanken:', {
          message: err.message,
          response: err.response ? {
            status: err.response.status,
            statusText: err.response.statusText,
            data: err.response.data
          } : 'No response',
          config: {
            url: err.config?.url,
            method: err.config?.method,
            headers: err.config?.headers
          }
        });
        setBackendStatus((prev) => ({
          ...prev,
          online: false,
          message: 'De Backend bestand is niet goed beschikbaar'
        }));
        setError('De Backend bestand is niet goed beschikbaar');
      }
    };

    fetchBeeldbanken();
  }, []); // Empty dependency array means this runs once on mount

  const isPhpOk = isPhpVersionAtLeast(backendStatus.phpVersion, 8, 0);
  const isPhpTooLow = backendStatus.phpVersion && backendStatus.phpVersion !== 'Onbekend' && !isPhpOk;

  useEffect(() => {
    if (isPhpTooLow && !phpMinVersionAlertShown) {
      setPhpMinVersionAlertShown(true);
      alert('PHP versie moet minimaal 8.0 zijn. Verhoog eerst de PHP versie naar minimaal 8.0 om verder te gaan.');
    }
  }, [isPhpTooLow, phpMinVersionAlertShown]);

  const validateApiUrl = async (url) => {
    try {
      // Voeg http:// toe als er geen protocol is en verwijder eventuele trailing slash
      let fullUrl = url.match(/^https?:\/\//) ? url : `http://${url}`;
      fullUrl = fullUrl.replace(/\/$/, '');
      
      const healthCheckUrl = `${fullUrl}/misc/api/zcbs_backend.php?endpoint=/api/health`;
     
      
      const response = await axios.get(healthCheckUrl, { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
     
      
      if (response.status === 200 && response.data && response.data.status === 'ok') {
        setBackendStatus({ online: true, message: 'Backend is online' });
        return { success: true, message: 'Backend is online' };
      } else {
        setBackendStatus({ online: false, message: 'De Backend bestand is niet goed beschikbaar' });
        return { 
          success: false, 
          message: 'De Backend bestand is niet goed beschikbaar'
        };
      }
    } catch (err) {
      console.error('API validatiefout:', err);
      setBackendStatus({ online: false, message: 'De Backend bestand is niet goed beschikbaar' });
      return { success: false, message: 'De Backend bestand is niet goed beschikbaar' };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Use window.location.origin as the base URL
      let finalApiUrl = window.location.origin;
      
      // In development mode, remove the port if it's the default dev server port
      if (process.env.NODE_ENV === 'development') {
        finalApiUrl = finalApiUrl.replace(/:\d+$/, '');
      }
      
      setApiUrl(finalApiUrl);
      
      // Valideer de API URL met een health check
      const healthCheck = await validateApiUrl(finalApiUrl);
      
      if (!healthCheck.success) {
        setError(`Backend health check mislukt: ${healthCheck.message}`);
        setIsLoading(false);
        return;
      }

      // Als we hier komen, is de health check geslaagd
     

      // Maak de nieuwe configuratie
      let apiBaseUrl = finalApiUrl.replace(/\/$/, ''); // Verwijder trailing slash
      
      // Create config with all required fields
      const config = {
        API_BASE: apiBaseUrl,
        BEELDBANKEN: beeldbanken,
        JPEG_QUALITY: 0.7,
        FONT_SIZE: 18,
        FIRST_START: 0 // Set FIRST_START to 0 to indicate setup is complete
      };
      
      try {
        // Send the configuration to the server to save
        
        const response = await fetch(`${apiBaseUrl}/misc/api/zcbs_backend.php/api/save-config`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Node-Env': process.env.NODE_ENV
          },
          body: JSON.stringify(config)
        });

        // Read the response text only once
        const responseText = await response.text();

       
        
        if (!response.ok) {
          let errorMessage = `Server responded with status: ${response.status}`;
          try {
            // Try to parse as JSON, fallback to text if it fails
            const errorData = responseText ? JSON.parse(responseText) : {};
            console.error('Error response from server:', errorData);
            errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (parseError) {
            console.error('Error parsing error response:', parseError);
            errorMessage = `Server error (${response.status}): ${responseText.substring(0, 200)}`;
          }
          throw new Error(errorMessage);
        }

        // If we get here, the request was successful
        const result = responseText ? JSON.parse(responseText) : {};
       
        // Force clear any cached config
        if (window.__APP_CONFIG_LOADED__) {
          delete window.__APP_CONFIG_LOADED__;
        }
        
        // Close the browser window after successful setup
        try {
          window.open('', '_self');
          window.close();
        } catch (e) {
          // If window.close() fails (common in modern browsers), redirect to blank page
          window.location.href = 'about:blank';
        }
        
      } catch (err) {
        console.error('Error saving configuration:', err);
        throw new Error(`Kon de configuratie niet opslaan: ${err.message}`);
      }
    } catch (err) {
      console.error('Setup fout:', err);
      setError(`Er is een fout opgetreden: ${err.message}. Controleer de gegevens en probeer het opnieuw.`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 2:
        return (
          <div className="setup-step">
            <h2>Configuratie</h2>
            <p>Laten we de beschikbare beeldbanken opgeven in het volgende scherm</p>
            <div className="form-group">
              <div className="button-group" style={{ justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => {
                    if (isPhpTooLow) {
                      alert('PHP versie moet minimaal 8.0 zijn. Verhoog eerst de PHP versie naar minimaal 8.0 om verder te gaan.');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  className="btn btn-primary"
                  disabled={isPhpTooLow}
                >
                  Volgende
                </button>
              </div>
              <div style={{display: 'none'}}>
                <input type="hidden" />
                <button 
                  onClick={() => window.location.reload()}
                  className="btn btn-primary"
                  title="Vernieuw de pagina"
                >
                  Vernieuwen
                </button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="setup-step">
            <h2>Beeldbanken Configuratie</h2>
            <p>Voer de namen in van de beeldbanken die u wilt gebruiken (één per regel):</p>
            <div className="form-group">
              <div className="beeldbanken-list">
                {beeldbanken.map((bank, index) => (
                  <DraggableItem 
                    key={bank.naam} 
                    id={bank.naam} 
                    index={index}
                    moveItem={(fromIndex, toIndex) => {
                      const newBeeldbanken = [...beeldbanken];
                      const [movedItem] = newBeeldbanken.splice(fromIndex, 1);
                      newBeeldbanken.splice(toIndex, 0, movedItem);
                      setBeeldbanken(newBeeldbanken);
                    }}
                  >
                    <div className="beeldbank-item">
                      <span className="drag-handle" style={{ cursor: 'move', marginRight: '10px' }}>☰</span>
                      <span>{bank.naam} (format: {bank.format})</span>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBeeldbanken(beeldbanken.filter((_, i) => i !== index));
                        }}
                        style={{ marginLeft: '10px' }}
                      >
                        Verwijder
                      </button>
                    </div>
                  </DraggableItem>
                ))}
              </div>
              <div className="input-group mt-2">
                <input
                  type="text"
                  value={newBeeldbank}
                  onChange={(e) => setNewBeeldbank(e.target.value)}
                  placeholder="Nieuwe beeldbank naam"
                  className="form-control"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newBeeldbank.trim()) {
                      setBeeldbanken([...beeldbanken, {naam: newBeeldbank.trim(), format: '0'}]);
                      setNewBeeldbank('');
                      e.preventDefault();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (newBeeldbank.trim()) {
                      setBeeldbanken([...beeldbanken, {naam: newBeeldbank.trim(), format: '0'}]);
                      setNewBeeldbank('');
                    }
                  }}
                  disabled={!newBeeldbank.trim()}
                >
                  Toevoegen
                </button>
              </div>
            </div>
            <div className="button-group">
              <button 
                onClick={() => setCurrentStep(2)}
                className="btn btn-secondary"
              >
                Terug
              </button>
              <button 
                type="button"
                onClick={handleSubmit}
                disabled={beeldbanken.length === 0 || isLoading}
                className="btn btn-primary"
              >
                {isLoading ? 'Bezig met opslaan...' : 'Installatie voltooien'}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="first-time-setup">
      <div className="setup-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Eerste Opstart Configuratie</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a 
              href="./beheerders.html" 
              target="_blank" 
              rel="noopener noreferrer" 
              title="Beheerders"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#f0f0f0',
                color: '#666',
                textDecoration: 'none',
                fontSize: '16px',
                lineHeight: '1',
                fontWeight: 'bold',
                border: '1px solid #ddd',
                cursor: 'pointer',
                position: 'relative',
                top: '-2px'
              }}
            >
              ?
            </a>
            <a 
              href="/zcbs_frontend/?debug=1" 
              target="_blank" 
              rel="noopener noreferrer" 
              title="Debug"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#f0f0f0',
                color: '#666',
                textDecoration: 'none',
                fontSize: '16px',
                lineHeight: '1',
                fontWeight: 'bold',
                border: '1px solid #ddd',
                cursor: 'pointer',
                position: 'relative',
                top: '-2px'
              }}
            >
              D
            </a>
          </div>
        </div>
        {backendStatus.message && (
          <div className={`alert ${backendStatus.online ? 'alert-success' : 'alert-danger'}`} role="alert">
            <div>{backendStatus.message}</div>
            <div className="version-info">
              <div>PHP versie: {backendStatus.phpVersion || 'Onbekend'}</div>
              <div>Frontend versie: {packageJson.version}</div>
              {backendStatus.version && <div>Backend versie: {backendStatus.version}</div>}
            </div>
            <button 
              type="button" 
              className="close" 
              onClick={() => setBackendStatus(prev => ({ ...prev, message: '' }))}
              aria-label="Sluiten"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        )}
        <div className="setup-steps">
          <div className="step-indicator">
            Stap {currentStep} van 3
          </div>
        </div>
        
        <div className="setup-content">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

// Wrap the FirstTimeSetup component with DnD provider
const FirstTimeSetupWithDnD = (props) => (
  <DnDContainer>
    <FirstTimeSetup {...props} />
  </DnDContainer>
);

export default FirstTimeSetupWithDnD;
