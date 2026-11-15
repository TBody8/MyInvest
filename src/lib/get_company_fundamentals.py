import sys
import json
import warnings
from datetime import datetime, timezone
import pandas as pd
import yfinance as yf
from fundamental_math import number, value, financial_point, add_yoy
from valuation_measures import historical_valuation_measures

warnings.simplefilter('ignore')


def optional(call, default=None):
    try:
        result = call()
        return result if result is not None else default
    except Exception:
        return default


def get_company_fundamentals(raw_ticker, period_type='annual'):
    ticker = raw_ticker.split('_')[0].strip().upper()
    mapping = {'IUSQ': 'IUSQ.DE', '6AQQ': '6AQQ.DE', 'IS3N': 'IS3N.DE', 'IUSN': 'IUSN.DE', 'QDVE': 'QDVE.DE'}
    symbol = mapping.get(ticker, ticker)
    try:
        t = yf.Ticker(symbol)
        info = t.info or {}
        if not info or not (info.get('shortName') or info.get('longName')):
            return {'error': 'No se han encontrado datos de esta empresa', 'ticker': ticker}
        quarterly = period_type in ('quarterly', 'ttm')
        fin = t.quarterly_financials if quarterly else t.financials
        cf = t.quarterly_cashflow if quarterly else t.cashflow
        bs = t.quarterly_balance_sheet if quarterly else t.balance_sheet
        columns = sorted([c for c in fin.columns if value(fin, ['Total Revenue', 'Operating Revenue'], c) is not None]) if fin is not None else []
        history = []
        for idx, col in enumerate(columns):
            if period_type == 'ttm':
                if idx < 3:
                    continue
                dates = columns[idx - 3:idx + 1]
                if any(not 65 <= (dates[i] - dates[i-1]).days <= 115 for i in range(1, 4)):
                    continue
                label = 'TTM ' + col.strftime('%m/%y')
            else:
                dates = [col]
                # Month/year avoids mislabelling fiscal quarters as calendar quarters.
                label = col.strftime('%m/%y') if quarterly else col.strftime('%m/%Y')
            history.append(financial_point(fin, cf, bs, dates, label, annualized=period_type != 'quarterly'))
        history = add_yoy(history)[-6:]
        margin_fields = ['grossMargin', 'ebitdaMargin', 'operatingMargin', 'netMargin', 'fcfMargin', 'roe', 'roic', 'cashConversion', 'capexCoverage', 'currentRatio', 'netDebtToEbitda']
        medians = {key: number(pd.Series([p[key] for p in history if p[key] is not None], dtype=float).median()) for key in margin_fields}

        forecasts = []
        # TTM observations have no directly comparable quarterly consensus.
        if period_type != 'ttm' and info.get('financialCurrency') == info.get('currency'):
            rev_est = optional(lambda: t.revenue_estimate)
            earn_est = optional(lambda: t.earnings_estimate)
            periods = [('0y', 'Ejercicio actual (E)'), ('+1y', 'Ejercicio siguiente (E)')] if period_type == 'annual' else [('0q', 'Trimestre actual (E)'), ('+1q', 'Trimestre siguiente (E)')]
            for code, label in periods:
                def estimate(frame, key):
                    return number(frame.loc[code, key]) if frame is not None and code in frame.index and key in frame.columns else None
                rev = estimate(rev_est, 'avg')
                eps = estimate(earn_est, 'avg')
                if rev is None and eps is None:
                    continue
                growth = estimate(rev_est, 'growth')
                eps_growth = estimate(earn_est, 'growth')
                forecasts.append({'period': 'Actual E' if code.startswith('0') else 'Siguiente E', 'label': label, 'code': code, 'isForecast': True,
                    'revenue': rev, 'revenueYoY': growth * 100 if growth is not None else None,
                    'revenueLow': estimate(rev_est, 'low'), 'revenueHigh': estimate(rev_est, 'high'),
                    'eps': eps, 'epsYoY': eps_growth * 100 if eps_growth is not None else None,
                    'netIncome': None, 'netMargin': None, 'numberOfAnalysts': estimate(earn_est, 'numberOfAnalysts')})

        keys = {'trailingPE': 'trailingPE', 'forwardPE': 'forwardPE', 'pegRatio': 'trailingPegRatio',
                'priceToSales': 'priceToSalesTrailing12Months', 'enterpriseToEbitda': 'enterpriseToEbitda',
                'enterpriseToRevenue': 'enterpriseToRevenue', 'priceToBook': 'priceToBook', 'beta': 'beta',
                'targetMeanPrice': 'targetMeanPrice', 'targetHighPrice': 'targetHighPrice', 'targetLowPrice': 'targetLowPrice'}
        valuation = {key: number(info.get(source)) for key, source in keys.items()}
        # trailingAnnualDividendYield is a fraction; dividendYield has changed units upstream.
        dy = number(info.get('trailingAnnualDividendYield'))
        valuation.update(dividendYield=dy * 100 if dy is not None else None,
                         recommendationKey=(info.get('recommendationKey') or 'N/D').upper(),
                         numberOfAnalystOpinions=info.get('numberOfAnalystOpinions'))
        historical_multiples = historical_valuation_measures(optional(lambda: t.get_valuation_measures()))
        return {
            'profile': {'ticker': ticker, 'symbol': symbol, 'name': info.get('longName') or info.get('shortName'),
                'sector': info.get('sector') or ('ETF / Fondo' if info.get('quoteType') == 'ETF' else 'N/D'),
                'industry': info.get('industry') or info.get('category') or 'N/D', 'country': info.get('country'),
                'website': info.get('website'), 'currency': info.get('currency') or None,
                'financialCurrency': info.get('financialCurrency') or None,
                'currentPrice': number(info.get('currentPrice') or info.get('regularMarketPrice')),
                'changePercent': number(info.get('regularMarketChangePercent')), 'marketCap': number(info.get('marketCap')),
                'enterpriseValue': number(info.get('enterpriseValue')), 'logoUrl': f'https://assets.parqet.com/logos/symbol/{ticker}'},
            'periodType': period_type, 'history': history, 'forecasts': forecasts, 'medians': medians,
            'valuation': valuation, 'historicalMultiples': historical_multiples,
            'retrievedAt': datetime.now(timezone.utc).isoformat(), 'source': 'Yahoo Finance / yfinance',
        }
    except Exception as exc:
        return {'error': str(exc), 'ticker': ticker}


if __name__ == '__main__':
    print(json.dumps(get_company_fundamentals(sys.argv[1] if len(sys.argv) > 1 else 'NVDA', sys.argv[2] if len(sys.argv) > 2 else 'annual'), ensure_ascii=False, allow_nan=False))
