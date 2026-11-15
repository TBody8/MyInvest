import pandas as pd

from fundamental_math import number


METRICS = {
    'trailingPE': ('Trailing P/E', 'PeRatio'),
    'forwardPE': ('Forward P/E', 'ForwardPeRatio'),
    'priceToSales': ('Price/Sales', 'PsRatio'),
    'enterpriseToEbitda': ('Enterprise Value/EBITDA', 'EnterprisesValueEBITDARatio'),
    'enterpriseToRevenue': ('Enterprise Value/Revenue', 'EnterprisesValueRevenueRatio'),
}


def historical_valuation_measures(frame):
    if frame is None or frame.empty:
        return []
    # Yahoo/yfinance returns metrics as rows and periods as columns; accept the
    # older transposed format too, but never present "Current" as historical.
    rows = frame.T if any(label in frame.index for labels in METRICS.values() for label in labels) else frame
    points = []
    for period, row in rows.iterrows():
        date = pd.to_datetime(period, errors='coerce')
        if pd.isna(date):
            continue
        item = {'period': date.strftime('%d/%m/%Y')}
        for key, labels in METRICS.items():
            item[key] = next((n for label in labels if (n := number(row.get(label))) is not None), None)
        if any(item[key] is not None for key in METRICS):
            points.append((date, item))
    return [item for _, item in sorted(points, key=lambda pair: pair[0], reverse=True)]
