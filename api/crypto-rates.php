<?php
/**
 * Cryptocurrency Rates API
 * Evolentra Platform
 * 
 * Fetches live cryptocurrency rates from CoinGecko API
 * Caches rates for 5 minutes to reduce API calls
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'config/database.php';
require_once 'config/constants.php';

// Cache file path
$cache_file = __DIR__ . '/cache/crypto_rates.json';
$cache_duration = 300; // 5 minutes in seconds

/**
 * Fetch rates from CoinGecko API
 */
function fetchRatesFromAPI() {
    $url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,tron,ripple&vs_currencies=usd';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($http_code === 200 && $response) {
        $data = json_decode($response, true);
        
        if ($data) {
            return [
                'BTC' => $data['bitcoin']['usd'] ?? 0,
                'ETH' => $data['ethereum']['usd'] ?? 0,
                'USDT' => $data['tether']['usd'] ?? 1.00,
                'TRX' => $data['tron']['usd'] ?? 0,
                'XRP' => $data['ripple']['usd'] ?? 0
            ];
        }
    }
    
    return null;
}

/**
 * Get cached rates or fetch new ones
 */
function getRates() {
    global $cache_file, $cache_duration;
    
    // CUSTOM FIXED RATES
    // ALL RATES ARE: "How many crypto units you get for 1 USD"
    
    $custom_rates = [
        'BTC' => 166,        // 1 USD = 166 BTC (Local Currency Mode)
        'ETH' => 156,        // 1 USD = 156 ETH
        'USDT' => 1,         // 1 USD = 1 USDT
        'TRX' => 8.33,       // 1 USD = 8.33 TRX (approx $0.12/TRX flipped)
        'XRP' => 1.72        // 1 USD = 1.72 XRP (approx $0.58/XRP flipped)
    ];
    
    return [
        'rates' => $custom_rates,
        'timestamp' => time(),
        'last_updated' => date('c'),
        'cache_expires' => date('c', time() + 300),
        'custom_rates' => true
    ];
}

/**
 * Convert USD rates to local currency (NOT USED with custom rates)
 */
function convertToLocalCurrency($rates, $multiplier) {
    return [
        'BTC' => $rates['BTC'] * $multiplier,
        'ETH' => $rates['ETH'] * $multiplier,
        'USDT' => $rates['USDT'] * $multiplier,
        'TRX' => $rates['TRX'] * $multiplier,
        'XRP' => $rates['XRP'] * $multiplier
    ];
}

try {
    $data = getRates();
    
    sendResponse(HTTP_OK, $data, 'Rates fetched successfully');
    
} catch (Exception $e) {
    error_log("Crypto rates error: " . $e->getMessage());
    sendResponse(HTTP_INTERNAL_ERROR, [], ERROR_SERVER);
}
?>
