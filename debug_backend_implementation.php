<?php
// Debug endpoint implementation voor zcbs_backend.php
// Voeg deze code toe aan je backend file

// Functie om debug informatie op te halen
function getDebugInfo() {
    $debug = [];
    
    // 1. PHP error logs lezen
    $errorLog = ini_get('error_log');
    $debug['error_log'] = [
        'path' => $errorLog,
        'exists' => file_exists($errorLog),
        'size' => file_exists($errorLog) ? filesize($errorLog) : 0,
        'last_modified' => file_exists($errorLog) ? date('Y-m-d H:i:s', filemtime($errorLog)) : null
    ];
    
    // Laatste 50 regels van error log
    if (file_exists($errorLog) && is_readable($errorLog)) {
        $lines = file($errorLog);
        $debug['error_log']['recent_entries'] = array_slice($lines, -50);
    }
    
    // 2. Server configuratie
    $debug['server_config'] = [
        'max_file_uploads' => ini_get('max_file_uploads'),
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size'),
        'max_execution_time' => ini_get('max_execution_time'),
        'memory_limit' => ini_get('memory_limit'),
        'max_input_time' => ini_get('max_input_time'),
        'max_input_vars' => ini_get('max_input_vars'),
        'file_uploads' => ini_get('file_uploads'),
        'upload_tmp_dir' => ini_get('upload_tmp_dir'),
        'error_reporting' => error_reporting(),
        'display_errors' => ini_get('display_errors')
    ];
    
    // 3. Huidige request info
    $debug['request_info'] = [
        'method' => $_SERVER['REQUEST_METHOD'],
        'uri' => $_SERVER['REQUEST_URI'],
        'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'unknown',
        'files_count' => count($_FILES),
        'post_size' => strlen(file_get_contents('php://input')),
        'memory_usage' => memory_get_usage(true),
        'memory_peak' => memory_get_peak_usage(true)
    ];
    
    // 4. Laatste PHP errors in deze sessie
    $debug['php_errors'] = error_get_last();
    
    // 5. Syslog (indien beschikbaar)
    if (function_exists('system')) {
        $debug['system_logs'] = [
            'dmesg_tail' => shell_exec('dmesg | tail -20 2>&1'),
            'syslog_tail' => shell_exec('tail -20 /var/log/syslog 2>&1')
        ];
    }
    
    return $debug;
}

// Voeg dit endpoint toe aan je router
// /api/debug endpoint
if (preg_match('/^\/api\/debug$/', $uri)) {
    
    // Alleen toegankelijk voor admin of met speciale header
    $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
    $debugToken = $_GET['debug_token'] ?? '';
    
    // Controleer of de gebruiker toegang heeft (pas dit aan naar je eigen authenticatie)
    $hasAccess = ($apiKey === 'your-debug-api-key') || ($debugToken === 'your-debug-token');
    
    if (!$hasAccess) {
        http_response_code(403);
        echo json_encode(['error' => 'Debug access denied']);
        exit;
    }
    
    try {
        $debugInfo = getDebugInfo();
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'debug' => $debugInfo,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

// Helper functie om errors te loggen naar custom bestand
function logCustomError($message, $context = []) {
    $logFile = __DIR__ . '/debug_errors.log';
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? json_encode($context) : '';
    $logEntry = "[{$timestamp}] {$message} {$contextStr}\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// Gebruik in je code: logCustomError('Upload failed', ['file' => $filename, 'size' => $filesize]);

?>
