import { useState, useMemo } from 'react';
import pkg from '../../package.json';

function Debug() {
  // Wachtwoord is alleen het versie deel (xx.xx.xx) uit package.json, zonder datum
  const expectedPassword = useMemo(() => {
    if (!pkg?.version) return '';
    // Extract only the version part (xx.xx.xx) before the date
    const versionMatch = pkg.version.match(/^(\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[1] : '';
  }, []);

  const [passwordInput, setPasswordInput] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');

  const [beeldbank, setBeeldbank] = useState('');
  const [beeldbanken, setBeeldbanken] = useState([]);
  const [showBeeldbankDropdown, setShowBeeldbankDropdown] = useState(false);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rootWithoutPort = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}`;
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === expectedPassword) {
      setAuthorized(true);
      setAuthError('');
    } else {
      setAuthorized(false);
      setAuthError('Onjuist wachtwoord');
    }
  };

  const callDebugEndpoint = async (url) => {
    try {
      setLoading(true);
      setError('');
      setResult('');

      

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        }
      });

      const text = await response.text();
      
      setResult(text);

      // If this is debug=1, parse the beeldbanken from the result
      if (url.includes('debug=1')) {
        
        try {
          const data = JSON.parse(text);
          
          
          // Check for beeldbank_list directly in data
          if (data.beeldbank_list && Array.isArray(data.beeldbank_list)) {
            // Convert beeldbank_list array to objects with naam property
            const beeldbankenObjects = data.beeldbank_list.map(name => ({ naam: name }));
            setBeeldbanken(beeldbankenObjects);
            setShowBeeldbankDropdown(true);
            
          }
          // Check for beeldbank_list in implementation_details (fallback)
          else if (data.implementation_details && data.implementation_details.beeldbank_list) {
            // Convert beeldbank_list array to objects with naam property
            const beeldbankenObjects = data.implementation_details.beeldbank_list.map(name => ({ naam: name }));
            setBeeldbanken(beeldbankenObjects);
            setShowBeeldbankDropdown(true);
            
          } 
        } catch (e) {
          // If it's not JSON, try to parse beeldbanken from text
     
          // Try to find beeldbanken in text format
          const beeldbankMatches = text.match(/(\w+)\s*=\s*(\d+)/g);
          if (beeldbankMatches) {
            const parsedBeeldbanken = beeldbankMatches.map(match => {
              const [name, id] = match.split(/\s*=\s*/);
              return { naam: name.trim(), id: id.trim() };
            });
            setBeeldbanken(parsedBeeldbanken);
            setShowBeeldbankDropdown(true);
          
          } else {
            console.log('No beeldbanken found in text response');
          }
        }
      }

      if (!response.ok) {
        setError(`Foutstatus: ${response.status}`);
      }
    } catch (err) {
      console.error('Error in callDebugEndpoint:', err);
      setError(`Fout bij ophalen: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClick1 = async () => {
    const url = `${rootWithoutPort}/misc/api/zcbs_backend.php/api/debug?debug=1&debug_key=ZCBSSystemDebug2.0`;
    await callDebugEndpoint(url);
  };

  const handleClick2 = () => {
    if (!beeldbank) {
      setError('Geef eerst een beeldbank op.');
      return;
    }
    const url = `${rootWithoutPort}/misc/api/zcbs_backend.php/api/debug?debug=2&beeldbank=${encodeURIComponent(beeldbank)}&debug_key=ZCBSSystemDebug2.0`;
    void callDebugEndpoint(url);
  };

  const handleClick3 = () => {
    if (!beeldbank) {
      setError('Geef eerst een beeldbank op.');
      return;
    }
    const url = `${rootWithoutPort}/misc/api/zcbs_backend.php/api/debug?debug=3&beeldbank=${encodeURIComponent(beeldbank)}&debug_key=ZCBSSystemDebug2.0`;
    void callDebugEndpoint(url);
  };

  const handleClick4 = () => {
    const url = `${rootWithoutPort}/misc/api/zcbs_backend.php/api/debug?debug=4&debug_key=ZCBSSystemDebug2.0`;
    void callDebugEndpoint(url);
  };

  const handleClick5 = () => {
    const url = `${rootWithoutPort}/misc/api/zcbs_backend.php/api/debug?debug=5&debug_key=ZCBSSystemDebug2.0`;
    void callDebugEndpoint(url);
  };

  const handleClick6 = async () => {
    const url = `${rootWithoutPort}/zcbs_frontend/phpinfojson.php`;
    await callDebugEndpoint(url);
  };

  if (!authorized) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '24px 28px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            minWidth: '320px',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Debug toegang</h2>
          <p style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px', color: '#555' }}>
            Vul het debug-wachtwoord in om toegang te krijgen tot de debug tools.
          </p>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '14px' }}>
                Wachtwoord:
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={{
                    marginTop: '6px',
                    width: '100%',
                    padding: '6px 10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}
                />
              </label>
            </div>
            <div style={{ textAlign: 'right' }}>
              <button
                type="submit"
                style={{
                  padding: '6px 14px',
                  cursor: 'pointer',
                  backgroundColor: '#007bff',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              >
                Inloggen
              </button>
            </div>
          </form>
          {authError && (
            <div style={{ color: 'red', marginTop: '12px', fontSize: '13px' }}>{authError}</div>
          )}
        </div>
      </div>
    );
  }

  const formatResult = (result) => {
    if (!result) return '';
    
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(result);

      if (parsed && parsed.comparison_table && parsed.scenarios) {
        const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

        return (
          <div>
            {recommendations.length > 0 && (
              <div
                style={{
                  background: '#e8f4fd',
                  border: '1px solid #bee5eb',
                  borderRadius: '6px',
                  padding: '15px',
                  marginBottom: '15px',
                }}
              >
                <h4 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>Recommendations</h4>
                <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
                  {recommendations.map((rec, idx) => (
                    <div key={idx} style={{ marginBottom: '6px' }}>
                      <strong>{idx + 1}.</strong> {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                padding: '15px',
              }}
            >
              <h4 style={{ margin: '0 0 10px 0' }}>Upload limits</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Setting</th>
                      <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Huidig</th>
                      <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Aanbevolen</th>
                      <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.comparison_table.map((row, index) => (
                      <tr key={index}>
                        <td
                          style={{
                            padding: '8px',
                            border: '1px solid #dee2e6',
                            fontWeight: 'bold',
                            backgroundColor: '#f8f9fa',
                          }}
                        >
                          {row.setting}
                        </td>
                        <td
                          style={{
                            padding: '8px',
                            border: '1px solid #dee2e6',
                            backgroundColor:
                              row.status_color === 'red'
                                ? '#f8d7da'
                                : row.status_color === 'orange'
                                  ? '#fff3cd'
                                  : '#d4edda',
                          }}
                        >
                          {row.current_value}
                        </td>
                        <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{row.recommendation_200_images}</td>
                        <td
                          style={{
                            padding: '8px',
                            border: '1px solid #dee2e6',
                            textAlign: 'center',
                            backgroundColor:
                              row.status_color === 'red'
                                ? '#f8d7da'
                                : row.status_color === 'orange'
                                  ? '#fff3cd'
                                  : '#d4edda',
                          }}
                        >
                          {row.status_color === 'red'
                            ? 'Te laag'
                            : row.status_color === 'orange'
                              ? 'Laag'
                              : 'OK'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }
      
      // Check if it's a debug config response with the important values
      if (parsed.default_config_values && parsed.beeldbank_config_values && parsed.merged_values) {
        const { default_config_values, beeldbank_config_values, merged_values, ...rest } = parsed;
        
        return (
          <div>
            {/* Important config values at the top */}
            <div style={{ 
              background: '#e8f4fd', 
              border: '1px solid #bee5eb', 
              borderRadius: '6px', 
              padding: '15px', 
              marginBottom: '15px' 
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>Configuratie Waarden</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '10px' }}>
                <div>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>Default Config</h5>
                  <div style={{ background: '#fff', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
                    <div><strong>id1:</strong> {default_config_values.id1 || 'null'}</div>
                    <div><strong>id2:</strong> {default_config_values.id2 || 'null'}</div>
                    <div><strong>max_object:</strong> {default_config_values.max_object || 'null'}</div>
                    <div><strong>loc_image:</strong> {default_config_values.loc_image || 'null'}</div>
                  </div>
                </div>
                
                <div>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>Beeldbank Config</h5>
                  <div style={{ background: '#fff', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
                    <div><strong>id1:</strong> {beeldbank_config_values.id1 || 'null'}</div>
                    <div><strong>id2:</strong> {beeldbank_config_values.id2 || 'null'}</div>
                    <div><strong>max_object:</strong> {beeldbank_config_values.max_object || 'null'}</div>
                    <div><strong>loc_image:</strong> {beeldbank_config_values.loc_image || 'null'}</div>
                    <div><strong>zcbs:</strong> {beeldbank_config_values.zcbs || 'null'}</div>
                  </div>
                </div>
                
                <div>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>Merged Values</h5>
                  <div style={{ background: '#d4edda', padding: '8px', borderRadius: '4px', fontSize: '11px' }}>
                    <div><strong>id1:</strong> {merged_values.id1 || 'null'}</div>
                    <div><strong>id2:</strong> {merged_values.id2 || 'null'}</div>
                    <div><strong>max_object:</strong> {merged_values.max_object || 'null'}</div>
                    <div><strong>loc_image:</strong> {merged_values.loc_image || 'null'}</div>
                    <div><strong>zcbs:</strong> {merged_values.zcbs || 'null'}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Rest of the data */}
            {Object.keys(rest).length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>Overige Data</h4>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '10px',
                    borderRadius: '4px',
                    maxHeight: '300px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '12px',
                  }}
                >
                  {JSON.stringify(rest, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      }
      
      // Check if it's a beeldbank list response
      if (parsed.implementation_details && parsed.implementation_details.beeldbank_list) {
        const { implementation_details, ...rest } = parsed;
        const { beeldbank_count, beeldbank_list } = implementation_details;
        
        return (
          <div>
            {/* Beeldbank summary */}
            <div style={{ 
              background: '#d1ecf1', 
              border: '1px solid #bee5eb', 
              borderRadius: '6px', 
              padding: '15px', 
              marginBottom: '15px' 
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>
                🏛️ Beschikbare Beeldbanken
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>Totaal Beeldbanken</h5>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                    {beeldbank_count || beeldbank_list.length}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6c757d' }}>beschikbaar</div>
                </div>
                
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>Status</h5>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      background: '#28a745' 
                    }}></div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#28a745' }}>
                      Actief
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#6c757d' }}>systeem online</div>
                </div>
              </div>
              
              {/* Beeldbanken grid */}
              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#495057' }}>Beeldbank Lijst:</h5>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                  gap: '8px' 
                }}>
                  {beeldbank_list.map((bank, index) => (
                    <div 
                      key={index}
                      style={{ 
                        background: '#fff', 
                        padding: '8px 6px', 
                        borderRadius: '4px', 
                        fontSize: '11px',
                        textAlign: 'center',
                        border: '1px solid #dee2e6',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#f8f9fa';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#fff';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '2px' }}>
                        {bank}
                      </div>
                      <div style={{ fontSize: '9px', color: '#6c757d' }}>
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Rest of the data */}
            {Object.keys(rest).length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>Overige Data</h4>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '10px',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '12px',
                  }}
                >
                  {JSON.stringify(rest, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      }
      
      // Check if it's a beeldbank records summary response
      if (parsed.beeldbank && (parsed.records_in_beeldbank_txt !== undefined || parsed.records_in_updates_txt !== undefined)) {
        const { beeldbank, records_in_beeldbank_txt, updates_txt_aanwezig, records_in_updates_txt, ...rest } = parsed;
        
        return (
          <div>
            {/* Beeldbank summary */}
            <div style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: '6px', 
              padding: '15px', 
              marginBottom: '15px' 
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
                📊 Beeldbank: {beeldbank}
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>Beeldbank Records</h5>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#007bff' }}>
                    {records_in_beeldbank_txt || 0}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6c757d' }}>in beeldbank.txt</div>
                </div>
                
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>Updates Status</h5>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      background: updates_txt_aanwezig ? '#28a745' : '#dc3545' 
                    }}></div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                      {updates_txt_aanwezig ? 'Aanwezig' : 'Afwezig'}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#6c757d' }}>updates.txt</div>
                </div>
                
                {records_in_updates_txt !== undefined && (
                  <div style={{ background: '#d4edda', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                    <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#155724' }}>Updates Records</h5>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>
                      {records_in_updates_txt}
                    </div>
                    <div style={{ fontSize: '10px', color: '#155724' }}>in updates.txt</div>
                  </div>
                )}
              </div>
              
              {/* Total records indicator */}
              {records_in_beeldbank_txt !== undefined && records_in_updates_txt !== undefined && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  background: '#e2e3e5',
                  fontSize: '11px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '12px', color: '#495057', marginBottom: '5px' }}>
                    <strong>Totaal Records</strong>
                  </div>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: '#212529' 
                  }}>
                    {records_in_beeldbank_txt + records_in_updates_txt}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6c757d' }}>
                    som van beeldbank.txt + updates.txt
                  </div>
                </div>
              )}
            </div>
            
            {/* Rest of the data */}
            {Object.keys(rest).length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>Overige Data</h4>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '10px',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '12px',
                  }}
                >
                  {JSON.stringify(rest, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      }
      
      // Check if it's a PHP version response (debug=4)
      if (parsed.php_version) {
        const { php_version, ...rest } = parsed;
        
        return (
          <div>
            {/* PHP Version Summary */}
            <div style={{ 
              background: '#d1ecf1', 
              border: '1px solid #bee5eb', 
              borderRadius: '6px', 
              padding: '15px', 
              marginBottom: '15px' 
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>
                🐘 PHP Backend Informatie
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>PHP Versie</h5>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
                    {php_version || 'Onbekend'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6c757d' }}>backend versie</div>
                </div>
                
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>Status</h5>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      background: '#28a745' 
                    }}></div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#28a745' }}>
                      Actief
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#6c757d' }}>backend online</div>
                </div>
              </div>
              
              {/* Additional info table */}
              {Object.keys(rest).length > 0 && (
                <div>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#495057' }}>Additionele Info:</h5>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                    gap: '8px' 
                  }}>
                    {Object.entries(rest).map(([key, value]) => (
                      <div 
                        key={key}
                        style={{ 
                          background: '#fff', 
                          padding: '8px 6px', 
                          borderRadius: '4px', 
                          fontSize: '11px',
                          border: '1px solid #dee2e6',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', color: '#495057', marginBottom: '2px' }}>
                          {key}
                        </div>
                        <div style={{ fontSize: '10px', color: '#007bff' }}>
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }
      
      // Check if it's a write permissions response (debug=5)
      if (parsed.can_write !== undefined || parsed.upload_root) {
        const { can_write, upload_root, config_dir, environment, error, ...rest } = parsed;
        
        return (
          <div>
            {/* Write Permissions Summary */}
            <div style={{ 
              background: '#fff3cd', 
              border: '1px solid #ffeaa7', 
              borderRadius: '6px', 
              padding: '15px', 
              marginBottom: '15px' 
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>
                📁 Schrijfrechten Controle
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>Schrijfrechten</h5>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      background: can_write ? '#28a745' : '#dc3545' 
                    }}></div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                      {can_write ? 'OK' : 'Probleem'}
                    </span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#6c757d' }}>
                    {can_write ? 'schrijven mogelijk' : 'geen schrijfrechten'}
                  </div>
                </div>
                
                <div style={{ background: '#fff', padding: '10px', borderRadius: '4px', fontSize: '11px' }}>
                  <h5 style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6c757d' }}>Environment</h5>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#007bff' }}>
                    {environment || 'Onbekend'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6c757d' }}>omgeving</div>
                </div>
              </div>
              
              {/* Directory info table */}
              <div>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#495057' }}>Map Details:</h5>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Map</th>
                        <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Pad</th>
                        <th style={{ padding: '6px', border: '1px solid #dee2e6', textAlign: 'left' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upload_root && (
                        <tr>
                          <td style={{ padding: '6px', border: '1px solid #dee2e6', fontWeight: 'bold' }}>
                            Upload Root
                          </td>
                          <td style={{ padding: '6px', border: '1px solid #dee2e6' }}>
                            {upload_root}
                          </td>
                          <td style={{ 
                            padding: '6px', 
                            border: '1px solid #dee2e6',
                            backgroundColor: can_write ? '#d4edda' : '#f8d7da'
                          }}>
                            {can_write ? '✅ Schrijfbaar' : '❌ Alleen lezen'}
                          </td>
                        </tr>
                      )}
                      {config_dir && (
                        <tr>
                          <td style={{ padding: '6px', border: '1px solid #dee2e6', fontWeight: 'bold' }}>
                            Config Dir
                          </td>
                          <td style={{ padding: '6px', border: '1px solid #dee2e6' }}>
                            {config_dir}
                          </td>
                          <td style={{ 
                            padding: '6px', 
                            border: '1px solid #dee2e6',
                            backgroundColor: '#d4edda'
                          }}>
                            ✅ Toegankelijk
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Error display */}
              {error && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  background: '#f8d7da',
                  color: '#721c24',
                  fontSize: '11px'
                }}>
                  <strong>Fout:</strong> {error}
                </div>
              )}
            </div>
            
            {/* Rest of the data */}
            {Object.keys(rest).length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 10px 0' }}>Overige Data</h4>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '10px',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '12px',
                  }}
                >
                  {JSON.stringify(rest, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      }
      
      // For other responses, show as regular JSON
      return (
        <pre
          style={{
            background: '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '400px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch (e) {
      // If not JSON, show as plain text
      return (
        <pre
          style={{
            background: '#f5f5f5',
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '400px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {result}
        </pre>
      );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        padding: '24px 16px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          padding: '20px 24px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Debug tools</h2>

        <div style={{ marginBottom: '16px' }}>
          {showBeeldbankDropdown && (
            <label style={{ fontSize: '14px' }}>
              Beeldbank:
              <select
                value={beeldbank}
                onChange={(e) => setBeeldbank(e.target.value)}
                style={{
                  marginTop: '6px',
                  marginLeft: 0,
                  width: '100%',
                  maxWidth: '260px',
                  padding: '6px 10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="">-- Kies een beeldbank --</option>
                {beeldbanken.map((bank, index) => (
                  <option key={index} value={bank.naam || bank}>
                    {bank.naam || bank}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '20px',
          }}
        >
          {/* Linkerkolom: optie 1, 2, 3 */}
          <div
            style={{
              backgroundColor: '#e0f0ff',
              padding: '12px',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <button
              onClick={handleClick1}
              disabled={loading}
              style={{ padding: '6px 12px', cursor: 'pointer' }}
            >
              1 - Beeldbanken ophalen
            </button>
            {showBeeldbankDropdown && (
              <>
                <button
                  onClick={handleClick2}
                  disabled={loading || !beeldbank}
                  style={{ padding: '6px 12px', cursor: 'pointer' }}
                >
                  2 - Configuratie van beeldbank
                </button>
                <button
                  onClick={handleClick3}
                  disabled={loading || !beeldbank}
                  style={{ padding: '6px 12px', cursor: 'pointer' }}
                >
                  3 - Records van beeldbank
                </button>
              </>
            )}
          </div>

          {/* Rechterkolom: optie 4, 5, 6 */}
          <div
            style={{
              backgroundColor: '#e0f0ff',
              padding: '12px',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <button
              onClick={handleClick4}
              disabled={loading}
              style={{ padding: '6px 12px', cursor: 'pointer' }}
            >
              4 - PHP versie van backend
            </button>
            <button
              onClick={handleClick5}
              disabled={loading}
              style={{ padding: '6px 12px', cursor: 'pointer' }}
            >
              5 - Schrijfrechten
            </button>
            <button
              onClick={handleClick6}
              disabled={loading}
              style={{ padding: '6px 12px', cursor: 'pointer', backgroundColor: '#ffe0e0' }}
            >
              6 - PHP Info (Upload Limits)
            </button>
          </div>
        </div>

        {loading && <div>Bezig met laden...</div>}
        {error && !loading && (
          <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>
        )}

        <div>
          <h3 style={{ marginTop: 0 }}>Resultaat</h3>
          {formatResult(result)}
        </div>
      </div>
    </div>
  );
}

export default Debug;
