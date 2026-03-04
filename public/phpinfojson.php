<?php
// Get phpinfo output first
ob_start();
phpinfo();
$phpinfo = ob_get_clean();

// Extract specific upload-related values
$upload_settings = [
     'php_version' => PHP_VERSION,
    'file_uploads' => ini_get('file_uploads'),
    'upload_max_filesize' => ini_get('upload_max_filesize'),
    'post_max_size' => ini_get('post_max_size'),
    'max_file_uploads' => ini_get('max_file_uploads'),
    'max_multipart_body_parts' => ini_get('max_multipart_body_parts'),
    'max_input_time' => ini_get('max_input_time'),
    'max_execution_time' => ini_get('max_execution_time'),
    'memory_limit' => ini_get('memory_limit'),
    'upload_tmp_dir' => ini_get('upload_tmp_dir'),
    'max_input_vars' => ini_get('max_input_vars'),
];

// Parse phpinfo to get actual values (more reliable)
$lines = explode("\n", $phpinfo);
foreach ($lines as $line) {
    if (strpos($line, 'file_uploads') !== false && strpos($line, 'Local Value') !== false) {
        preg_match('/<td[^>]*>([^<]+)<\/td>/', $line, $matches);
        if (isset($matches[1])) $upload_settings['file_uploads'] = trim($matches[1]);
    }
    if (strpos($line, 'upload_max_filesize') !== false && strpos($line, 'Local Value') !== false) {
        preg_match('/<td[^>]*>([^<]+)<\/td>/', $line, $matches);
        if (isset($matches[1])) $upload_settings['upload_max_filesize'] = trim($matches[1]);
    }
    if (strpos($line, 'post_max_size') !== false && strpos($line, 'Local Value') !== false) {
        preg_match('/<td[^>]*>([^<]+)<\/td>/', $line, $matches);
        if (isset($matches[1])) $upload_settings['post_max_size'] = trim($matches[1]);
    }
    if (strpos($line, 'max_file_uploads') !== false && strpos($line, 'Local Value') !== false) {
        preg_match('/<td[^>]*>([^<]+)<\/td>/', $line, $matches);
        if (isset($matches[1])) $upload_settings['max_file_uploads'] = trim($matches[1]);
    }
    if (strpos($line, 'max_multipart_body_parts') !== false && strpos($line, 'Local Value') !== false) {
        preg_match('/<td[^>]*>([^<]+)<\/td>/', $line, $matches);
        if (isset($matches[1])) $upload_settings['max_multipart_body_parts'] = trim($matches[1]);
    }
    if (strpos($line, 'max_input_time') !== false && strpos($line, 'Local Value') !== false) {
        preg_match('/<td[^>]*>([^<]+)<\/td>/', $line, $matches);
        if (isset($matches[1])) $upload_settings['max_input_time'] = trim($matches[1]);
    }
    if (strpos($line, 'max_execution_time') !== false && strpos($line, 'Local Value') !== false) {
        preg_match('/<td[^>]*>([^<]+)<\/td>/', $line, $matches);
        if (isset($matches[1])) $upload_settings['max_execution_time'] = trim($matches[1]);
    }
    if (strpos($line, 'memory_limit') !== false && strpos($line, 'Local Value') !== false) {
        preg_match('/<td[^>]*>([^<]+)<\/td>/', $line, $matches);
        if (isset($matches[1])) $upload_settings['memory_limit'] = trim($matches[1]);
    }
    if (strpos($line, 'upload_tmp_dir') !== false && strpos($line, 'Local Value') !== false) {
        preg_match('/<td[^>]*>([^<]+)<\/td>/', $line, $matches);
        if (isset($matches[1])) $upload_settings['upload_tmp_dir'] = trim($matches[1]);
    }
    if (strpos($line, 'max_input_vars') !== false && strpos($line, 'Local Value') !== false) {
        preg_match('/<td[^>]*>([^<]+)<\/td>/', $line, $matches);
        if (isset($matches[1])) $upload_settings['max_input_vars'] = trim($matches[1]);
    }
}

