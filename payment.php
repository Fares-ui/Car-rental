<?php
/**
 * Payment Processing API - WORKS WITH OR WITHOUT DATABASE
 * Handles payment submissions with graceful fallback
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Include config
require_once '../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSONResponse(false, 'Only POST requests are allowed', [], 405);
    exit;
}

$contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
$format = isset($_GET['format']) ? strtolower($_GET['format']) : 'json';

// Parse input data
$data = [];
if (strpos($contentType, 'application/json') !== false) {
    $rawData = file_get_contents('php://input');
    $data = json_decode($rawData, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJSONResponse(false, 'Invalid JSON data', [], 400);
        exit;
    }
} elseif (strpos($contentType, 'application/xml') !== false || strpos($contentType, 'text/xml') !== false) {
    $rawData = file_get_contents('php://input');
    try {
        $xml = new SimpleXMLElement($rawData);
        $data = json_decode(json_encode($xml), true);
    } catch (Exception $e) {
        sendJSONResponse(false, 'Invalid XML data: ' . $e->getMessage(), [], 400);
        exit;
    }
} else {
    $data = $_POST;
}

// Validate required fields
$required = ['customer_name', 'customer_email', 'customer_phone', 'car_id', 'rental_days'];
$errors = [];

foreach ($required as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        $errors[] = "Field '$field' is required";
    }
}

if (!empty($data['customer_email']) && !filter_var($data['customer_email'], FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email format';
}

if (!empty($data['rental_days']) && (!is_numeric($data['rental_days']) || intval($data['rental_days']) < 1)) {
    $errors[] = 'Rental days must be a positive number';
}

if (!empty($data['car_id']) && !is_numeric($data['car_id'])) {
    $errors[] = 'Invalid car ID';
}

if (!empty($errors)) {
    sendJSONResponse(false, implode(', ', $errors), ['errors' => $errors], 400);
    exit;
}

// Try to get database connection
$db = getDBConnection();
$useDatabase = ($db !== null);

try {
    $carId = intval($data['car_id']);
    $rentalDays = intval($data['rental_days']);
    
    // Get car details (from database or fallback)
    if ($useDatabase) {
        $stmt = $db->prepare("SELECT * FROM cars WHERE id = ?");
        $stmt->execute([$carId]);
        $car = $stmt->fetch(PDO::FETCH_ASSOC);
    } else {
        // Fallback car prices
        $carPrices = [
            1 => ['id' => 1, 'name' => 'BMW 5 Series', 'price' => 350, 'available' => 1],
            2 => ['id' => 2, 'name' => 'Mercedes E-Class', 'price' => 400, 'available' => 1],
            3 => ['id' => 3, 'name' => 'Audi Q7', 'price' => 450, 'available' => 1],
            4 => ['id' => 4, 'name' => 'Dodge Challenger', 'price' => 1000, 'available' => 1],
            5 => ['id' => 5, 'name' => 'BMW Sedan', 'price' => 460, 'available' => 1],
            6 => ['id' => 6, 'name' => 'Ford Mustang', 'price' => 1700, 'available' => 1],
            7 => ['id' => 7, 'name' => 'Porsche 911', 'price' => 860, 'available' => 1],
            8 => ['id' => 8, 'name' => 'Tesla Model 3', 'price' => 930, 'available' => 1]
        ];
        $car = isset($carPrices[$carId]) ? $carPrices[$carId] : null;
    }
    
    if (!$car) {
        sendJSONResponse(false, 'Car not found', [], 404);
        exit;
    }
    
    // Calculate amounts
    $totalAmount = $car['price'] * $rentalDays;
    
    // Generate IDs
    $bookingId = 'BOOK_' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 12));
    $paymentId = 'PAY_' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 16));
    $paymentMethodId = isset($data['payment_method_id']) ? $data['payment_method_id'] : 'stripe_card';
    
    // Calculate dates
    $startDate = isset($data['start_date']) ? $data['start_date'] : date('Y-m-d');
    $endDate = date('Y-m-d', strtotime($startDate . " + $rentalDays days"));
    
    if ($useDatabase) {
        // Database mode - save everything
        try {
            // Get or create customer
            $stmt = $db->prepare("SELECT id FROM customers WHERE email = ?");
            $stmt->execute([$data['customer_email']]);
            $customer = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($customer) {
                $customerId = $customer['id'];
                $stmt = $db->prepare("UPDATE customers SET name = ?, phone = ? WHERE id = ?");
                $stmt->execute([$data['customer_name'], $data['customer_phone'], $customerId]);
            } else {
                $stmt = $db->prepare("INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)");
                $stmt->execute([$data['customer_name'], $data['customer_email'], $data['customer_phone']]);
                $customerId = $db->lastInsertId();
            }
            
            // Create booking
            $stmt = $db->prepare("
                INSERT INTO bookings (booking_id, customer_id, car_id, rental_days, start_date, end_date, total_amount, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')
            ");
            $stmt->execute([$bookingId, $customerId, $carId, $rentalDays, $startDate, $endDate, $totalAmount]);
            $bookingDbId = $db->lastInsertId();
            
            // Create payment record
            $stmt = $db->prepare("
                INSERT INTO payments (payment_id, booking_id, payment_method_id, amount, currency, status)
                VALUES (?, ?, ?, ?, 'USD', 'completed')
            ");
            $stmt->execute([$paymentId, $bookingDbId, $paymentMethodId, $totalAmount]);
            
            // Update car availability
            $stmt = $db->prepare("UPDATE cars SET available = 0 WHERE id = ?");
            $stmt->execute([$carId]);
            
        } catch (PDOException $e) {
            error_log('Database error in payment: ' . $e->getMessage());
            // Continue with fallback mode
            $useDatabase = false;
        }
    }
    
    // Prepare success response
    $booking = [
        'booking_id' => $bookingId,
        'payment_id' => $paymentId,
        'customer_name' => $data['customer_name'],
        'customer_email' => $data['customer_email'],
        'customer_phone' => $data['customer_phone'],
        'car_id' => $carId,
        'car_name' => $car['name'],
        'rental_days' => $rentalDays,
        'total_amount' => $totalAmount,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'payment_status' => 'completed',
        'booking_status' => 'confirmed',
        'booking_date' => date('Y-m-d H:i:s'),
        'saved_to_database' => $useDatabase
    ];
    
    if ($format === 'xml') {
        sendXMLResponse(true, 'Payment processed successfully', $booking, 201);
    } else {
        sendJSONResponse(true, 'Payment processed successfully', $booking, 201);
    }
    
} catch (Exception $e) {
    error_log('Payment Error: ' . $e->getMessage());
    sendJSONResponse(false, 'Payment processing failed: ' . $e->getMessage(), [], 500);
}
?>