import { useState, useEffect } from 'react';

/**
 * Custom hook for managing cryptocurrency rates
 * Fetches rates from API and auto-refreshes every 5 minutes
 */
export default function useCryptoRates() {
    const [rates, setRates] = useState({
        BTC: 43000,
        ETH: 2250,
        USDT: 1.00,
        TRX: 0.12,
        XRP: 0.58
    });
    const [lastUpdated, setLastUpdated] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRates = async () => {
        try {
            const response = await fetch('/api/crypto-rates.php');
            const data = await response.json();

            if (data.success && data.data.rates) {
                setRates(data.data.rates);
                setLastUpdated(data.data.last_updated);
                setError(null);
            }
        } catch (err) {
            console.error('Error fetching crypto rates:', err);
            setError('Failed to fetch rates');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch rates immediately
        fetchRates();

        // Set up auto-refresh every 5 minutes
        const interval = setInterval(fetchRates, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    /**
     * Convert USD amount to cryptocurrency
     * Rate is "Units per USD" so we MULTIPLY
     */
    const convertUSD = (usdAmount, currency) => {
        if (!rates[currency]) return 0;
        return usdAmount * rates[currency];
    };

    /**
     * Convert cryptocurrency to USD
     * Rate is "Units per USD" so we DIVIDE
     */
    const convertToUSD = (cryptoAmount, currency) => {
        if (!rates[currency]) return 0;
        return cryptoAmount / rates[currency];
    };

    /**
     * Format currency value with appropriate decimals
     */
    const formatCurrency = (amount, currency) => {
        const decimals = {
            BTC: 8,
            ETH: 6,
            USDT: 2,
            TRX: 2,
            XRP: 4
        };

        return amount.toFixed(decimals[currency] || 2);
    };

    /**
     * Get currency symbol
     */
    const getCurrencySymbol = (currency) => {
        const symbols = {
            BTC: '₿',
            ETH: 'Ξ',
            USDT: '₮',
            TRX: 'TRX',
            XRP: 'XRP'
        };

        return symbols[currency] || currency;
    };

    return {
        rates,
        lastUpdated,
        loading,
        error,
        convertUSD,
        convertToUSD,
        formatCurrency,
        getCurrencySymbol,
        refresh: fetchRates
    };
}
