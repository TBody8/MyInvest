"""Financial calculations. Missing observations remain missing, never zero."""
import math
import pandas as pd


def number(value):
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (ValueError, TypeError):
        return None


def value(frame, names, date):
    if frame is None or date not in frame.columns:
        return None
    for name in names:
        if name in frame.index:
            result = number(frame.loc[name, date])
            if result is not None:
                return result
    return None


def ratio(numerator, denominator, percent=False):
    if numerator is None or denominator is None or denominator <= 0:
        return None
    return numerator / denominator * (100 if percent else 1)


def complete_sum(values):
    return sum(values) if values and all(v is not None for v in values) else None


FLOW_FIELDS = {
    'revenue': ['Total Revenue', 'Operating Revenue'],
    'grossProfit': ['Gross Profit'],
    'ebitda': ['EBITDA'],
    'operatingIncome': ['Operating Income'],
    'netIncome': ['Net Income Common Stockholders', 'Net Income'],
    'eps': ['Diluted EPS'],
    'ebit': ['EBIT'],
    'interest': ['Interest Expense', 'Interest Expense Non Operating'],
}


def financial_point(fin, cf, bs, dates, label, annualized=False):
    latest = dates[-1]
    p = {'period': label, 'date': latest.strftime('%Y-%m-%d'), 'isForecast': False}
    for field, names in FLOW_FIELDS.items():
        p[field] = complete_sum([value(fin, names, d) for d in dates])
    p['operatingCashFlow'] = complete_sum([value(cf, ['Operating Cash Flow', 'Cash Flow From Continuing Operating Activities'], d) for d in dates])
    capex = [value(cf, ['Capital Expenditure'], d) for d in dates]
    p['capex'] = complete_sum([abs(v) if v is not None else None for v in capex])
    fcfs = []
    for d in dates:
        fcf = value(cf, ['Free Cash Flow'], d)
        ocf = value(cf, ['Operating Cash Flow', 'Cash Flow From Continuing Operating Activities'], d)
        cx = value(cf, ['Capital Expenditure'], d)
        if fcf is None and ocf is not None and cx is not None:
            fcf = ocf - abs(cx)
        fcfs.append(fcf)
    p['freeCashFlow'] = complete_sum(fcfs)
    # Cash includes short-term investments; net debt uses exactly this same scope.
    cash = value(bs, ['Cash Cash Equivalents And Short Term Investments', 'Cash And Cash Equivalents'], latest)
    debt = value(bs, ['Total Debt'], latest)
    p.update(cashAndEquivalents=cash, totalDebt=debt, netDebt=debt - cash if debt is not None and cash is not None else None)
    equity = value(bs, ['Stockholders Equity', 'Common Stock Equity'], latest)
    capital = value(bs, ['Invested Capital'], latest)
    assets = value(bs, ['Current Assets'], latest)
    liabilities = value(bs, ['Current Liabilities'], latest)
    receivables = value(bs, ['Receivables', 'Accounts Receivable'], latest)
    for target, source in [('grossMargin', 'grossProfit'), ('ebitdaMargin', 'ebitda'), ('operatingMargin', 'operatingIncome'), ('netMargin', 'netIncome'), ('fcfMargin', 'freeCashFlow')]:
        p[target] = ratio(p[source], p['revenue'], True)
    # ROE/ROIC: full-year flows / average opening and closing balance.
    prior = latest - pd.DateOffset(years=1)
    prior_dates = [d for d in bs.columns if abs((d - prior).days) <= 15] if bs is not None else []
    prior_date = min(prior_dates, key=lambda d: abs((d - prior).days)) if prior_dates else None
    old_equity = value(bs, ['Stockholders Equity', 'Common Stock Equity'], prior_date)
    old_capital = value(bs, ['Invested Capital'], prior_date)
    avg_equity = (equity + old_equity) / 2 if equity is not None and old_equity is not None and equity > 0 and old_equity > 0 else None
    avg_capital = (capital + old_capital) / 2 if capital is not None and old_capital is not None and capital > 0 and old_capital > 0 else None
    eff_equity = avg_equity if avg_equity is not None else (equity if equity is not None and equity > 0 else None)
    eff_capital = avg_capital if avg_capital is not None else (capital if capital is not None and capital > 0 else None)
    nopats = []
    for d in dates:
        op = value(fin, ['Operating Income'], d)
        tax = value(fin, ['Tax Rate For Calcs'], d)
        nopats.append(op * (1 - tax) if op is not None and tax is not None and 0 <= tax <= 1 else None)
    nopat_sum = complete_sum(nopats)
    mult = 1 if annualized else 4
    p['roe'] = ratio(p['netIncome'] * mult if p['netIncome'] is not None else None, eff_equity, True)
    p['roic'] = ratio(nopat_sum * mult if nopat_sum is not None else None, eff_capital, True)
    shares = [value(fin, ['Diluted Average Shares'], d) for d in dates]
    avg_shares = sum(shares) / len(shares) if all(s is not None and s > 0 for s in shares) else None
    p['fcfPerShare'] = ratio(p['freeCashFlow'], avg_shares)
    p['cashConversion'] = ratio(p['freeCashFlow'], p['netIncome'], True)
    p['capexCoverage'] = ratio(p['operatingCashFlow'], p['capex'])
    p['netDebtToEbitda'] = ratio(p['netDebt'], p['ebitda']) if annualized else None
    p['debtToEquity'] = ratio(debt, equity)
    p['currentRatio'] = ratio(assets, liabilities)
    p['quickRatio'] = ratio(cash + receivables if cash is not None and receivables is not None else None, liabilities)
    p['interestCoverage'] = ratio(p['ebit'], abs(p['interest']) if p['interest'] is not None else None)
    return p


def add_yoy(points):
    for p in points:
        target = pd.Timestamp(p['date']) - pd.DateOffset(years=1)
        candidates = [q for q in points if abs((pd.Timestamp(q['date']) - target).days) <= 10]
        previous = min(candidates, key=lambda q: abs((pd.Timestamp(q['date']) - target).days)) if candidates else None
        for field in ['revenue', 'netIncome', 'eps']:
            old = previous.get(field) if previous else None
            current = p.get(field)
            p[field + 'YoY'] = (current - old) / old * 100 if current is not None and old is not None and old > 0 else None
    return points
