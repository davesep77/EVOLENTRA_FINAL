import useCryptoRates from '../hooks/useCryptoRates';
import './MultiCurrencyDisplay.css';

export default function MultiCurrencyDisplay({ usdAmount, label = "Amount", showRates = false }) {
    const { rates, convertUSD, formatCurrency, getCurrencySymbol, lastUpdated, loading } = useCryptoRates();

    const currencies = ['BTC', 'ETH', 'USDT', 'TRX', 'XRP'];

    if (loading) {
        return (
            <div className="multi-currency-display">
                <div className="currency-loading">Loading rates...</div>
            </div>
        );
    }

    return (
        <div className="multi-currency-display">
            {label && <div className="currency-label">{label}</div>}

            <div className="currency-grid">
                {currencies.map((currency) => {
                    const cryptoAmount = convertUSD(usdAmount, currency);
                    const formattedAmount = formatCurrency(cryptoAmount, currency);
                    const symbol = getCurrencySymbol(currency);

                    return (
                        <div key={currency} className={`currency-item currency-${currency.toLowerCase()}`}>
                            <div className="currency-icon">
                                <span className="crypto-symbol">{symbol}</span>
                            </div>
                            <div className="currency-info">
                                <span className="currency-name">{currency}</span>
                                <span className="currency-value">{formattedAmount}</span>
                                {showRates && (
                                    <span className="currency-rate">
                                        1 USD = {rates[currency].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {lastUpdated && (
                <div className="currency-update-time">
                    Last updated: {new Date(lastUpdated).toLocaleTimeString()}
                </div>
            )}
        </div>
    );
}
