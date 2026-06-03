from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import yfinance as yf
from database import SessionLocal, init_db, Watchlist, Holding, Balance, Order, Alert, User
from passlib.hash import bcrypt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_nse_ticker(symbol):
    return symbol.upper() + ".NS"

def fetch_stock_data(symbol):
    try:
        ticker = get_nse_ticker(symbol)
        stock = yf.Ticker(ticker)
        hist = stock.history(period="2d")
        if hist.empty:
            return None
        price = round(hist["Close"].iloc[-1], 2)
        prev_close = round(hist["Close"].iloc[-2], 2)
        change = round(((price - prev_close) / prev_close) * 100, 2)
        return {
            "name": symbol.upper(),
            "price": price,
            "change": change,
        }
    except Exception as e:
        return None

def calculate_ai_signal(symbol):
    try:
        ticker = get_nse_ticker(symbol)
        stock = yf.Ticker(ticker)
        hist = stock.history(period="30d")
        if hist.empty or len(hist) < 10:
            return {"signal": "HOLD", "confidence": 0, "reason": "Not enough data"}
        closes = hist["Close"]
        current_price = closes.iloc[-1]
        ma10 = closes.tail(10).mean()
        ma5 = closes.tail(5).mean()
        momentum = current_price - closes.iloc[-6]
        delta = closes.diff()
        gain = delta.where(delta > 0, 0).tail(14).mean()
        loss = -delta.where(delta < 0, 0).tail(14).mean()
        if loss == 0:
            rsi = 100
        else:
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
        score = 0
        reasons = []
        if current_price > ma10:
            score += 1
            reasons.append("Price above 10-day average")
        else:
            score -= 1
            reasons.append("Price below 10-day average")
        if ma5 > ma10:
            score += 1
            reasons.append("Short term trend is up")
        else:
            score -= 1
            reasons.append("Short term trend is down")
        if momentum > 0:
            score += 1
            reasons.append("Positive momentum")
        else:
            score -= 1
            reasons.append("Negative momentum")
        if rsi < 30:
            score += 2
            reasons.append("RSI oversold - good entry point")
        elif rsi > 70:
            score -= 2
            reasons.append("RSI overbought - consider selling")
        else:
            reasons.append(f"RSI neutral at {round(rsi, 1)}")
        if score >= 2:
            signal = "BUY"
        elif score <= -2:
            signal = "SELL"
        else:
            signal = "HOLD"
        confidence = min(abs(score) * 20 + 40, 95)
        return {
            "signal": signal,
            "confidence": confidence,
            "reason": " | ".join(reasons[:2]),
            "rsi": round(rsi, 1),
            "score": score,
        }
    except Exception as e:
        return {"signal": "HOLD", "confidence": 0, "reason": "Error calculating signal"}

@app.get("/")
def read_root():
    return {"message": "Trading Dashboard API"}

@app.get("/stocks")
def get_all_stocks(db: Session = Depends(get_db)):
    watchlist = db.query(Watchlist).all()
    result = {}
    for item in watchlist:
        data = fetch_stock_data(item.symbol)
        if data:
            result[item.symbol] = data
    return result

@app.get("/history/{symbol}")
def get_history(symbol: str):
    symbol = symbol.upper()
    try:
        ticker = get_nse_ticker(symbol)
        stock = yf.Ticker(ticker)
        hist = stock.history(period="30d")
        result = []
        for date, row in hist.iterrows():
            result.append({
                "time": date.strftime("%Y-%m-%d"),
                "open": round(row["Open"], 2),
                "high": round(row["High"], 2),
                "low": round(row["Low"], 2),
                "close": round(row["Close"], 2),
            })
        return result
    except Exception as e:
        return []

@app.get("/signal/{symbol}")
def get_signal(symbol: str):
    symbol = symbol.upper()
    return calculate_ai_signal(symbol)

