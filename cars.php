<?php
/**
 * Cars API - CRUD Operations with Database
 * Handles all car-related API requests
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config.php';

// Get request method
$method = $_SERVER['REQUEST_METHOD'];
$format = isset($_GET['format']) ? strtolower($_GET['format']) : 'json';

// Get database connection
$db = getDBConnection();

// If no database, use fallback data
$useFallback = ($db === null);

// Route based on method
switch ($method) {
    case 'GET':
        handleGet($db, $format, $useFallback);
        break;
    case 'POST':
        handlePost($db, $format, $useFallback);
        break;
    case 'PUT':
        handlePut($db, $format, $useFallback);
        break;
    case 'DELETE':
        handleDelete($db, $format, $useFallback);
        break;
    default:
        sendResponse(false, 'Method not allowed', [], 405, $format);
}

/**
 * Handle GET requests
 */
function handleGet($db, $format, $useFallback) {
    try {
        if ($useFallback) {
            $cars = getFallbackCars();
            
            // Filter by ID
            if (isset($_GET['id'])) {
                $id = intval($_GET['id']);
                $cars = array_filter($cars, function($car) use ($id) {
                    return $car['id'] == $id;
                });
            }
            
            // Search
            if (isset($_GET['search'])) {
                $search = $_GET['search'];
                $cars = array_filter($cars, function($car) use ($search) {
                    return stripos($car['name'], $search) !== false || 
                           stripos($car['type'], $search) !== false;
                });
            }
            
            sendResponse(true, 'Cars retrieved successfully', [
                'cars' => array_values($cars),
                'count' => count($cars)
            ], 200, $format);
        } else {
            // Database mode
            if (isset($_GET['id'])) {
                $id = intval($_GET['id']);
                $stmt = $db->prepare("SELECT * FROM cars WHERE id = ?");
                $stmt->execute([$id]);
                $car = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($car) {
                    sendResponse(true, 'Car found', ['cars' => [$car]], 200, $format);
                } else {
                    sendResponse(false, 'Car not found', [], 404, $format);
                }
            } elseif (isset($_GET['search'])) {
                $search = '%' . $_GET['search'] . '%';
                $stmt = $db->prepare("SELECT * FROM cars WHERE name LIKE ? OR type LIKE ? ORDER BY id DESC");
                $stmt->execute([$search, $search]);
                $cars = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                sendResponse(true, 'Search results', [
                    'cars' => $cars,
                    'count' => count($cars)
                ], 200, $format);
            } else {
                $stmt = $db->query("SELECT * FROM cars ORDER BY id DESC");
                $cars = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                sendResponse(true, 'Cars retrieved successfully', [
                    'cars' => $cars,
                    'count' => count($cars)
                ], 200, $format);
            }
        }
    } catch (Exception $e) {
        error_log('GET Cars Error: ' . $e->getMessage());
        sendResponse(false, 'Failed to retrieve cars', [], 500, $format);
    }
}

/**
 * Handle POST requests - Create new car
 */
function handlePost($db, $format, $useFallback) {
    if ($useFallback) {
        sendResponse(false, 'Database not connected. Cannot add cars in fallback mode.', [], 503, $format);
        return;
    }
    
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        $required = ['name', 'type', 'price', 'year', 'transmission', 'fuel', 'seats', 'description'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                sendResponse(false, "Missing required field: $field", [], 400, $format);
            }
        }
        
        // Insert car
        $stmt = $db->prepare("
            INSERT INTO cars (name, type, price, description, image, year, transmission, fuel, seats, available)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $image = isset($data['image']) ? $data['image'] : 'images/placeholder.jpg';
        $available = isset($data['available']) ? ($data['available'] ? 1 : 0) : 1;
        
        $stmt->execute([
            $data['name'],
            $data['type'],
            $data['price'],
            $data['description'],
            $image,
            $data['year'],
            $data['transmission'],
            $data['fuel'],
            $data['seats'],
            $available
        ]);
        
        $carId = $db->lastInsertId();
        
        sendResponse(true, 'Car added successfully', ['car_id' => $carId], 201, $format);
        
    } catch (Exception $e) {
        error_log('POST Car Error: ' . $e->getMessage());
        sendResponse(false, 'Failed to add car', [], 500, $format);
    }
}

/**
 * Handle PUT requests - Update car
 */
