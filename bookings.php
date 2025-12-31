<?php
/**
 * Bookings API - FIXED VERSION
 * No duplicate functions - uses config.php functions
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config.php';

$format = isset($_GET['format']) ? strtolower($_GET['format']) : 'json';

$db = getDBConnection();

if (!$db) {
    if ($format === 'xml') {
        sendXMLResponse(false, 'Database connection failed', [], 500);
    } else {
        sendJSONResponse(false, 'Database connection failed', [], 500);
    }
    exit;
}

try {
    // Get bookings by customer email
    if (isset($_GET['email'])) {
        $email = trim($_GET['email']);
        
        $stmt = $db->prepare("
            SELECT 
                b.booking_id,
                b.rental_days,
                b.start_date,
                b.end_date,
                b.total_amount,
                b.status as booking_status,
                b.created_at,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                car.id as car_id,
                car.name as car_name,
                car.type as car_type,
                car.image as car_image,
                car.price as car_price_per_day,
                p.payment_id,
                p.status as payment_status,
                p.payment_date
            FROM bookings b
            JOIN customers c ON b.customer_id = c.id
            JOIN cars car ON b.car_id = car.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE c.email = ?
            ORDER BY b.created_at DESC
        ");
        
        $stmt->execute([$email]);
        $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($format === 'xml') {
            sendXMLResponse(true, 'Bookings retrieved successfully', [
                'bookings' => $bookings,
                'count' => count($bookings)
            ], 200);
        } else {
            sendJSONResponse(true, 'Bookings retrieved successfully', [
                'bookings' => $bookings,
                'count' => count($bookings)
            ], 200);
        }
    }
    // Get booking by booking ID
    elseif (isset($_GET['booking_id'])) {
        $bookingId = trim($_GET['booking_id']);
        
        $stmt = $db->prepare("
            SELECT 
                b.booking_id,
                b.rental_days,
                b.start_date,
                b.end_date,
                b.total_amount,
                b.status as booking_status,
                b.created_at,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                car.id as car_id,
                car.name as car_name,
                car.type as car_type,
                car.image as car_image,
                car.price as car_price_per_day,
                p.payment_id,
                p.status as payment_status,
                p.payment_date
            FROM bookings b
            JOIN customers c ON b.customer_id = c.id
            JOIN cars car ON b.car_id = car.id
            LEFT JOIN payments p ON b.id = p.booking_id
            WHERE b.booking_id = ?
        ");
        
        $stmt->execute([$bookingId]);
        $booking = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($booking) {
            if ($format === 'xml') {
                sendXMLResponse(true, 'Booking found', ['booking' => $booking], 200);
            } else {
                sendJSONResponse(true, 'Booking found', ['booking' => $booking], 200);
            }
        } else {
            if ($format === 'xml') {
                sendXMLResponse(false, 'Booking not found', [], 404);
            } else {
                sendJSONResponse(false, 'Booking not found', [], 404);
            }
        }
    }
    // Get all bookings (admin)
    else {
        $stmt = $db->query("
            SELECT 
                b.id as internal_id,
                b.booking_id,
                b.rental_days,
                b.start_date,
                b.end_date,
                b.total_amount,
                b.status as booking_status,
                b.created_at,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                car.id as car_id,
                car.name as car_name,
                car.type as car_type,
                car.image as car_image,
                p.payment_id,
                p.status as payment_status,
                p.payment_date
            FROM bookings b
            JOIN customers c ON b.customer_id = c.id
            JOIN cars car ON b.car_id = car.id
            LEFT JOIN payments p ON b.id = p.booking_id
            ORDER BY b.created_at DESC
        ");
        
        $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($format === 'xml') {
            sendXMLResponse(true, 'All bookings retrieved successfully', [
                'bookings' => $bookings,
                'count' => count($bookings)
            ], 200);
        } else {
            sendJSONResponse(true, 'All bookings retrieved successfully', [
                'bookings' => $bookings,
                'count' => count($bookings)
            ], 200);
        }
    }
    
} catch (PDOException $e) {
    error_log('Bookings Error: ' . $e->getMessage());
    if ($format === 'xml') {
        sendXMLResponse(false, 'Failed to retrieve bookings', [], 500);
    } else {
        sendJSONResponse(false, 'Failed to retrieve bookings', [], 500);
    }
}
?>