- Database Schema for DriveNow Car Rental System
-- MySQL/MariaDB

-- Create database
CREATE DATABASE IF NOT EXISTS drivenow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE drivenow;

-- Cars table
CREATE TABLE IF NOT EXISTS cars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    year INT NOT NULL,
    transmission VARCHAR(20) NOT NULL,
    fuel VARCHAR(20) NOT NULL,
    seats INT NOT NULL,
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_available (available),
    INDEX idx_type (type),
    INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample car data
INSERT INTO cars (name, type, price, description, image, year, transmission, fuel, seats, available) VALUES
('BMW 5 Series', 'Luxury Sedan', 350.00, 'Luxury Sedan, 4 Seats, Automatic', 'images/car1.jpg', 2023, 'Automatic', 'Petrol', 4, TRUE),
('Mercedes E-Class', 'Luxury Sedan', 400.00, 'Luxury Sedan, 5 Seats, Automatic Diesel', 'images/car2.jpg', 2023, 'Automatic', 'Diesel', 5, TRUE),
('Audi Q7', 'Luxury SUV', 450.00, 'Luxury SUV, 7 Seats, Automatic Petrol', 'images/car3.jpg', 2023, 'Automatic', 'Petrol', 7, TRUE),
('Dodge Challenger', 'Muscle Car', 1000.00, 'Muscle Car, 2 Seats, Automatic Petrol', 'images/car4.jpg', 2025, 'Automatic', 'Petrol', 2, TRUE),
('BMW Sedan', 'Luxury Sedan', 460.00, 'Muscle Car, 4 Seats, Automatic Petrol', 'images/car5.jpg', 2025, 'Automatic', 'Petrol', 4, TRUE),
('Ford Mustang', 'Luxury Sedan', 1700.00, 'Luxury Muscle Car', 'images/car6.jpg', 2024, 'Automatic/Manual', 'Diesel', 4, TRUE),
('Porsche 911', 'Luxury Sedan', 860.00, 'Sports Car, 2 Seats', 'images/car7.jpg', 2025, 'Automatic/manual', 'Petrol', 4, TRUE),
('Tesla Model 3', 'Luxury Sedan', 930.00, 'Electric Sedan, 5 Seats', 'images/car8.jpg', 2025, 'Automatic', 'Electric', 5, TRUE);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    car_id INT NOT NULL,
    rental_days INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    INDEX idx_booking_id (booking_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_car_id (car_id),
    INDEX idx_status (status),
    INDEX idx_start_date (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(50) NOT NULL UNIQUE,
    booking_id INT NOT NULL,
    payment_method_id VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_payment_id (payment_id),
    INDEX idx_booking_id (booking_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contact_id (contact_id),
    INDEX idx_status (status),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users table (for admin panel)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff', 'customer') DEFAULT 'customer',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    customer_id INT NOT NULL,
    car_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    INDEX idx_car_id (car_id),
    INDEX idx_rating (rating),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Car features table
CREATE TABLE IF NOT EXISTS car_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    car_id INT NOT NULL,
    feature VARCHAR(100) NOT NULL,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    INDEX idx_car_id (car_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample features
INSERT INTO car_features (car_id, feature) VALUES
(1, 'Air Conditioning'), (1, 'GPS Navigation'), (1, 'Bluetooth'),
(2, 'Air Conditioning'), (2, 'GPS Navigation'), (2, 'Sunroof'),
(3, 'Air Conditioning'), (3, 'GPS Navigation'), (3, '4WD'), (3, 'Third Row Seating'),
(4, 'Sport Package'), (4, 'Premium Sound'), (4, 'Performance Exhaust'),
(5, 'Air Conditioning'), (5, 'GPS Navigation'), (5, 'Leather Seats'),
(6, 'Sport Package'), (6, 'Premium Sound'), (6, 'Manual Transmission Option'),
(7, 'Sport Package'), (7, 'Carbon Fiber Interior'), (7, 'Launch Control'),
(8, 'Autopilot'), (8, 'Premium Interior'), (8, 'Fast Charging');

-- Car images table (for multiple images per car)
CREATE TABLE IF NOT EXISTS car_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    car_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    INDEX idx_car_id (car_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_values TEXT,
    new_values TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create views for common queries

-- View: Available cars with details
CREATE OR REPLACE VIEW available_cars AS
SELECT 
    c.*,
    GROUP_CONCAT(cf.feature SEPARATOR ', ') as features,
    AVG(r.rating) as average_rating,
    COUNT(DISTINCT r.id) as review_count
FROM cars c
LEFT JOIN car_features cf ON c.id = cf.car_id
LEFT JOIN reviews r ON c.id = r.car_id AND r.status = 'approved'
WHERE c.available = TRUE
GROUP BY c.id;

-- View: Booking details with customer and car info
CREATE OR REPLACE VIEW booking_details AS
SELECT 
    b.booking_id,
    b.rental_days,
    b.start_date,
    b.end_date,
    b.total_amount,
    b.status as booking_status,
    c.name as customer_name,
    c.email as customer_email,
    c.phone as customer_phone,
    car.name as car_name,
    car.type as car_type,
    p.payment_id,
    p.status as payment_status,
    p.payment_date
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN cars car ON b.car_id = car.id
LEFT JOIN payments p ON b.id = p.booking_id;

-- Stored procedures

DELIMITER //

-- Procedure: Create booking
CREATE PROCEDURE create_booking(
    IN p_customer_name VARCHAR(100),
    IN p_customer_email VARCHAR(100),
    IN p_customer_phone VARCHAR(20),
    IN p_car_id INT,
    IN p_rental_days INT,
    IN p_start_date DATE,
    OUT p_booking_id VARCHAR(50)
)
BEGIN
    DECLARE v_customer_id INT;
    DECLARE v_end_date DATE;
    DECLARE v_total_amount DECIMAL(10, 2);
    DECLARE v_car_price DECIMAL(10, 2);
    
    -- Get or create customer
    SELECT id INTO v_customer_id FROM customers WHERE email = p_customer_email;
    IF v_customer_id IS NULL THEN
        INSERT INTO customers (name, email, phone) VALUES (p_customer_name, p_customer_email, p_customer_phone);
        SET v_customer_id = LAST_INSERT_ID();
    END IF;
    
    -- Calculate end date and total
    SET v_end_date = DATE_ADD(p_start_date, INTERVAL p_rental_days DAY);
    SELECT price INTO v_car_price FROM cars WHERE id = p_car_id;
    SET v_total_amount = v_car_price * p_rental_days;
    
    -- Generate booking ID
    SET p_booking_id = CONCAT('BOOK_', UPPER(SUBSTRING(MD5(RAND()), 1, 12)));
    
    -- Create booking
    INSERT INTO bookings (booking_id, customer_id, car_id, rental_days, start_date, end_date, total_amount)
    VALUES (p_booking_id, v_customer_id, p_car_id, p_rental_days, p_start_date, v_end_date, v_total_amount);
    
    -- Update car availability
    UPDATE cars SET available = FALSE WHERE id = p_car_id;
END //

-- Procedure: Complete payment
CREATE PROCEDURE complete_payment(
    IN p_booking_id VARCHAR(50),
    IN p_payment_method_id VARCHAR(100),
    IN p_amount DECIMAL(10, 2)
)
BEGIN
    DECLARE v_booking_id_int INT;
    DECLARE v_payment_id VARCHAR(50);
    
    -- Get booking internal ID
    SELECT id INTO v_booking_id_int FROM bookings WHERE booking_id = p_booking_id;
    
    -- Generate payment ID
    SET v_payment_id = CONCAT('PAY_', UPPER(SUBSTRING(MD5(RAND()), 1, 16)));
    
    -- Create payment record
    INSERT INTO payments (payment_id, booking_id, payment_method_id, amount, status)
    VALUES (v_payment_id, v_booking_id_int, p_payment_method_id, p_amount, 'completed');
    
    -- Update booking status
    UPDATE bookings SET status = 'confirmed' WHERE id = v_booking_id_int;
END //

DELIMITER ;

-- Triggers

DELIMITER //

-- Trigger: Audit log for car updates
CREATE TRIGGER audit_car_update
AFTER UPDATE ON cars
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (action, table_name, record_id, old_values, new_values)
    VALUES (
        'UPDATE',
        'cars',
        NEW.id,
        JSON_OBJECT('name', OLD.name, 'price', OLD.price, 'available', OLD.available),
        JSON_OBJECT('name', NEW.name, 'price', NEW.price, 'available', NEW.available)
    );
END //

DELIMITER ;

-- Indexes for performance
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_reviews_created ON reviews(created_at);

-- Grant privileges (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON drivenow.* TO 'drivenow_user'@'localhost' IDENTIFIED BY 'your_password';
-- FLUSH PRIVILEGES;