function handlePut($db, $format, $useFallback) {
    if ($useFallback) {
        sendResponse(false, 'Database not connected. Cannot update cars in fallback mode.', [], 503, $format);
        return;
    }
    
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['id'])) {
            sendResponse(false, 'Car ID is required', [], 400, $format);
        }
        
        $id = intval($data['id']);
        
        // Build update query dynamically
        $updates = [];
        $params = [];
        
        $allowedFields = ['name', 'type', 'price', 'description', 'image', 'year', 'transmission', 'fuel', 'seats', 'available'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updates[] = "$field = ?";
                $params[] = $data[$field];
            }
        }
        
        if (empty($updates)) {
            sendResponse(false, 'No fields to update', [], 400, $format);
        }
        
        $params[] = $id;
        $sql = "UPDATE cars SET " . implode(', ', $updates) . " WHERE id = ?";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        
        if ($stmt->rowCount() > 0) {
            sendResponse(true, 'Car updated successfully', ['car_id' => $id], 200, $format);
        } else {
            sendResponse(false, 'Car not found or no changes made', [], 404, $format);
        }
        
    } catch (Exception $e) {
        error_log('PUT Car Error: ' . $e->getMessage());
        sendResponse(false, 'Failed to update car', [], 500, $format);
    }
}

/**
 * Handle DELETE requests
 */
function handleDelete($db, $format, $useFallback) {
    if ($useFallback) {
        sendResponse(false, 'Database not connected. Cannot delete cars in fallback mode.', [], 503, $format);
        return;
    }
    
    try {
        if (!isset($_GET['id'])) {
            sendResponse(false, 'Car ID is required', [], 400, $format);
        }
        
        $id = intval($_GET['id']);
        
        $stmt = $db->prepare("DELETE FROM cars WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            sendResponse(true, 'Car deleted successfully', [], 200, $format);
        } else {
            sendResponse(false, 'Car not found', [], 404, $format);
        }
        
    } catch (Exception $e) {
        error_log('DELETE Car Error: ' . $e->getMessage());
        sendResponse(false, 'Failed to delete car', [], 500, $format);
    }
}

/**
 * Fallback car data
 */
function getFallbackCars() {
    return [
        ['id' => 1, 'name' => 'BMW 5 Series', 'price' => 350, 'description' => 'Luxury Sedan, 4 Seats, Automatic', 'image' => 'images/car1.jpg', 'year' => 2023, 'transmission' => 'Automatic', 'fuel' => 'Petrol', 'seats' => 4, 'type' => 'Luxury Sedan', 'available' => true],
        ['id' => 2, 'name' => 'Mercedes E-Class', 'price' => 400, 'description' => 'Luxury Sedan, 5 Seats, Automatic Diesel', 'image' => 'images/car2.jpg', 'year' => 2023, 'transmission' => 'Automatic', 'fuel' => 'Diesel', 'seats' => 5, 'type' => 'Luxury Sedan', 'available' => true],
        ['id' => 3, 'name' => 'Audi Q7', 'price' => 450, 'description' => 'Luxury SUV, 7 Seats, Automatic Petrol', 'image' => 'images/car3.jpg', 'year' => 2023, 'transmission' => 'Automatic', 'fuel' => 'Petrol', 'seats' => 7, 'type' => 'Luxury SUV', 'available' => true],
        ['id' => 4, 'name' => 'Dodge Challenger', 'price' => 1000, 'description' => 'Muscle Car, 2 Seats, Automatic Petrol', 'image' => 'images/car4.jpg', 'year' => 2025, 'transmission' => 'Automatic', 'fuel' => 'Petrol', 'seats' => 2, 'type' => 'Muscle Car', 'available' => true],
        ['id' => 5, 'name' => 'BMW Sedan', 'price' => 460, 'description' => 'Muscle Car, 4 Seats, Automatic Petrol', 'image' => 'images/car5.jpg', 'year' => 2025, 'transmission' => 'Automatic', 'fuel' => 'Petrol', 'seats' => 4, 'type' => 'Luxury Sedan', 'available' => true],
        ['id' => 6, 'name' => 'Ford Mustang', 'price' => 1700, 'description' => 'Luxury Muscle Car', 'image' => 'images/car6.jpg', 'year' => 2024, 'transmission' => 'Automatic/Manual', 'fuel' => 'Diesel', 'seats' => 4, 'type' => 'Luxury Sedan', 'available' => true],
        ['id' => 7, 'name' => 'Porsche 911', 'price' => 860, 'description' => 'Sports Car, 2 Seats', 'image' => 'images/car7.jpg', 'year' => 2025, 'transmission' => 'Automatic/manual', 'fuel' => 'Petrol', 'seats' => 4, 'type' => 'Luxury Sedan', 'available' => true],
        ['id' => 8, 'name' => 'Tesla Model 3', 'price' => 930, 'description' => 'Electric Sedan, 5 Seats', 'image' => 'images/car8.jpg', 'year' => 2025, 'transmission' => 'Automatic', 'fuel' => 'Electric', 'seats' => 5, 'type' => 'Luxury Sedan', 'available' => true]
    ];
}

/**
 * Send response - Uses functions from config.php
 */
function sendResponse($success, $message, $data = [], $httpCode = 200, $format = 'json') {
    if ($format === 'xml') {
        sendXMLResponse($success, $message, $data, $httpCode);
    } else {
        sendJSONResponse($success, $message, $data, $httpCode);
    }
}
?>