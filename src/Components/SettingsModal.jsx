import { useState, useEffect, useRef, useCallback } from 'react';

import { config as appConfig } from '../services/api';

import { compareSync, hashSync } from 'bcryptjs';

import { DndProvider, useDrag, useDrop } from 'react-dnd';

import { HTML5Backend } from 'react-dnd-html5-backend';

import axios from 'axios';

import InsertModal from './InsertModal';



// Draggable item component for image banks

const DraggableBeeldbankItem = ({ id, index, moveItem, children }) => {

  const ref = useRef(null);

  

  const [{ isDragging }, drag] = useDrag({

    type: 'IMAGE_BANK_ITEM',

    item: { id, index },

    collect: (monitor) => ({

      isDragging: monitor.isDragging(),

    }),

  });



  const [, drop] = useDrop({

    accept: 'IMAGE_BANK_ITEM',

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

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      

      // Time to actually perform the action

      if (moveItem) {

        moveItem(dragIndex, hoverIndex);

      }

      

      // Update the index for the dragged item

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

const SettingsModalWithDnD = (props) => (

  <DndProvider backend={HTML5Backend}>

    <SettingsModal {...props} />

  </DndProvider>

);



const SettingsModal = ({ isOpen, onClose, onSave }) => {

  // Use the already loaded config from appConfig as initial state

  const { LOGIN_EXCEPTION, ...initialConfig } = appConfig;

  

  // Store all configuration values that should be preserved but not shown in the form

  const [systemConfig] = useState({

    API_BASE: (() => {

      // Use the same logic as config.js to get the correct API_BASE

      const { protocol, hostname, port } = window.location;

      

      // In development, remove port 3000 to connect to backend

      if (import.meta.env.DEV && port === '3000') {

        return `${protocol}//${hostname}`;

      }

      

      return `${protocol}//${hostname}${port ? ':' + port : ''}`;

    })(),

    //UPLOAD_ROOT: initialConfig.UPLOAD_ROOT || '',

    //PUBLIC_PATH: initialConfig.PUBLIC_PATH || '',

    //CK: initialConfig.CK || ''

  });

  

  // Initialize authentication state first

  const [isAuthenticated, setIsAuthenticated] = useState(() => {

    // Initialize based on whether a password is set

    return !initialConfig.CKP;

  });

  

  // Only include fields that should be editable in the form

  const [config, setConfig] = useState({

    BEELDBANKEN: Array.isArray(initialConfig.BEELDBANKEN) ? [...initialConfig.BEELDBANKEN] : [],

    CKP: initialConfig.CKP || ''

  });

  

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState(null);

  const [isSaving, setIsSaving] = useState(false);

  const [password, setPassword] = useState('');

  const [newPassword, setNewPassword] = useState('');

  const [confirmPassword, setConfirmPassword] = useState('');

  const [newBeeldbank, setNewBeeldbank] = useState({ naam: '', format: '' });

  // Current settings (applied)

  const [disableSmallUpload, setDisableSmallUpload] = useState(initialConfig.disableSmallUpload || false);

  const [disable100pcUpload, setDisable100pcUpload] = useState(initialConfig.disable100pcUpload || false);

  const [jpegQuality, setJpegQuality] = useState(initialConfig.JPEG_QUALITY || 0.7);

  const [fontSize, setFontSize] = useState(initialConfig.FONT_SIZE || 18);

  const [insertConfigs, setInsertConfigs] = useState(initialConfig.INSERT_CONFIGS || {});

  const [showInsertModal, setShowInsertModal] = useState(false);

  const [currentInsertBeeldbank, setCurrentInsertBeeldbank] = useState(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [showDeleteInsertConfirm, setShowDeleteInsertConfirm] = useState(false);

  const [deleteInsertBeeldbank, setDeleteInsertBeeldbank] = useState(null);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  

  // Pending settings (not applied until save)

  const [pendingSettings, setPendingSettings] = useState({

    disableSmallUpload: initialConfig.disableSmallUpload || false,

    disable100pcUpload: initialConfig.disable100pcUpload || false,

    jpegQuality: initialConfig.JPEG_QUALITY || 0.7,

    fontSize: initialConfig.FONT_SIZE || 18

  });

  

  // Apply font size when it changes

  useEffect(() => {

    document.documentElement.style.setProperty('--font-size', `${fontSize}px`);

  }, [fontSize]);

  

  // Auto-authenticate if no password is set

  useEffect(() => {

    if (isOpen && !config.CKP) {

      setIsAuthenticated(true);

    }

  }, [isOpen, config.CKP]);

  

  // Update settings when initialConfig changes or modal opens

  useEffect(() => {

    if (!isOpen) return;

    

    // Reset success popup when modal opens

    setShowSuccessPopup(false);

    

    const newSettings = {

      disableSmallUpload: initialConfig.disableSmallUpload || false,

      disable100pcUpload: initialConfig.disable100pcUpload || false,

      jpegQuality: initialConfig.JPEG_QUALITY || 0.7,

      fontSize: initialConfig.FONT_SIZE || 16

    };

    

    // Only update if values actually changed

    setDisableSmallUpload(prev => 

      prev !== newSettings.disableSmallUpload ? newSettings.disableSmallUpload : prev

    );

    setDisable100pcUpload(prev => 

      prev !== newSettings.disable100pcUpload ? newSettings.disable100pcUpload : prev

    );

    setJpegQuality(prev => 

      prev !== newSettings.jpegQuality ? newSettings.jpegQuality : prev

    );

    setFontSize(prev => 

      prev !== newSettings.fontSize ? newSettings.fontSize : prev

    );

    

    setPendingSettings(prev => 

      JSON.stringify(prev) !== JSON.stringify(newSettings) ? newSettings : prev

    );

    

    // Check for new image banks when initialConfig changes

    if (Array.isArray(initialConfig.BEELDBANKEN)) {

      setConfig(prevConfig => {

        // Only update if there are new image banks

        const currentBankNames = prevConfig.BEELDBANKEN.map(b => b.naam);

        const newBanks = initialConfig.BEELDBANKEN.filter(

          bank => !currentBankNames.includes(bank.naam)

        );

        

        if (newBanks.length > 0) {

          return {

            ...prevConfig,

            BEELDBANKEN: [...prevConfig.BEELDBANKEN, ...newBanks]

          };

        }

        return prevConfig;

      });

    }

  }, [isOpen, initialConfig.disableSmallUpload, initialConfig.disable100pcUpload, initialConfig.JPEG_QUALITY, initialConfig.FONT_SIZE, initialConfig.BEELDBANKEN]);



  // Fetch latest image banks when modal opens

  useEffect(() => {

    if (!isOpen) return;



    const fetchLatestBeeldbanken = async () => {

      try {

        let apiBaseUrl = window.location.origin;

        

        // In development mode, remove the port if it's the default dev server port

        if (process.env.NODE_ENV === 'development') {

          apiBaseUrl = apiBaseUrl.replace(/\/\/([^:]+):\d+$/, '//$1');

        }

        

        const apiUrl = `${apiBaseUrl}/misc/api/zcbs_backend.php?endpoint=/api/beeldbanken`;

        

        

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

        

       

        

        if (!response.data) {

          console.error('No data in response');

          return;

        }

        

        let serverBeeldbanken = [];

        

       

        

        // Try to extract the data based on the actual response structure

        let banksData = [];

        

        // If response.data is the direct array of banks

        if (Array.isArray(response.data)) {

          banksData = response.data;

        }

        // If response.data has a 'data' property that's an array

        else if (response.data.data && Array.isArray(response.data.data)) {

          banksData = response.data.data;

        }

        // If response.data has a 'beeldbanken' property that's an array

        else if (response.data.beeldbanken && Array.isArray(response.data.beeldbanken)) {

          banksData = response.data.beeldbanken;

        }

        

        // Process the banks data

        if (banksData.length > 0) {

          // If it's an array of strings

          if (typeof banksData[0] === 'string') {

            serverBeeldbanken = banksData.map(naam => ({ naam, format: '0' }));

          }

          // If it's an array of objects

          else if (typeof banksData[0] === 'object') {

            serverBeeldbanken = banksData.map(bank => ({

              naam: bank.naam || bank.name || bank,

              format: '0' // Default format

            }));

          }

        }

        

        

        

        if (serverBeeldbanken.length > 0) {

          setConfig(prevConfig => {

            // Get current bank names for comparison

            const currentBankNames = prevConfig.BEELDBANKEN.map(b => b.naam);

         

            

            // Find new banks that exist on the server but not in our current config

            const newBanks = serverBeeldbanken.filter(

              bank => !currentBankNames.includes(bank.naam)

            );

            

            

            // If there are new banks, add them with default format '0'

            if (newBanks.length > 0) {

             

              return {

                ...prevConfig,

                BEELDBANKEN: [...prevConfig.BEELDBANKEN, ...newBanks]

              };

            }

           

            return prevConfig;

          });

        }

      } catch (error) {

        console.error('Error fetching latest beeldbanken:', error);

        // Don't show error to user, just continue with existing config

      }

    };



    fetchLatestBeeldbanken();

  }, [isOpen]);



  

  const handleInputChange = (e) => {

    const { name, value } = e.target;

    setConfig(prev => ({

      ...prev,

      [name]: value

    }));

  };



  const handleBeeldbankChange = (index, field, value) => {

    const updatedBeeldbanken = [...config.BEELDBANKEN];

    updatedBeeldbanken[index] = {

      ...updatedBeeldbanken[index],

      [field]: value

    };

    setConfig(prev => ({

      ...prev,

      BEELDBANKEN: updatedBeeldbanken

    }));

  };



  const addBeeldbank = () => {

    if (newBeeldbank.naam && newBeeldbank.format) {

      setConfig(prev => ({

        ...prev,

        BEELDBANKEN: [...prev.BEELDBANKEN, newBeeldbank]

      }));

      setNewBeeldbank({ naam: '', format: '' });

    }

  };



  const removeBeeldbank = (index) => {

    const updatedBeeldbanken = config.BEELDBANKEN.filter((_, i) => i !== index);

    setConfig(prev => ({

      ...prev,

      BEELDBANKEN: updatedBeeldbanken

    }));

  };



  // Handle settings changes

  const handleSmallUploadToggle = () => {

    setPendingSettings(prev => ({

      ...prev,

      disableSmallUpload: !prev.disableSmallUpload

    }));

  };



  const handle100pcUploadToggle = () => {

    setPendingSettings(prev => ({

      ...prev,

      disable100pcUpload: !prev.disable100pcUpload

    }));

  };



  const handleJpegQualityChange = (e) => {

    setPendingSettings(prev => ({

      ...prev,

      jpegQuality: parseFloat(e.target.value)

    }));

  };



  const handleFontSizeChange = (e) => {

    setPendingSettings(prev => ({

      ...prev,

      fontSize: parseInt(e.target.value, 10)

    }));

  };



  const handleClose = () => {

    // Reset to current settings when closing without saving

    setPendingSettings({

      disableSmallUpload,

      disable100pcUpload,

      jpegQuality,

      fontSize

    });

    onClose();

  };



  const handleDeleteInsertConfig = async () => {

    try {

      setIsSaving(true);

      

      // Remove insert config for specific beeldbank

      const newInsertConfigs = { ...insertConfigs };

      delete newInsertConfigs[deleteInsertBeeldbank];

      

      // Also remove active flag from beeldbank config

      const newBeeldbanken = config.BEELDBANKEN.map(bank => 

        bank.naam === deleteInsertBeeldbank 

          ? { ...bank, insertActive: false } 

          : bank

      );

      

      // Prepare config for API

      const dataToSend = {

        BEELDBANKEN: newBeeldbanken,

        CKP: config.CKP,

        disableSmallUpload: config.disableSmallUpload || false,

        disable100pcUpload: config.disable100pcUpload || false,

        JPEG_QUALITY: config.JPEG_QUALITY || 0.7,

        FONT_SIZE: config.FONT_SIZE || 18,

        INSERT_CONFIGS: newInsertConfigs

      };

      

      // Save via API like handleSubmit does

      const apiBase = systemConfig.API_BASE;

      const saveUrl = `${apiBase}/misc/api/zcbs_backend.php/api/save-config`;

      

      const response = await fetch(saveUrl, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'x-api-key': 'ZCBSSystemimages2.0'

        },

        body: JSON.stringify(dataToSend)

      });

      

      if (!response.ok) {

        throw new Error(`HTTP error! status: ${response.status}`);

      }

      

      // Update local state

      setConfig({

        ...config,

        BEELDBANKEN: newBeeldbanken,

        INSERT_CONFIGS: newInsertConfigs

      });

      setInsertConfigs(newInsertConfigs);

      

      // Close confirmation and reset state

      setShowDeleteInsertConfirm(false);

      setDeleteInsertBeeldbank(null);

      setIsSaving(false);

    } catch (error) {

      setError('Fout bij verwijderen insert configuratie: ' + error.message);

      setIsSaving(false);

    }

  };

  

  const handleReset = async () => {

    // console.log('handleReset called');

    try {

      setIsSaving(true);

      // console.log('Setting isSaving to true');

      

      // Reset config to default state

      const resetConfig = { "FIRST_START": 1 };

      // console.log('Reset config:', resetConfig);

      

      // Save to backend using same method as handleSubmit

      // console.log('Calling save endpoint...');

      const apiBase = systemConfig.API_BASE;

      const saveUrl = `${apiBase}/misc/api/zcbs_backend.php/api/save-config`;

      

      const response = await fetch(saveUrl, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'x-api-key': 'ZCBSSystemimages2.0',

          'X-Node-Env': process.env.NODE_ENV || 'production'

        },

        body: JSON.stringify(resetConfig)

      });

      

      if (!response.ok) {

        throw new Error(`HTTP error! status: ${response.status}`);

      }

      

      console.log('Config saved successfully');

      

      // Reload page

      console.log('Reloading page...');

      window.location.reload(true);

    } catch (error) {

      console.error('Error during reset:', error);

      setError('Fout bij resetten: ' + error.message);

      setIsSaving(false);

    }

  };

  

  const handleSubmit = async (e) => {

    e.preventDefault();

    setError(null);

    

    // If we're not clearing the password and not setting a new one, keep the existing password

    if (config.CKP && !newPassword && !confirmPassword) {

      // No password change, proceed with saving other settings

    } 

    // If we're setting a new password, validate it

    else if (newPassword) {

      if (newPassword !== confirmPassword) {

        setError('Wachtwoorden komen niet overeen');

        return;

      }

    } 

    // If only confirm password is filled but no new password, show error

    else if (confirmPassword) {

      setError('Voer een nieuw wachtwoord in');

      return;

    }

    

    setIsSaving(true);



    try {

      // Update current settings with pending settings

      setDisableSmallUpload(pendingSettings.disableSmallUpload);

      setDisable100pcUpload(pendingSettings.disable100pcUpload);

      setJpegQuality(pendingSettings.jpegQuality);

      setFontSize(pendingSettings.fontSize);



      // Create a clean config object without the password

      const { SETTINGS_PASSWORD, ...configWithoutPassword } = config;

      

      // Prepare the data to send

      const dataToSend = {

        ...systemConfig,

        ...configWithoutPassword,

        BEELDBANKEN: config.BEELDBANKEN.filter(b => b.naam && b.format),

        disableSmallUpload: pendingSettings.disableSmallUpload,

        disable100pcUpload: pendingSettings.disable100pcUpload,

        JPEG_QUALITY: pendingSettings.jpegQuality,

        FONT_SIZE: pendingSettings.fontSize,

        INSERT_CONFIGS: insertConfigs

      };

      

      // Only include password in the save if it's being changed

      if (newPassword) {

        // Hash the new password before saving

        dataToSend.CKP = hashSync(newPassword, 10);

      } else if (config.CKP) {

        // Keep the existing hashed password if not changed

        dataToSend.CKP = config.CKP;

      }

      

      const saveUrl = `${systemConfig.API_BASE}/misc/api/zcbs_backend.php/api/save-config`;

      const response = await fetch(saveUrl, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'X-Node-Env': process.env.NODE_ENV

        },

        body: JSON.stringify(dataToSend)

      });

      if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(errorData.message || 'Kon de instellingen niet opslaan');

      }

      

      const responseData = await response.json();

      

      // Show success popup

      setShowSuccessPopup(true);

      

      // Close modal but don't reload page yet

      onClose();

      

      // Add small delay to ensure popup is rendered

      setTimeout(() => {

        setShowSuccessPopup(true);

      }, 100);

    } catch (error) {

      console.error('Error saving config:', error);

      setError(error.message || 'Er is een fout opgetreden bij het opslaan');

    } finally {

      setIsSaving(false);

    }

  };



  const handleAuthenticate = (e) => {

    e.preventDefault();

    if (config.CKP) {

      // Verify against hashed password

      if (compareSync(password, config.CKP)) {

        setIsAuthenticated(true);

        setError(null);

      } else {

        setError('Ongeldig wachtwoord');

      }

    } else if (password === '') {

      // Handle case where no password is set (shouldn't happen due to auto-auth)

      setIsAuthenticated(true);

      setError(null);

    } else {

      setError('Ongeldig wachtwoord');

    }

  };



  // Insert management functions

  const toggleInsertActive = (beeldbankNaam) => {

    setInsertConfigs(prev => ({

      ...prev,

      [beeldbankNaam]: {

        ...prev[beeldbankNaam],

        active: !prev[beeldbankNaam]?.active

      }

    }));

  };



  const openInsertModal = (beeldbankNaam) => {

    setCurrentInsertBeeldbank(beeldbankNaam);

    setShowInsertModal(true);

  };



  const closeInsertModal = () => {

    setShowInsertModal(false);

    setCurrentInsertBeeldbank(null);

  };



  const saveInsertConfig = (config) => {

    setInsertConfigs(prev => ({

      ...prev,

      [config.beeldbank]: {

        active: true,

        fixedFields: config.fixedFields,

        ifStatements: config.ifStatements

      }

    }));

  };



  if (!isOpen) {

    // Render success popup even when modal is closed

    return (

      <>

        {showSuccessPopup && (

          <>

            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">

              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">

                <div className="text-center">

                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">

                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />

                    </svg>

                  </div>

                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">

                    Instellingen Opgeslagen

                  </h3>

                  <div className="text-sm text-gray-500 mb-4">

                    <p>De instellingen zijn succesvol opgeslagen.</p>

                    <p>Om te zorgen dat de nieuwe instellingen goed worden overgenomen door de browser, dient u deze te vernieuwen met F5 of CTRL - R.</p>

                  </div>

                  <div className="mt-5">

                    <button

                      type="button"

                      className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"

                      onClick={() => {

                        setShowSuccessPopup(false);

                        // Reload page after closing popup

                        window.location.reload();

                      }}

                    >

                      Begrepen

                    </button>

                  </div>

                </div>

              </div>

            </div>

          </>

        )}

      </>

    );

  }



  // Show password prompt if not authenticated and password is set

  if (!isAuthenticated && config.CKP) {

    return (

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

        <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">

          <h2 className="text-xl font-bold mb-4">Beveiligde instellingen</h2>

          {error && (

            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">

              <p>{error}</p>

            </div>

          )}

          <div className="space-y-4">

            <div>

              <label className="block text-sm font-medium text-gray-700 mb-1">

                Wachtwoord

              </label>

              <input

                type="password"

                value={password}

                onChange={(e) => setPassword(e.target.value)}

                onKeyDown={(e) => {

                  if (e.key === 'Enter') {

                    e.preventDefault();

                    handleAuthenticate(e);

                  }

                }}

                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                autoFocus

                placeholder="Voer wachtwoord in"

              />

            </div>

            <div className="flex justify-end space-x-2 pt-2">

              <button

                type="button"

                onClick={handleClose}

                className="px-4 py-2 border rounded-md hover:bg-gray-100 disabled:opacity-50"

                disabled={isSaving}

              >

                Annuleren

              </button>

              <button

                type="button"

                onClick={handleAuthenticate}

                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"

                disabled={isSaving}

              >

                {isSaving ? 'Bezig...' : 'Bevestigen'}

              </button>

            </div>

          </div>

        </div>

      </div>

    );

  }



  if (isLoading) {

    return (

      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

        <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">

          <h2 className="text-xl font-bold mb-4">Instellingen laden...</h2>

        </div>

      </div>

    );

  }



  // Format combinations information

  const formatCombinations = [

    { id: 1, description: '- 100x100 700x500 origineel'},

    { id: 2, description: '- 100x100 700x500 max. 3000x2000'},

    { id: 3, description: '- 100x100 700x500 max. 4000x3000' },

    { id: 6, description: '- 250x250 700x500 origineel' },

    { id: 7, description: '- 250x250 700x500 max. 3000x2000' },

    { id: 8, description: '- 250x250 700x500 max. 4000x3000' }

  ];



  return (

    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

      <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        <div className="flex justify-between items-center mb-4">

          <div className="flex items-center space-x-2">

            <h2 className="text-xl font-bold">Instellingen</h2>

            <a 

              href="./beheerders.html" 

              target="_blank" 

              rel="noopener noreferrer"

              title="Help"

              className="text-gray-400 hover:text-gray-600"

            >

              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">

                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />

              </svg>

            </a>

            <button

              onClick={() => window.open('./?debug=1', '_blank')}

              title="Debug Tools"

              className="text-gray-400 hover:text-gray-600"

            >

              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">

                <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />

              </svg>

            </button>

          </div>

          <button

            onClick={onClose}

            className="text-gray-500 hover:text-gray-700"

            disabled={isSaving}

          >

            ✕

          </button>

        </div>



        {error && (

          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">

            <p>{error}</p>

          </div>

        )}



        <form onSubmit={handleSubmit}>

          <div className="grid grid-cols-1 gap-6">

            <div className="space-y-4">

              <h3 className="text-sm font-medium text-gray-700">Beveiliging</h3>

              <div className="bg-gray-50 p-4 rounded border border-gray-200">

                {config.CKP ? (

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-sm font-medium text-gray-700">Er is een wachtwoord ingesteld</p>

                      <p className="text-xs text-gray-500">Klik op de knop om het wachtwoord te verwijderen</p>

                    </div>

                    <button

                      type="button"

                      onClick={() => {

                        setNewPassword('');

                        setConfirmPassword('');

                        // Create a new config object without CKP and SETTINGS_PASSWORD

                        const { CKP, SETTINGS_PASSWORD, ...updatedConfig } = config;

                        setConfig(updatedConfig);

                      }}

                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"

                      disabled={isSaving}

                    >

                      Wachtwoord verwijderen

                    </button>

                  </div>

                ) : (

                  <div className="space-y-4">

                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        wachtwoord

                      </label>

                      <input

                        type="password"

                        value={newPassword}

                        onChange={(e) => setNewPassword(e.target.value)}

                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                        placeholder="Voer een wachtwoord in"

                        disabled={isSaving}

                        autoComplete="new-password"

                      />

                    </div>

                    <div>

                      <label className="block text-sm font-medium text-gray-700 mb-1">

                        Bevestig wachtwoord

                      </label>

                      <input

                        type="password"

                        value={confirmPassword}

                        onChange={(e) => setConfirmPassword(e.target.value)}

                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                        placeholder="Bevestig het wachtwoord"

                        disabled={isSaving}

                        autoComplete="new-password"

                        onKeyDown={(e) => {

                          if (e.key === 'Enter') {

                            e.preventDefault();

                            handleSubmit(e);

                          }

                        }}

                      />

                    </div>

                  </div>

                )}

              </div>

            </div>



            {/* Small Upload Setting */}

            <div className="space-y-4">

              <h3 className="text-sm font-medium text-gray-700">Upload Instellingen</h3>

              <div className="space-y-4">

                <div className="bg-gray-50 p-4 rounded border border-gray-200">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-sm font-medium text-gray-700">Kleine afbeeldingen niet uploaden</p>

                      <p className="text-xs text-gray-500">Schakel dit in om het uploaden van kleine afbeeldingen uit te schakelen</p>

                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">

                      <input 

                        type="checkbox" 

                        className="sr-only peer" 

                        checked={pendingSettings.disableSmallUpload}

                        onChange={handleSmallUploadToggle}

                      />

                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>

                    </label>

                  </div>

                </div>

                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">100pc afbeeldingen niet uploaden</p>
                      <p className="text-xs text-gray-500">Schakel dit in om het uploaden van 100pc afbeeldingen uit te schakelen</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={pendingSettings.disable100pcUpload}
                        onChange={handle100pcUploadToggle}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded border border-gray-200">

                  <div className="space-y-2">

                    <div className="flex justify-between">

                      <label htmlFor="jpegQuality" className="block text-sm font-medium text-gray-700">

                        JPEG Kwaliteit

                      </label>

                      <span className="text-sm text-gray-500">{(pendingSettings.jpegQuality * 100).toFixed(0)}%</span>

                    </div>

                    <input

                      id="jpegQuality"

                      type="range"

                      min="0.3"

                      max="0.9"

                      step="0.1"

                      value={pendingSettings.jpegQuality}

                      onChange={handleJpegQualityChange}

                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"

                    />

                    <p className="text-xs text-gray-500">

                      Lagere kwaliteit resulteert in kleinere bestanden, maar minder detail. Aanbevolen: 70%

                    </p>

                  </div>

                </div>

              </div>

            </div>



            {/* Font Size Setting */}

            <div className="space-y-4">

              <h3 className="text-sm font-medium text-gray-700">Weergave</h3>

              <div className="bg-gray-50 p-4 rounded border border-gray-200">

                <div className="space-y-2">

                  <div className="flex justify-between">

                    <label htmlFor="fontSize" className="block text-sm font-medium text-gray-700">

                      Lettergrootte

                    </label>

                    <span className="text-sm text-gray-500">{pendingSettings.fontSize}px</span>

                  </div>

                  <input

                    id="fontSize"

                    type="range"

                    min="12"

                    max="40"

                    step="2"

                    value={pendingSettings.fontSize}

                    onChange={handleFontSizeChange}

                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"

                  />

                  <p className="text-xs text-gray-500">

                    Pas de lettergrootte aan (12px - 40px, stappen van 2)

                  </p>

                </div>

              </div>

            </div>

          </div>

        

        <div className="grid grid-cols-1 md:grid-cols-10 gap-6">

          {/* Left Column - Format Combinations */}

          <div className="md:col-span-3 space-y-4">

            <div>

              <h3 className="text-xs font-medium text-gray-700 mb-1">Formaatcombinaties</h3>

              <div className="bg-gray-50 p-1.5 rounded border border-gray-200 max-h-48 overflow-y-auto text-[11px] leading-tight">

                <table className="w-full">

                  <tbody>

                    {formatCombinations.map(combo => (

                      <tr key={combo.id} className="hover:bg-gray-100">

                        <td className="py-0.5 pr-1.5 w-5 align-top">

                          <span className="font-mono bg-blue-100 text-blue-800 px-0.5 rounded text-[10px]">

                            {combo.id}

                          </span>

                        </td>

                        <td className="py-0.5 align-top">

                          <span className="inline-block max-w-full break-words">

                            {combo.description}

                          </span>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

              <p className="mt-0.5 text-[11px] text-gray-500 leading-tight">

                Gebruik deze formaten in het veld 'format' hiernaast

              </p>

            </div>

          </div>



          {/* Right Column - Beeldbanken */}

          <div className="md:col-span-7 space-y-4">

            <div className="mt-4">

              <h3 className="text-sm font-medium text-gray-700 mb-2 text-[90%]">Beeldbanken</h3>

              

              {/* Headers voor de kolommen */}

              <div className="grid grid-cols-12 gap-0 mb-2 px-2 text-xs font-medium text-gray-600 border-b border-gray-200 pb-1">

                <div className="col-span-4">Naam</div>

                <div className="col-span-1">Formaat</div>

                <div className="col-span-1 text-center">Insert</div>

                <div className="col-span-1 text-center">Config</div>

                <div className="col-span-2">Status</div>

                <div className="col-span-2 text-center">Acties</div>

                <div className="col-span-1 text-center">Sort</div>

              </div>

              

              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">

                {/* Header labels - only once */}

              

                

                {config.BEELDBANKEN.map((bank, index) => (

                  <DraggableBeeldbankItem 

                    key={`${bank.naam}-${index}`}

                    id={bank.naam}

                    index={index}

                    moveItem={(dragIndex, hoverIndex) => {

                      const newBeeldbanken = [...config.BEELDBANKEN];

                      const [movedItem] = newBeeldbanken.splice(dragIndex, 1);

                      newBeeldbanken.splice(hoverIndex, 0, movedItem);

                      setConfig({...config, BEELDBANKEN: newBeeldbanken});

                    }}

                  >

                    <div className="grid grid-cols-12 gap-2 items-center text-[90%]">

                      <div className="col-span-4">

                        <input

                          type="text"

                          value={bank.naam || ''}

                          onChange={(e) => handleBeeldbankChange(index, 'naam', e.target.value)}

                          placeholder="Naam"

                          className="w-full p-2 border rounded text-[90%]"

                          required

                        />

                      </div>

                      <div className="col-span-1">

                        <input

                          type="text"

                          value={bank.format || ''}

                          onChange={(e) => {

                            const value = e.target.value;

                            // Allow numbers 0,1,2,3,6,7,8, '-' and empty string

                            if (value === '' || ['0', '1', '2', '3', '6', '7', '8', '-'].includes(value)) {

                              handleBeeldbankChange(index, 'format', value);

                            }

                          }}

                          placeholder="Formaat"

                          className={`w-full p-2 border rounded text-[90%] ${

                            bank.format === '-' ? 'bg-gray-200' : ''

                          }`}

                          required

                          pattern="[0123678\-]"

                          title="Gebruik cijfers 0,1,2,3,6,7,8 of '-' om te blokkeren"

                        />

                      </div>

                      <div className="col-span-1 flex justify-center">

                        <label className="relative inline-flex items-center cursor-pointer">

                          <input 

                            type="checkbox" 

                            className="sr-only peer" 

                            checked={insertConfigs[bank.naam]?.active || false}

                            onChange={() => toggleInsertActive(bank.naam)}

                          />

                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>

                        </label>

                      </div>

                      <div className="col-span-1 flex justify-center">

                        <button

                          type="button"

                          onClick={() => openInsertModal(bank.naam)}

                          className="px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-xs"

                          disabled={isSaving}

                          title="Insert configureren"

                        >

                          ⚙

                        </button>

                      </div>

                      <div className="col-span-1 flex justify-center">

                        {insertConfigs[bank.naam] && Object.keys(insertConfigs[bank.naam]).length > 0 ? (

                          <button

                            type="button"

                            onClick={() => {

                              setDeleteInsertBeeldbank(bank.naam);

                              setShowDeleteInsertConfirm(true);

                            }}

                            className="px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-xs"

                            disabled={isSaving}

                            title="Insert configuratie verwijderen"

                          >

                            🗑

                          </button>

                        ) : (

                          <div className="w-8 h-6"></div>

                        )}

                      </div>

                      <div className="col-span-1 flex justify-center">

                        {bank.format === '-' ? (

                          <span className="text-xs text-gray-600">Geblokkeerd</span>

                        ) : (

                          <span className="text-xs text-green-600">Actief</span>

                        )}

                      </div>

                      <div className="col-span-2 flex justify-center space-x-1">

                        <button

                          type="button"

                          onClick={() => removeBeeldbank(index)}

                          className="px-3 bg-red-500 text-white rounded hover:bg-red-600 text-sm"

                          disabled={isSaving}

                          title="Verwijderen"

                        >

                          -

                        </button>

                      </div>

                      <div className="col-span-1 flex justify-center">

                        <span className="drag-handle flex items-center px-2 text-gray-400 cursor-move">

                          ☰

                        </span>

                      </div>

                    </div>

                  </DraggableBeeldbankItem>

                ))}



                <div className="flex space-x-2 mt-2">

                  <input

                    type="text"

                    value={newBeeldbank.naam}

                    onChange={(e) => setNewBeeldbank({...newBeeldbank, naam: e.target.value})}

                    placeholder="Nieuwe beeldbank naam"

                    className="flex-1 p-2 border rounded text-[90%]"

                  />

                  <input

                    type="text"

                    value={newBeeldbank.format}

                    onChange={(e) => {

                      const value = e.target.value;

                      // Only allow numbers 0,1,2,3,6,7,8 and empty string

                      if (value === '' || ['0', '1', '2', '3', '6', '7', '8'].includes(value)) {

                        setNewBeeldbank({...newBeeldbank, format: value});

                      }

                    }}

                    placeholder="Formaat"

                    className="w-24 p-2 border rounded text-[90%]"

                    pattern="[0123678]"

                    title="Alleen de volgende waarden zijn toegestaan: 0,1,2,3,6,7,8"

                  />

                  <button

                    type="button"

                    onClick={addBeeldbank}

                    className="px-3 bg-blue-500 text-white rounded hover:bg-blue-600"

                    disabled={!newBeeldbank.naam || !newBeeldbank.format}

                  >

                    +

                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>



          <div className="flex justify-end space-x-2 pt-6 mt-4 border-t">

            <button

              type="button"

              onClick={() => setShowResetConfirm(true)}

              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"

              disabled={isSaving}

            >

              Reset

            </button>

            <button

              type="button"

              onClick={onClose}

              className="px-4 py-2 border rounded-md hover:bg-gray-100 disabled:opacity-50"

              disabled={isSaving}

            >

              Annuleren

            </button>

            <button

              type="submit"

              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center"

              disabled={isSaving}

            >

              {isSaving ? (

                <>

                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">

                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>

                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>

                  </svg>

                  Bezig met opslaan...

                </>

              ) : 'Opslaan'}

            </button>

          </div>

        </form>



        {/* Insert Modal */}

        <InsertModal

          isOpen={showInsertModal}

          onClose={closeInsertModal}

          onSave={saveInsertConfig}

          beeldbank={currentInsertBeeldbank}

          initialConfig={insertConfigs[currentInsertBeeldbank]}

        />

        

        {/* Reset Confirmation Modal */}

        {showResetConfirm && (

          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">

              <h3 className="text-lg font-semibold mb-4">Configuratie Resetten</h3>

              <p className="text-gray-600 mb-6">

                Bent u zeker dat u de volledige configuratie wilt resetten? 

                Alle instellingen, beeldbanken en configuraties zullen worden verwijderd.

                Deze actie kan niet ongedaan worden gemaakt.

              </p>

              <div className="flex justify-end space-x-3">

                <button

                  type="button"

                  onClick={() => setShowResetConfirm(false)}

                  className="px-4 py-2 border rounded-md hover:bg-gray-100"

                >

                  Nee

                </button>

                <button

                  type="button"

                  onClick={handleReset}

                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"

                >

                  Ja, Reset

                </button>

              </div>

            </div>

          </div>

        )}

        

        {/* Delete Insert Config Confirmation Modal */}

        {showDeleteInsertConfirm && (

          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">

              <h3 className="text-lg font-semibold mb-4">Insert Configuratie Verwijderen</h3>

              <p className="text-gray-600 mb-6">

                Bent u zeker dat u de insert configuratie voor beeldbank "{deleteInsertBeeldbank}" wilt verwijderen?

                Alle insert instellingen voor deze beeldbank zullen worden verwijderd.

                Deze actie kan niet ongedaan worden gemaakt.

              </p>

              <div className="flex justify-end space-x-3">

                <button

                  type="button"

                  onClick={() => {

                    setShowDeleteInsertConfirm(false);

                    setDeleteInsertBeeldbank(null);

                  }}

                  className="px-4 py-2 border rounded-md hover:bg-gray-100"

                >

                  Nee

                </button>

                <button

                  type="button"

                  onClick={handleDeleteInsertConfig}

                  className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"

                >

                  Ja, Verwijder

                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

};



// Add some styles for the drag handle

const styles = `

  .drag-handle {

    opacity: 0.5;

    transition: opacity 0.2s ease;

  }

  .drag-handle:hover {

    opacity: 1;

  }

  .space-y-2 > div:hover .drag-handle {

    opacity: 0.7;

  }

`;



// Add the styles to the document head

const styleElement = document.createElement('style');

styleElement.textContent = styles;

document.head.appendChild(styleElement);



export default SettingsModalWithDnD;

