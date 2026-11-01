from __future__ import annotations
import numpy as np
import pandas as pd

FEATURE_COLS = [
    "ret_1", "ret_5", "ret_10", "ret_20",
    "vol_10", "vol_20", "vol_ratio",
    "rsi_14", "rsi_7",
    "ema_ratio", "price_sma20", "price_sma50",
    "macd", "macd_hist", "macd_signal_cross",
    "bb_width", "bb_pos",
    "momentum_10", "momentum_20",
    "high_low_range", "close_location",
]

def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))

def ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()

def macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    ema_fast = ema(series, fast)
    ema_slow = ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = ema(macd_line, signal)
    hist = macd_line - signal_line
    return pd.DataFrame({"macd": macd_line, "macd_signal": signal_line, "macd_hist": hist})

def bollinger(series: pd.Series, period: int = 20, num_std: float = 2.0) -> pd.DataFrame:
    mid = series.rolling(period).mean()
    std = series.rolling(period).std()
    upper = mid + num_std * std
    lower = mid - num_std * std
    width = (upper - lower) / mid
    position = (series - lower) / (upper - lower)
    return pd.DataFrame({"bb_mid": mid, "bb_upper": upper, "bb_lower": lower, "bb_width": width, "bb_pos": position})

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["ret_1"] = out["close"].pct_change(1)
    out["ret_5"] = out["close"].pct_change(5)
    out["ret_10"] = out["close"].pct_change(10)
    out["ret_20"] = out["close"].pct_change(20)
    out["vol_10"] = out["ret_1"].rolling(10).std()
    out["vol_20"] = out["ret_1"].rolling(20).std()
    out["rsi_14"] = rsi(out["close"], 14)
    out["rsi_7"] = rsi(out["close"], 7)
    out["ema_12"] = ema(out["close"], 12)
    out["ema_26"] = ema(out["close"], 26)
    out["sma_20"] = out["close"].rolling(20).mean()
    out["sma_50"] = out["close"].rolling(50).mean()
    out["ema_ratio"] = out["ema_12"] / out["ema_26"]
    out["price_sma20"] = out["close"] / out["sma_20"]
    out["price_sma50"] = out["close"] / out["sma_50"]
    macd_df = macd(out["close"])
    out = out.join(macd_df)
    out["macd_signal_cross"] = (out["macd"] - out["macd_signal"]).clip(-1, 1)
    bb = bollinger(out["close"])
    out = out.join(bb)
    out["vol_ratio"] = out["volume"] / out["volume"].rolling(20).mean()
    out["momentum_10"] = out["close"] / out["close"].shift(10) - 1
    out["momentum_20"] = out["close"] / out["close"].shift(20) - 1
    out["high_low_range"] = (out["high"] - out["low"]) / out["close"]
    out["close_location"] = (out["close"] - out["low"]) / (out["high"] - out["low"]).replace(0, np.nan)
    return out

def make_target(df: pd.DataFrame, horizon: int = 5, threshold: float = 0.0) -> pd.Series:
    forward = df["close"].shift(-horizon) / df["close"] - 1.0
    return (forward > threshold).astype(int)

def make_target_reg(df: pd.DataFrame, horizon: int = 5) -> pd.Series:
    return df["close"].shift(-horizon) / df["close"] - 1.0