// Add recommendations based on current values
$recommendations = [];

// Check PHP version
if (version_compare($upload_settings['php_version'], '8.0.0', '<')) {
    $recommendations[] = 'PHP versie is ' . $upload_settings['php_version'] . ' - upgrade naar 8.0.0 of hoger voor betere compatibiliteit';
}

// Check upload settings against recommended values
if ($upload_settings['upload_max_filesize'] !== '6M') {
    $recommendations[] = 'upload_max_filesize is ' . $upload_settings['upload_max_filesize'] . ' - aanbevolen: 6M';
}
if ($upload_settings['post_max_size'] !== '256M') {
    $recommendations[] = 'post_max_size is ' . $upload_settings['post_max_size'] . ' - aanbevolen: 256M';
}
if ($upload_settings['max_file_uploads'] !== '20') {
    $recommendations[] = 'max_file_uploads is ' . $upload_settings['max_file_uploads'] . ' - aanbevolen: 20';
}
if ($upload_settings['max_input_time'] !== '300') {
    $recommendations[] = 'max_input_time is ' . $upload_settings['max_input_time'] . ' - aanbevolen: 300';
}
if ($upload_settings['max_execution_time'] !== '300') {
    $recommendations[] = 'max_execution_time is ' . $upload_settings['max_execution_time'] . ' - aanbevolen: 300';
}
if ($upload_settings['memory_limit'] !== '256M') {
    $recommendations[] = 'memory_limit is ' . $upload_settings['memory_limit'] . ' - aanbevolen: 256M';
}

$recommended_settings = [
    'upload_max_filesize' => '6M',
    'post_max_size' => '256M',
    'max_file_uploads' => '20',
    'max_multipart_body_parts' => 'verwijderen',
    'max_input_time' => '300',
    'max_execution_time' => '300',
    'memory_limit' => '256M'
];

$comparison_table = [];
$settings_to_check = ['php_version', 'upload_max_filesize', 'post_max_size', 'max_file_uploads', 'max_input_time', 'max_execution_time', 'memory_limit'];

foreach ($settings_to_check as $setting) {
    $current_value = $upload_settings[$setting] ?? null;

    if ($setting === 'php_version') {
        $recommended = '8.0.0';
        $color = 'green';
        if ($current_value !== null && version_compare($current_value, '8.0.0', '<')) {
            $color = 'red';
        }
    } else {
        $recommended = $recommended_settings[$setting] ?? null;

        $current_bytes = return_bytes((string)$current_value);
        $recommended_bytes = return_bytes((string)$recommended);

        $color = 'green';
        if ($current_bytes < $recommended_bytes) {
            $color = 'orange';
        }
    }

    $comparison_table[] = [
        'setting' => $setting,
        'current_value' => $current_value,
        'recommendation_200_images' => $recommended,
        'recommendation_500_images' => $recommended,
        'status_color' => $color
    ];
}

function return_bytes(string $val): int {
    $val = trim($val);
    if ($val === '') return 0;
    $last = strtolower($val[strlen($val) - 1]);
    $num = (int)$val;
    switch ($last) {
        case 'g':
            $num *= 1024;
        case 'm':
            $num *= 1024;
        case 'k':
            $num *= 1024;
    }
    return $num;
}

$response = [
    'success' => true,
    'timestamp' => date('Y-m-d H:i:s'),
    'upload_settings' => $upload_settings,
    'recommendations' => $recommendations,
    'comparison_table' => $comparison_table,
    'scenarios' => [
        '200_images_5mb_each' => $recommended_settings,
        '500_images_5mb_each' => $recommended_settings
    ],
    'recommended_settings' => $recommended_settings,
    'raw_phpinfo_available' => true
];

// Clear any previous output and headers
if (ob_get_length()) ob_clean();
header('Content-Type: application/json');
header('Cache-Control: no-cache, must-revalidate');

echo json_encode($response, JSON_PRETTY_PRINT);
?>
