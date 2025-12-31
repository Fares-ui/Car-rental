<?php
require_once 'config.php';

$db = getDBConnection();

if ($db) {
    echo "✅ Database connection successful!<br>";
    
    // Test cars table
    $stmt = $db->query("SELECT COUNT(*) as count FROM cars");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ Cars in database: " . $result['count'] . "<br>";
    
    // Test customers table
    $stmt = $db->query("SELECT COUNT(*) as count FROM customers");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ Customers in database: " . $result['count'] . "<br>";
    
    // Test bookings table
    $stmt = $db->query("SELECT COUNT(*) as count FROM bookings");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ Bookings in database: " . $result['count'] . "<br>";
    
    echo "<br><strong>✅ All systems operational!</strong>";
} else {
    echo "❌ Database connection failed!";
}
?>