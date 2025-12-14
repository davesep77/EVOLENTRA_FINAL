<?php
/**
 * Database Configuration
 * Evolentra Platform
 */

class Database {
    private $host = "localhost:3310";
    private $db_name = "evolentra";
    private $username = "root";
    private $password = "";
    private $conn;

    /**
     * Get database connection
     */
    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new mysqli($this->host, $this->username, $this->password, $this->db_name);
            
            if ($this->conn->connect_error) {
                throw new Exception("Connection failed: " . $this->conn->connect_error);
            }
            
            // Set charset
            $this->conn->set_charset("utf8mb4");
            
        } catch(Exception $e) {
            error_log("Connection error: " . $e->getMessage());
            return null;
        }

        return $this->conn;
    }
    
    /**
     * Close database connection
     */
    public function closeConnection() {
        if ($this->conn) {
            $this->conn->close();
        }
    }
}
?>
