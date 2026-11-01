from __future__ import annotations

import argparse
import json
import ssl
import urllib.request
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, roc_auc_score, log_loss
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from features import FEATURE_COLS, build_features, make_target

SYMBOLS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
    "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "KOTAKBANK.NS", "LT.NS",
    "AXISBANK.NS", "WIPRO.NS", "MARUTI.NS", "SUNPHARMA.NS", "NTPC.NS",
    "POWERGRID.NS", "TITAN.NS", "ULTRACEMCO.NS", "BAJFINANCE.NS", "HINDUNILVR.NS",
]

def fetch_yahoo(symbol: str, range_: str = "5y") -> pd.DataFrame | None:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range={range_}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=60) as r:
            data = json.loads(r.read().decode())
    except Exception as e:
        print("fail", symbol, e)
        return None
    result = data.get("chart", {}).get("result")
    if not result:
        return None
    result = result[0]
    ts = result.get("timestamp") or []
    q = (result.get("indicators") or {}).get("quote") or [{}]
    q = q[0]
    rows = []
    for i, t in enumerate(ts):
        o, h, l, c = q.get("open", [None])[i], q.get("high", [None])[i], q.get("low", [None])[i], q.get("close", [None])[i]
        v = (q.get("volume") or [0])[i] or 0
        if c is None or o is None:
            continue
        rows.append({"date": pd.Timestamp(t, unit="s"), "open": float(o), "high": float(h), "low": float(l), "close": float(c), "volume": float(v), "symbol": symbol})
    if len(rows) < 120:
        return None
    return pd.DataFrame(rows).sort_values("date").reset_index(drop=True)

def load_panel(symbols: list[str]) -> pd.DataFrame:
    frames = []
    for s in symbols:
        df = fetch_yahoo(s)
        if df is None:
            print("skip", s)
            continue
        print("ok", s, "n=", len(df))
        frames.append(df)
    if not frames:
        raise SystemExit("no data")
    return pd.concat(frames, ignore_index=True)

def prepare(df: pd.DataFrame, horizon: int, threshold: float) -> pd.DataFrame:
    parts = []
    for sym, g in df.groupby("symbol"):
        g = g.sort_values("date").reset_index(drop=True)
        f = build_features(g)
        f["target"] = make_target(f, horizon=horizon, threshold=threshold)
        f["symbol"] = sym
        f["date"] = g["date"].values
        parts.append(f)
    out = pd.concat(parts, ignore_index=True)
    return out.dropna(subset=FEATURE_COLS + ["target"]).reset_index(drop=True)

def split_with_embargo(g: pd.DataFrame, horizon: int, train_frac=0.6, val_frac=0.2):
    n = len(g)
    train_end = int(n * train_frac)
    val_end = int(n * (train_frac + val_frac))
    embargo = horizon
    train_idx = list(range(0, max(0, train_end - embargo)))
    val_idx = list(range(train_end, max(train_end, val_end - embargo)))
    test_idx = list(range(val_end, n))
    return train_idx, val_idx, test_idx

def eval_proba(y, proba):
    out = {}
    if len(np.unique(y)) > 1:
        out["auc"] = float(roc_auc_score(y, proba))
        out["log_loss"] = float(log_loss(y, proba, labels=[0, 1]))
    else:
        out["auc"] = None
        out["log_loss"] = None
    out["brier"] = float(brier_score_loss(y, proba))
    pred = (proba >= 0.5).astype(int)
    out["acc"] = float(accuracy_score(y, pred))
    out["pos_rate"] = float(np.mean(y))
    for thr in (0.55, 0.60, 0.65):
        mask = (proba >= thr) | (proba <= 1 - thr)
        if mask.sum() >= 20:
            out[f"acc_confident_{thr}"] = float(accuracy_score(y[mask], (proba[mask] >= 0.5).astype(int)))
            out[f"coverage_{thr}"] = float(mask.mean())
    return out