@app.post("/watchlist/add/{symbol}")
def add_stock(symbol: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    existing = db.query(Watchlist).filter(Watchlist.symbol == symbol).first()
    if existing:
        return {"message": f"{symbol} already in watchlist"}
    db.add(Watchlist(symbol=symbol))
    db.commit()
    return {"message": f"{symbol} added"}

@app.delete("/watchlist/remove/{symbol}")
def remove_stock(symbol: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    item = db.query(Watchlist).filter(Watchlist.symbol == symbol).first()
    if not item:
        return {"message": f"{symbol} not found"}
    db.delete(item)
    db.commit()
    return {"message": f"{symbol} removed"}

@app.get("/portfolio")
def get_portfolio(db: Session = Depends(get_db)):
    balance = db.query(Balance).first()
    holdings = db.query(Holding).all()
    return {
        "balance": balance.amount,
        "holdings": {
            h.symbol: {
                "quantity": h.quantity,
                "avg_price": h.avg_price
            } for h in holdings
        }
    }

@app.post("/portfolio/deposit/{amount}")
def deposit_money(amount: float, db: Session = Depends(get_db)):
    if amount <= 0:
        return {"error": "Amount must be greater than 0"}
    balance = db.query(Balance).first()
    balance.amount = round(balance.amount + amount, 2)
    db.commit()
    return {
        "message": f"₹{amount} deposited successfully",
        "balance": balance.amount
    }

@app.post("/trade/buy/{symbol}")
def buy_stock(symbol: str, quantity: float = 1.0, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    data = fetch_stock_data(symbol)
    if not data:
        return {"error": "Stock not found"}
    price = data["price"]
    total_cost = round(price * quantity, 2)
    balance = db.query(Balance).first()
    if balance.amount < total_cost:
        return {"error": "Insufficient balance"}
    balance.amount = round(balance.amount - total_cost, 2)
    holding = db.query(Holding).filter(Holding.symbol == symbol).first()
    if holding:
        total_qty = holding.quantity + quantity
        holding.avg_price = round(
            (holding.avg_price * holding.quantity + price * quantity) / total_qty, 2
        )
        holding.quantity = round(total_qty, 4)
    else:
        db.add(Holding(symbol=symbol, quantity=round(quantity, 4), avg_price=price))
    db.add(Order(
        symbol=symbol,
        order_type="BUY",
        quantity=quantity,
        price=price,
        total=total_cost,
        timestamp=datetime.now()
    ))
    db.commit()
    return {"message": f"Bought {quantity} share(s) of {symbol} at ₹{price}"}

@app.post("/trade/sell/{symbol}")
def sell_stock(symbol: str, quantity: float = 1.0, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    holding = db.query(Holding).filter(Holding.symbol == symbol).first()
    if not holding:
        return {"error": "You don't own this stock"}
    if holding.quantity < quantity:
        return {"error": f"You only have {holding.quantity} shares"}
    data = fetch_stock_data(symbol)
    if not data:
        return {"error": "Stock not found"}
    price = data["price"]
    total_value = round(price * quantity, 2)
    balance = db.query(Balance).first()
    balance.amount = round(balance.amount + total_value, 2)
    holding.quantity = round(holding.quantity - quantity, 4)
    if holding.quantity == 0:
        db.delete(holding)
    db.add(Order(
        symbol=symbol,
        order_type="SELL",
        quantity=quantity,
        price=price,
        total=total_value,
        timestamp=datetime.now()
    ))
    db.commit()
    return {"message": f"Sold {quantity} share(s) of {symbol} at ₹{price}"}

@app.get("/orders")
def get_orders(db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.timestamp.desc()).all()
    return [
        {
            "id": o.id,
            "symbol": o.symbol,
            "type": o.order_type,
            "quantity": o.quantity,
            "price": o.price,
            "total": o.total,
            "time": o.timestamp.strftime("%d %b %Y, %I:%M %p")
        }
        for o in orders
    ]

@app.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).all()
    return [
        {
            "id": a.id,
            "symbol": a.symbol,
            "target_price": a.target_price,
            "condition": a.condition,
            "triggered": a.triggered
        }
        for a in alerts
    ]

@app.post("/alerts/add")
def add_alert(symbol: str, target_price: float, condition: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    db.add(Alert(symbol=symbol, target_price=target_price, condition=condition))
    db.commit()
    return {"message": f"Alert set for {symbol} at ₹{target_price}"}

@app.delete("/alerts/delete/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        return {"error": "Alert not found"}
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}

@app.get("/alerts/check")
def check_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).filter(Alert.triggered == 0).all()
    triggered = []
    for alert in alerts:
        data = fetch_stock_data(alert.symbol)
        if not data:
            continue
        price = data["price"]
        if alert.condition == "above" and price >= alert.target_price:
            alert.triggered = 1
            triggered.append({
                "symbol": alert.symbol,
                "message": f"{alert.symbol} crossed ₹{alert.target_price} — now at ₹{price}"
            })
        elif alert.condition == "below" and price <= alert.target_price:
            alert.triggered = 1
            triggered.append({
                "symbol": alert.symbol,
                "message": f"{alert.symbol} dropped below ₹{alert.target_price} — now at ₹{price}"
            })
    db.commit()
    return triggered

@app.get("/user")
def get_user(db: Session = Depends(get_db)):
    user = db.query(User).first()
    orders = db.query(Order).count()
    holdings = db.query(Holding).count()
    balance = db.query(Balance).first()
    return {
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "joined": user.joined.strftime("%B %Y"),
        "total_orders": orders,
        "stocks_owned": holdings,
        "balance": balance.amount,
    }

@app.put("/user/update")
def update_user(name: str, email: str, phone: str, db: Session = Depends(get_db)):
    user = db.query(User).first()
    user.name = name
    user.email = email
    user.phone = phone
    db.commit()
    return {"message": "Profile updated successfully"}

@app.post("/auth/signup")
def signup(name: str, email: str, password: str, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return {"error": "Email already registered"}
    hashed = bcrypt.hash(password)
    user = User(name=name, email=email, password=hashed, phone="")
    db.add(user)
    db.commit()
    return {"message": "Account created successfully", "name": name, "email": email}

@app.post("/auth/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"error": "Email not found"}
    if not bcrypt.verify(password, user.password):
        return {"error": "Wrong password"}
    return {
        "message": "Login successful",
        "name": user.name,
        "email": user.email,
    }