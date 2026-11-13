"""Opt-in provider checks, including reconciliation against Apple's published FY25 statements.
Source: https://www.apple.com/newsroom/pdfs/fy2025-q4/FY25_Q4_Consolidated_Financial_Statements.pdf
"""
import sys
import math
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src' / 'lib'))
from get_company_fundamentals import get_company_fundamentals

apple = get_company_fundamentals('AAPL', 'annual')
assert 'error' not in apple, apple
p = next(p for p in apple['history'] if p['date'].startswith('2025-09'))
expected = {'revenue': 416161e6, 'grossProfit': 195201e6, 'operatingIncome': 133050e6,
            'netIncome': 112010e6, 'eps': 7.46, 'operatingCashFlow': 111482e6,
            'capex': 12715e6, 'freeCashFlow': 98767e6, 'cashAndEquivalents': 54697e6}
for key, value in expected.items():
    assert math.isclose(p[key], value, rel_tol=0, abs_tol=0.01), (key, p[key], value)
assert math.isclose(p['operatingMargin'], 133050 / 416161 * 100)
assert math.isclose(p['revenueYoY'], (416161 / 391035 - 1) * 100)
print('PASS AAPL FY2025: nine published amounts, operating margin and YoY reconcile with Apple statements')

for ticker, mode in [('AAPL', 'ttm'), ('INTC', 'annual'), ('TSM', 'annual'), ('MSFT', 'quarterly')]:
    d = get_company_fundamentals(ticker, mode)
    assert 'error' not in d and d['history'], (ticker, mode, d.get('error'))
    for p in d['history']:
        if p['netIncome'] is not None and p['revenue'] and p['revenue'] > 0:
            assert math.isclose(p['netMargin'], p['netIncome'] / p['revenue'] * 100)
        if p['netDebt'] is not None:
            assert math.isclose(p['netDebt'], p['totalDebt'] - p['cashAndEquivalents'])
    if mode == 'ttm':
        assert not d['forecasts']
        assert all(p['period'].startswith('TTM') for p in d['history'])
    if ticker == 'TSM':
        assert d['profile']['financialCurrency'] == 'TWD' and d['profile']['currency'] == 'USD'
        assert not d['forecasts']
    print(f"PASS {ticker} {mode}: {len(d['history'])} periods; consistent margins and net debt; currencies {d['profile']['currency']}/{d['profile']['financialCurrency']}")
