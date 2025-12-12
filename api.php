<?php
require 'config.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch($action) {
    case 'rooms':
        $stmt = $pdo->query("SELECT * FROM rooms ORDER BY room_number");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;
        
    case 'stats':
        $stmt = $pdo->query("SELECT status, COUNT(*) as count FROM rooms GROUP BY status");
        $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($stats);
        break;
        
    case 'bookings':
        $stmt = $pdo->query("SELECT b.*, g.name as guest_name, r.room_number, r.type 
                            FROM bookings b 
                            JOIN guests g ON b.guest_id = g.id 
                            JOIN rooms r ON b.room_id = r.id 
                            ORDER BY b.booking_date DESC LIMIT 10");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;
        
    case 'create_booking':
        if ($_POST && isLoggedIn()) {
            $stmt = $pdo->prepare("INSERT INTO guests (name, email, phone) VALUES (?, ?, ?) 
                                 ON DUPLICATE KEY UPDATE name=VALUES(name)");
            $stmt->execute([$_POST['guest_name'], $_POST['guest_email'], $_POST['guest_phone']]);
            $guest_id = $pdo->lastInsertId() ?: $pdo->query("SELECT id FROM guests WHERE email = '{$_POST['guest_email']}'")->fetchColumn();
            
            $check_in = $_POST['check_in'];
            $check_out = $_POST['check_out'];
            $room_id = $_POST['room_id'];
            
            $days = (strtotime($check_out) - strtotime($check_in)) / 86400;
            $stmt = $pdo->prepare("SELECT price FROM rooms WHERE id = ?");
            $stmt->execute([$room_id]);
            $price = $stmt->fetchColumn();
            $total = $price * $days;
            
            $stmt = $pdo->prepare("INSERT INTO bookings (guest_id, room_id, check_in, check_out, total_amount) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$guest_id, $room_id, $check_in, $check_out, $total]);
            
            $stmt = $pdo->prepare("UPDATE rooms SET status = 'booked' WHERE id = ?");
            $stmt->execute([$room_id]);
            
            echo json_encode(['success' => true, 'total' => $total]);
        }
        break;
}
?>
