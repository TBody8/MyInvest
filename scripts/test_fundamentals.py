import sys
import unittest
from pathlib import Path
import pandas as pd
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src' / 'lib'))
from fundamental_math import complete_sum, add_yoy, financial_point, ratio
from valuation_measures import historical_valuation_measures


class FinancialTests(unittest.TestCase):
    def test_historical_valuation_measures_yahoo_orientation(self):
        frame = pd.DataFrame({
            'Current': {'Trailing P/E': 40, 'Forward P/E': 35},
            '9/30/2026': {'Trailing P/E': 38, 'Forward P/E': 34, 'Price/Sales': 10},
            '6/30/2026': {'Trailing P/E': 32, 'Enterprise Value/EBITDA': 21},
        })
        points = historical_valuation_measures(frame)
        self.assertEqual([p['period'] for p in points], ['30/09/2026', '30/06/2026'])
        self.assertEqual(points[0]['trailingPE'], 38)
        self.assertEqual(points[0]['priceToSales'], 10)
        self.assertEqual(points[1]['enterpriseToEbitda'], 21)
        self.assertEqual(historical_valuation_measures(frame.T), points)
        self.assertEqual(historical_valuation_measures(pd.DataFrame()), [])

    def test_missing_is_not_zero(self):
        self.assertIsNone(complete_sum([10, None, 20, 30]))
        self.assertEqual(complete_sum([10, 0, -10, 0]), 0)
        self.assertIsNone(ratio(100, -50))

    def test_yoy_matches_year_not_previous_quarter(self):
        points = [{'date': d, 'revenue': v, 'netIncome': v, 'eps': v} for d, v in [('2024-03-31', 100), ('2024-12-31', 200), ('2025-03-31', 120)]]
        result = add_yoy(points)
        self.assertAlmostEqual(result[-1]['revenueYoY'], 20)
        points[-1]['revenue'] = 0
        self.assertAlmostEqual(add_yoy(points)[-1]['revenueYoY'], -100)

    def test_accounting_and_missing_cashflow(self):
        dates = list(pd.to_datetime(['2024-03-31', '2024-06-30', '2024-09-30', '2024-12-31']))
        fin = pd.DataFrame({d: {'Total Revenue': 100, 'Gross Profit': 50, 'Operating Income': 20, 'EBIT': 30, 'EBITDA': 40, 'Net Income': -5, 'Tax Rate For Calcs': 0} for d in dates})
        cf = pd.DataFrame({d: {'Operating Cash Flow': 30, 'Capital Expenditure': -10} for d in dates})
        bs = pd.DataFrame({dates[-1]: {'Cash Cash Equivalents And Short Term Investments': 150, 'Total Debt': 100, 'Net Debt': -20}})
        p = financial_point(fin, cf, bs, dates, 'TTM', True)
        self.assertEqual(p['operatingMargin'], 20)
        self.assertEqual(p['netMargin'], -5)
        self.assertEqual(p['freeCashFlow'], 80)
        self.assertEqual(p['netDebt'], -50)
        self.assertAlmostEqual(p['netDebtToEbitda'], -50 / 160)
        cf.loc['Operating Cash Flow', dates[0]] = float('nan')
        self.assertIsNone(financial_point(fin, cf, bs, dates, 'TTM', True)['freeCashFlow'])


if __name__ == '__main__':
    unittest.main()
