import React, { useState, useEffect } from 'react';
import './DebugPanel.css';

const DebugPanel = () => {
    const [debugData, setDebugData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const fetchDebugInfo = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Pas de URL aan naar je backend endpoint
            const response = await fetch('/misc/api/zcbs_backend.php?endpoint=/api/debug&debug_token=your-debug-token', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'your-debug-api-key'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data.success) {
                setDebugData(data.debug);
            } else {
                setError(data.error || 'Unknown error');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDebugInfo();
        
        if (autoRefresh) {
            const interval = setInterval(fetchDebugInfo, 5000); // Refresh elke 5 seconden
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const renderErrorLogs = () => {
        if (!debugData?.error_log?.recent_entries) return null;
        
        return (
            <div className="debug-section">
                <h3>📋 Error Log (Laatste 50 regels)</h3>
                <div className="log-container">
                    {debugData.error_log.recent_entries.map((line, index) => (
                        <div key={index} className="log-line">
                            <pre>{line}</pre>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderServerConfig = () => {
        if (!debugData?.server_config) return null;
        
        const config = debugData.server_config;
        
        return (
            <div className="debug-section">
                <h3>⚙️ Server Configuratie</h3>
                <div className="config-grid">
                    <div className="config-item">
                        <label>Max File Uploads:</label>
                        <span className={parseInt(config.max_file_uploads) < 20 ? 'warning' : ''}>
                            {config.max_file_uploads}
                        </span>
                    </div>
                    <div className="config-item">
                        <label>Upload Max Filesize:</label>
                        <span>{config.upload_max_filesize}</span>
                    </div>
                    <div className="config-item">
                        <label>Post Max Size:</label>
                        <span>{config.post_max_size}</span>
                    </div>
                    <div className="config-item">
                        <label>Max Execution Time:</label>
                        <span>{config.max_execution_time}s</span>
                    </div>
                    <div className="config-item">
                        <label>Memory Limit:</label>
                        <span>{config.memory_limit}</span>
                    </div>
                    <div className="config-item">
                        <label>Max Input Vars:</label>
                        <span className={parseInt(config.max_input_vars) < 1000 ? 'warning' : ''}>
                            {config.max_input_vars}
                        </span>
                    </div>
                    <div className="config-item">
                        <label>File Uploads:</label>
                        <span className={config.file_uploads === '1' ? 'success' : 'error'}>
                            {config.file_uploads === '1' ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                    <div className="config-item">
                        <label>Display Errors:</label>
                        <span className={config.display_errors === '1' ? 'warning' : 'success'}>
                            {config.display_errors === '1' ? 'On' : 'Off'}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const renderRequestInfo = () => {
        if (!debugData?.request_info) return null;
        
        const info = debugData.request_info;
        
        return (
            <div className="debug-section">
                <h3>📊 Huidige Request Info</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <label>Method:</label>
                        <span>{info.method}</span>
                    </div>
                    <div className="info-item">
                        <label>URI:</label>
                        <span>{info.uri}</span>
                    </div>
                    <div className="info-item">
                        <label>Files Count:</label>
                        <span className={info.files_count > 0 ? 'success' : ''}>
                            {info.files_count}
                        </span>
                    </div>
                    <div className="info-item">
                        <label>Post Size:</label>
                        <span>{formatBytes(info.post_size)}</span>
                    </div>
                    <div className="info-item">
                        <label>Memory Usage:</label>
                        <span>{formatBytes(info.memory_usage)}</span>
                    </div>
                    <div className="info-item">
                        <label>Memory Peak:</label>
                        <span>{formatBytes(info.memory_peak)}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="debug-panel">
            <div className="debug-header">
                <h2>🐛 Debug Panel</h2>
                <div className="debug-controls">
                    <button onClick={fetchDebugInfo} disabled={loading}>
                        {loading ? 'Loading...' : '🔄 Refresh'}
                    </button>
                    <label className="auto-refresh">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto Refresh (5s)
                    </label>
                </div>
            </div>

            {error && (
                <div className="debug-error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {debugData && (
                <div className="debug-content">
                    <div className="debug-timestamp">
                        Last updated: {new Date().toLocaleString()}
                    </div>

                    {renderServerConfig()}
                    {renderRequestInfo()}
                    {renderErrorLogs()}

                    {debugData.php_errors && (
                        <div className="debug-section">
                            <h3>⚠️ Laatste PHP Error</h3>
                            <pre className="php-error">
                                {JSON.stringify(debugData.php_errors, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DebugPanel;