def main(out_dir: str, horizon: int, threshold: float):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    raw = load_panel(SYMBOLS)
    feats = prepare(raw, horizon, threshold)

    train_rows, val_rows, test_rows = [], [], []
    for sym, g in feats.groupby("symbol"):
        g = g.sort_values("date").reset_index(drop=True)
        tr, va, te = split_with_embargo(g, horizon)
        train_rows.append(g.iloc[tr])
        val_rows.append(g.iloc[va])
        test_rows.append(g.iloc[te])

    train = pd.concat(train_rows, ignore_index=True)
    val = pd.concat(val_rows, ignore_index=True)
    test = pd.concat(test_rows, ignore_index=True)

    X_tr, y_tr = train[FEATURE_COLS], train["target"].astype(int)
    X_va, y_va = val[FEATURE_COLS], val["target"].astype(int)
    X_te, y_te = test[FEATURE_COLS], test["target"].astype(int)

    metrics = {
        "horizon": horizon,
        "threshold": threshold,
        "feature_cols": FEATURE_COLS,
        "n_train": int(len(X_tr)),
        "n_val": int(len(X_va)),
        "n_test": int(len(X_te)),
        "symbols": sorted(feats["symbol"].unique().tolist()),
        "target_def": f"1 if close[t+{horizon}]/close[t]-1 > {threshold}",
        "embargo": horizon,
    }

    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(max_iter=3000, class_weight="balanced", C=0.5, random_state=42)),
    ])
    pipe.fit(X_tr, y_tr)
    proba_te = pipe.predict_proba(X_te)[:, 1]
    metrics["logistic"] = eval_proba(y_te.values, proba_te)
    joblib.dump(pipe, out / "logistic_baseline.joblib")

    scaler = pipe.named_steps["scaler"]
    clf = pipe.named_steps["clf"]
    export = {
        "model": "logistic_baseline",
        "version": "2.0.0",
        "feature_cols": FEATURE_COLS,
        "mean": scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
        "coef": clf.coef_[0].tolist(),
        "intercept": float(clf.intercept_[0]),
        "horizon": horizon,
        "threshold": threshold,
        "metrics": metrics["logistic"],
    }
    with open(out / "logistic_export.json", "w") as f:
        json.dump(export, f, indent=2)

    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=5,
        min_samples_leaf=50,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_tr, y_tr)
    proba_rf = rf.predict_proba(X_te)[:, 1]
    metrics["random_forest"] = eval_proba(y_te.values, proba_rf)
    joblib.dump(rf, out / "rf_model.joblib")

    gb = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.8,
        min_samples_leaf=40,
        random_state=42,
    )
    gb.fit(X_tr, y_tr)
    proba_gb = gb.predict_proba(X_te)[:, 1]
    metrics["gradient_boosting"] = eval_proba(y_te.values, proba_gb)
    joblib.dump(gb, out / "gb_model.joblib")

    try:
        cal = CalibratedClassifierCV(pipe, method="isotonic", cv=3)
        cal.fit(pd.concat([X_tr, X_va]), pd.concat([y_tr, y_va]))
        proba_cal = cal.predict_proba(X_te)[:, 1]
        metrics["logistic_calibrated"] = eval_proba(y_te.values, proba_cal)
        joblib.dump(cal, out / "logistic_calibrated.joblib")
    except Exception as e:
        metrics["logistic_calibrated_error"] = str(e)

    ensemble = (proba_te + proba_rf + proba_gb) / 3.0
    metrics["ensemble"] = eval_proba(y_te.values, ensemble)

    imp = sorted(zip(FEATURE_COLS, gb.feature_importances_.tolist()), key=lambda x: -x[1])
    metrics["gb_feature_importance"] = [{"feature": a, "importance": b} for a, b in imp]

    with open(out / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    print(json.dumps(metrics, indent=2))

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="models")
    p.add_argument("--horizon", type=int, default=5)
    p.add_argument("--threshold", type=float, default=0.0)
    args = p.parse_args()
    main(args.out, args.horizon, args.threshold)
