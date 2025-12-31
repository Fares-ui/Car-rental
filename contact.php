<?php
/**
 * Contact Form API
 * Handles contact form submissions
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Only POST requests are allowed', 'json', 405);
    exit;
}

$format = isset($_GET['format']) ? strtolower($_GET['format']) : 'json';

// Parse input data
$data = json_decode(file_get_contents('php://input'), true) ?: $_POST;

// Validate required fields
$required = ['name', 'email', 'message'];
$errors = [];

foreach ($required as $field) {
    if (empty($data[$field])) {
        $errors[] = "Field '$field' is required";
    }
}

if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email format';
}

if (!empty($errors)) {
    sendResponse(false, implode(', ', $errors), $format, 400, ['errors' => $errors]);
    exit;
}

// Process contact form (in production, send email or save to database)
$contactId = 'CONTACT_' . strtoupper(bin2hex(random_bytes(6)));
$contact = [
    'contact_id' => $contactId,
    'name' => htmlspecialchars($data['name'], ENT_QUOTES, 'UTF-8'),
    'email' => htmlspecialchars($data['email'], ENT_QUOTES, 'UTF-8'),
    'message' => htmlspecialchars($data['message'], ENT_QUOTES, 'UTF-8'),
    'submitted_at' => date('Y-m-d H:i:s')
];

sendResponse(true, 'Your message has been sent successfully', $format, 200, $contact);

function sendResponse($success, $message, $format, $httpCode = 200, $additionalData = []) {
    http_response_code($httpCode);
    
    if ($format === 'xml') {
        header('Content-Type: application/xml; charset=utf-8');
        echo generateXMLResponse($success, $message, $additionalData);
    } else {
        header('Content-Type: application/json; charset=utf-8');
        $response = [
            'success' => $success,
            'message' => $message
        ];
        if (!empty($additionalData)) {
            $response['data'] = $additionalData;
        }
        echo json_encode($response, JSON_PRETTY_PRINT);
    }
}

function generateXMLResponse($success, $message, $data) {
    $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><response></response>');
    $xml->addChild('success', $success ? 'true' : 'false');
    $xml->addChild('message', htmlspecialchars($message, ENT_XML1, 'UTF-8'));
    
    if (!empty($data)) {
        $dataNode = $xml->addChild('data');
        foreach ($data as $key => $value) {
            $dataNode->addChild($key, htmlspecialchars($value, ENT_XML1, 'UTF-8'));
        }
    }
    
    return $xml->asXML();
}
?>
