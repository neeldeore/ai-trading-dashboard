from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import yfinance as yf
from database import (
    SessionLocal, init_db,
    User, Watchlist, Holding, Balance, Order, Alert
)
from passlib.hash import bcrypt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

# ─── DATABASE SESSION ─────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── GET CURRENT USER ─────────────────────────────────
# Every route that needs user data calls this function.
# It finds the user by email. If user not found, it
# stops the request and returns a 404 error.
def get_current_user(email: str, db: Session):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ─── STOCK HELPERS ────────────────────────────────────
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
    except Exception:
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
    except Exception:
        return {"signal": "HOLD", "confidence": 0, "reason": "Error calculating signal"}

# ─── AUTH ROUTES ──────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "Trading Dashboard API"}

@app.post("/chat")
def chat_with_ai(message: str, email: str, db: Session = Depends(get_db)):
    user = get_current_user(email, db)
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
    orders = db.query(Order).filter(Order.user_id == user.id).all()
    balance = db.query(Balance).filter(Balance.user_id == user.id).first()

    portfolio_summary = f"User: {user.name}\n"
    portfolio_summary += f"Available Balance: ₹{balance.amount if balance else 0}\n"
    portfolio_summary += f"Total Orders: {len(orders)}\n"
    portfolio_summary += "Holdings:\n"

    for h in holdings:
        data = fetch_stock_data(h.symbol)
        current_price = data["price"] if data else h.avg_price
        pnl = (current_price - h.avg_price) * h.quantity
        portfolio_summary += f"  - {h.symbol}: {h.quantity} shares, avg price ₹{h.avg_price}, current ₹{current_price}, P&L ₹{round(pnl, 2)}\n"

    system_prompt = f"""You are an expert Indian stock market advisor and portfolio analyst.
You have access to the user's real portfolio data:

{portfolio_summary}

Rules:
- Always give specific, actionable advice based on their actual holdings
- Use Indian financial context (NSE, BSE, SEBI regulations)
- Keep responses concise and clear (max 150 words)
- Use ₹ symbol for prices
- If asked about a stock not in portfolio, give general market advice
- Be encouraging but realistic about risks
- Never recommend illegal activities
"""

    try:
        import urllib.request
        import json as json_lib

        payload = json_lib.dumps({
            "model": "claude-opus-4-6",
            "max_tokens": 300,
            "system": system_prompt,
            "messages": [{"role": "user", "content": message}]
        }).encode()

        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "x-api-key": "YOUR_ANTHROPIC_API_KEY",
                "anthropic-version": "2023-06-01"
            },
            method="POST"
        )

        with urllib.request.urlopen(req) as response:
            result = json_lib.loads(response.read())
            return {"reply": result["content"][0]["text"]}

    except Exception as e:
        holdings_text = ", ".join([h.symbol for h in holdings]) if holdings else "none"
        balance_amt = balance.amount if balance else 0

        if "sell" in message.lower() or "बेचूं" in message.lower():
            return {"reply": f"Based on your portfolio ({holdings_text}), consider selling if you've hit your target profit or if the stock has dropped more than 8% from your buy price. Your current balance is ₹{balance_amt:.0f}."}
        elif "buy" in message.lower():
            return {"reply": f"You have ₹{balance_amt:.0f} available. Focus on fundamentally strong stocks. Diversify across sectors — IT, Banking, FMCG. Never invest more than 20% in one stock."}
        elif "portfolio" in message.lower():
            return {"reply": f"Your portfolio has {len(holdings)} stocks: {holdings_text}. Balance: ₹{balance_amt:.0f}. Review your P&L in the Analytics tab for detailed performance."}
        else:
            return {"reply": f"I'm your AI trading assistant! Ask me about your portfolio ({holdings_text}), whether to buy or sell, market analysis, or investment strategies. How can I help?"}

@app.get("/indices")
def get_indices():
    try:
        indices = {
            "NIFTY": "^NSEI",
            "SENSEX": "^BSESN",
            "BANKNIFTY": "^NSEBANK",
            "MIDCAP": "^NSEMDCP50",
        }
        result = []
        for name, ticker in indices.items():
            try:
                stock = yf.Ticker(ticker)
                hist = stock.history(period="2d")
                if hist.empty or len(hist) < 2:
                    continue
                price = round(hist["Close"].iloc[-1], 2)
                prev = round(hist["Close"].iloc[-2], 2)
                change = round(((price - prev) / prev) * 100, 2)
                result.append({
                    "name": name,
                    "value": f"{price:,.2f}",
                    "change": change
                })
            except Exception:
                continue
        return result
    except Exception as e:
        return []
    
@app.get("/news/{symbol}")
def get_news(symbol: str):
    try:
        ticker = get_nse_ticker(symbol)
        stock = yf.Ticker(ticker)
        news = stock.news
        result = []
        for item in news[:8]:
            content = item.get("content", {})
            title = content.get("title", "No title")
            summary = content.get("summary", "")
            pub_date = content.get("pubDate", "")
            provider = content.get("provider", {}).get("displayName", "Unknown")
            click_url = content.get("clickThroughUrl", {})
            url = click_url.get("url", "") if isinstance(click_url, dict) else ""
            result.append({
                "title": title,
                "summary": summary,
                "publisher": provider,
                "url": url,
                "time": pub_date[:10] if pub_date else ""
            })
        return result
    except Exception as e:
        return []

NSE_STOCKS = [
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd"},
    {"symbol": "TCS", "name": "Tata Consultancy Services"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd"},
    {"symbol": "INFY", "name": "Infosys Ltd"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd"},
    {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd"},
    {"symbol": "SBIN", "name": "State Bank of India"},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd"},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd"},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd"},
    {"symbol": "WIPRO", "name": "Wipro Ltd"},
    {"symbol": "HCLTECH", "name": "HCL Technologies Ltd"},
    {"symbol": "ASIANPAINT", "name": "Asian Paints Ltd"},
    {"symbol": "AXISBANK", "name": "Axis Bank Ltd"},
    {"symbol": "MARUTI", "name": "Maruti Suzuki India Ltd"},
    {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical Industries"},
    {"symbol": "TITAN", "name": "Titan Company Ltd"},
    {"symbol": "ULTRACEMCO", "name": "UltraTech Cement Ltd"},
    {"symbol": "NESTLEIND", "name": "Nestle India Ltd"},
    {"symbol": "TECHM", "name": "Tech Mahindra Ltd"},
    {"symbol": "POWERGRID", "name": "Power Grid Corporation"},
    {"symbol": "NTPC", "name": "NTPC Ltd"},
    {"symbol": "ONGC", "name": "Oil & Natural Gas Corp"},
    {"symbol": "JSWSTEEL", "name": "JSW Steel Ltd"},
    {"symbol": "TATASTEEL", "name": "Tata Steel Ltd"},
    {"symbol": "ADANIENT", "name": "Adani Enterprises Ltd"},
    {"symbol": "ADANIPORTS", "name": "Adani Ports & SEZ Ltd"},
    {"symbol": "COALINDIA", "name": "Coal India Ltd"},
    {"symbol": "DRREDDY", "name": "Dr Reddys Laboratories"},
    {"symbol": "DIVISLAB", "name": "Divis Laboratories Ltd"},
    {"symbol": "CIPLA", "name": "Cipla Ltd"},
    {"symbol": "EICHERMOT", "name": "Eicher Motors Ltd"},
    {"symbol": "BAJAJFINSV", "name": "Bajaj Finserv Ltd"},
    {"symbol": "BAJAJ-AUTO", "name": "Bajaj Auto Ltd"},
    {"symbol": "HEROMOTOCO", "name": "Hero MotoCorp Ltd"},
    {"symbol": "BRITANNIA", "name": "Britannia Industries Ltd"},
    {"symbol": "GRASIM", "name": "Grasim Industries Ltd"},
    {"symbol": "INDUSINDBK", "name": "IndusInd Bank Ltd"},
    {"symbol": "LT", "name": "Larsen & Toubro Ltd"},
    {"symbol": "M&M", "name": "Mahindra & Mahindra Ltd"},
    {"symbol": "TATACONSUM", "name": "Tata Consumer Products"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd"},
    {"symbol": "UPL", "name": "UPL Ltd"},
    {"symbol": "VEDL", "name": "Vedanta Ltd"},
    {"symbol": "BPCL", "name": "Bharat Petroleum Corp"},
    {"symbol": "IOC", "name": "Indian Oil Corporation"},
    {"symbol": "HDFCLIFE", "name": "HDFC Life Insurance"},
    {"symbol": "SBILIFE", "name": "SBI Life Insurance"},
    {"symbol": "ICICIPRULI", "name": "ICICI Prudential Life Insurance"},
    {"symbol": "PIDILITIND", "name": "Pidilite Industries Ltd"},
    {"symbol": "DABUR", "name": "Dabur India Ltd"},
    {"symbol": "GODREJCP", "name": "Godrej Consumer Products"},
    {"symbol": "MARICO", "name": "Marico Ltd"},
    {"symbol": "COLPAL", "name": "Colgate Palmolive India"},
    {"symbol": "BANDHANBNK", "name": "Bandhan Bank Ltd"},
    {"symbol": "PNB", "name": "Punjab National Bank"},
    {"symbol": "BANKBARODA", "name": "Bank of Baroda"},
    {"symbol": "CANBK", "name": "Canara Bank"},
    {"symbol": "FEDERALBNK", "name": "Federal Bank Ltd"},
    {"symbol": "IDFCFIRSTB", "name": "IDFC First Bank Ltd"},
    {"symbol": "RBLBANK", "name": "RBL Bank Ltd"},
    {"symbol": "YESBANK", "name": "Yes Bank Ltd"},
    {"symbol": "AUROPHARMA", "name": "Aurobindo Pharma Ltd"},
    {"symbol": "BIOCON", "name": "Biocon Ltd"},
    {"symbol": "LUPIN", "name": "Lupin Ltd"},
    {"symbol": "TORNTPHARM", "name": "Torrent Pharmaceuticals"},
    {"symbol": "ALKEM", "name": "Alkem Laboratories Ltd"},
    {"symbol": "MUTHOOTFIN", "name": "Muthoot Finance Ltd"},
    {"symbol": "CHOLAFIN", "name": "Cholamandalam Investment"},
    {"symbol": "SHRIRAMFIN", "name": "Shriram Finance Ltd"},
    {"symbol": "RECLTD", "name": "REC Ltd"},
    {"symbol": "PFC", "name": "Power Finance Corporation"},
    {"symbol": "IRFC", "name": "Indian Railway Finance Corp"},
    {"symbol": "NHPC", "name": "NHPC Ltd"},
    {"symbol": "TATAPOWER", "name": "Tata Power Company Ltd"},
    {"symbol": "ADANIGREEN", "name": "Adani Green Energy Ltd"},
    {"symbol": "ADANITRANS", "name": "Adani Transmission Ltd"},
    {"symbol": "SIEMENS", "name": "Siemens Ltd"},
    {"symbol": "ABB", "name": "ABB India Ltd"},
    {"symbol": "HAVELLS", "name": "Havells India Ltd"},
    {"symbol": "VOLTAS", "name": "Voltas Ltd"},
    {"symbol": "WHIRLPOOL", "name": "Whirlpool of India Ltd"},
    {"symbol": "BLUESTARCO", "name": "Blue Star Ltd"},
    {"symbol": "CROMPTON", "name": "Crompton Greaves Consumer"},
    {"symbol": "DIXON", "name": "Dixon Technologies Ltd"},
    {"symbol": "AMBER", "name": "Amber Enterprises India"},
    {"symbol": "ZOMATO", "name": "Zomato Ltd"},
    {"symbol": "NYKAA", "name": "FSN E-Commerce Ventures"},
    {"symbol": "PAYTM", "name": "One 97 Communications"},
    {"symbol": "POLICYBZR", "name": "PB Fintech Ltd"},
    {"symbol": "DELHIVERY", "name": "Delhivery Ltd"},
    {"symbol": "IRCTC", "name": "Indian Railway Catering & Tourism"},
    {"symbol": "HAL", "name": "Hindustan Aeronautics Ltd"},
    {"symbol": "BEL", "name": "Bharat Electronics Ltd"},
    {"symbol": "BHEL", "name": "Bharat Heavy Electricals"},
    {"symbol": "SAIL", "name": "Steel Authority of India"},
    {"symbol": "HINDALCO", "name": "Hindalco Industries Ltd"},
    {"symbol": "NATIONALUM", "name": "National Aluminium Company"},
    {"symbol": "NMDC", "name": "NMDC Ltd"},
    {"symbol": "GMRINFRA", "name": "GMR Airports Infrastructure"},
    {"symbol": "INDIGO", "name": "InterGlobe Aviation Ltd"},
    {"symbol": "SPICEJET", "name": "SpiceJet Ltd"},
    {"symbol": "ZEEL", "name": "Zee Entertainment Enterprises"},
    {"symbol": "SUNtv", "name": "Sun TV Network Ltd"},
    {"symbol": "PVR", "name": "PVR Inox Ltd"},
    {"symbol": "INOXWIND", "name": "Inox Wind Ltd"},
    {"symbol": "SUZLON", "name": "Suzlon Energy Ltd"},
    {"symbol": "TVSMOTOR", "name": "TVS Motor Company Ltd"},
    {"symbol": "ASHOKLEY", "name": "Ashok Leyland Ltd"},
    {"symbol": "ESCORTS", "name": "Escorts Kubota Ltd"},
    {"symbol": "MOTHERSON", "name": "Samvardhana Motherson"},
    {"symbol": "BOSCHLTD", "name": "Bosch Ltd"},
    {"symbol": "MRF", "name": "MRF Ltd"},
    {"symbol": "APOLLOTYRE", "name": "Apollo Tyres Ltd"},
    {"symbol": "CEATLTD", "name": "CEAT Ltd"},
    {"symbol": "BALKRISIND", "name": "Balkrishna Industries"},
    {"symbol": "LINDEINDIA", "name": "Linde India Ltd"},
    {"symbol": "DEEPAKNTR", "name": "Deepak Nitrite Ltd"},
    {"symbol": "AARTI", "name": "Aarti Industries Ltd"},
    {"symbol": "ALKYLAMINE", "name": "Alkyl Amines Chemicals"},
    {"symbol": "FINEORG", "name": "Fine Organic Industries"},
    {"symbol": "GALAXYSURF", "name": "Galaxy Surfactants Ltd"},
    {"symbol": "SRF", "name": "SRF Ltd"},
    {"symbol": "ATUL", "name": "Atul Ltd"},
    {"symbol": "RELAXO", "name": "Relaxo Footwears Ltd"},
    {"symbol": "BATA", "name": "Bata India Ltd"},
    {"symbol": "VMART", "name": "V-Mart Retail Ltd"},
    {"symbol": "TRENT", "name": "Trent Ltd"},
    {"symbol": "ABFRL", "name": "Aditya Birla Fashion & Retail"},
    {"symbol": "PAGEIND", "name": "Page Industries Ltd"},
    {"symbol": "DMART", "name": "Avenue Supermarts Ltd"},
    {"symbol": "NAUKRI", "name": "Info Edge India Ltd"},
    {"symbol": "JUSTDIAL", "name": "Just Dial Ltd"},
    {"symbol": "INDIAMART", "name": "Indiamart Intermesh Ltd"},
    {"symbol": "KPITTECH", "name": "KPIT Technologies Ltd"},
    {"symbol": "MPHASIS", "name": "Mphasis Ltd"},
    {"symbol": "COFORGE", "name": "Coforge Ltd"},
    {"symbol": "PERSISTENT", "name": "Persistent Systems Ltd"},
    {"symbol": "LTIM", "name": "LTIMindtree Ltd"},
    {"symbol": "LTTS", "name": "L&T Technology Services"},
    {"symbol": "HEXAWARE", "name": "Hexaware Technologies Ltd"},
    {"symbol": "FSL", "name": "Firstsource Solutions Ltd"},
    {"symbol": "RATEGAIN", "name": "RateGain Travel Technologies"},
]

@app.get("/stocks/search")
def search_stocks(query: str = ""):
    if not query or len(query) < 1:
        return []
    query = query.upper()
    results = [
        s for s in NSE_STOCKS
        if query in s["symbol"] or query in s["name"].upper()
    ]
    return results[:10]

@app.post("/auth/signup")
def signup(name: str, email: str, password: str, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return {"error": "Email already registered"}
    hashed = bcrypt.hash(password)
    user = User(name=name, email=email, password=hashed, phone="")
    db.add(user)
    db.flush()
    db.add(Balance(amount=100000.0, user_id=user.id))
    default_stocks = ["RELIANCE", "TCS", "INFY", "HDFCBANK"]
    for symbol in default_stocks:
        db.add(Watchlist(symbol=symbol, user_id=user.id))
    db.commit()
    return {
        "message": "Account created successfully",
        "name": user.name,
        "email": user.email
    }

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

# ─── STOCK ROUTES ─────────────────────────────────────
@app.get("/stocks")
def get_all_stocks(email: str, db: Session = Depends(get_db)):
    user = get_current_user(email, db)
    result = {}
    for item in user.watchlist:
        data = fetch_stock_data(item.symbol)
        if data:
            result[item.symbol] = data
    return result

@app.get("/history/{symbol}")
def get_history(symbol: str, period: str = "1mo"):
    symbol = symbol.upper()
    try:
        ticker = get_nse_ticker(symbol)
        stock = yf.Ticker(ticker)
        valid_periods = {
            "5d": "5d",
            "1mo": "1mo",
            "3mo": "3mo",
            "6mo": "6mo",
            "1y": "1y",
            "30d": "1mo",
        }
        yf_period = valid_periods.get(period, "1mo")
        hist = stock.history(period=yf_period)
        if hist.empty:
            hist = stock.history(period="1mo")
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
    return calculate_ai_signal(symbol.upper())

@app.get("/stock/detail/{symbol}")
def get_stock_detail(symbol: str):
    symbol = symbol.upper()
    try:
        ticker = get_nse_ticker(symbol)
        stock = yf.Ticker(ticker)
        hist = stock.history(period="1d")
        info = stock.info
        hist_52 = stock.history(period="52wk")
        week_52_high = round(hist_52["High"].max(), 2) if not hist_52.empty else 0
        week_52_low = round(hist_52["Low"].min(), 2) if not hist_52.empty else 0
        if hist.empty:
            return {"error": "Stock not found"}
        price = round(hist["Close"].iloc[-1], 2)
        open_price = round(hist["Open"].iloc[-1], 2)
        high = round(hist["High"].iloc[-1], 2)
        low = round(hist["Low"].iloc[-1], 2)
        volume = int(hist["Volume"].iloc[-1])
        prev_hist = stock.history(period="5d")
        prev_close = round(prev_hist["Close"].iloc[-2], 2) if len(prev_hist) >= 2 else price
        change = round(((price - prev_close) / prev_close) * 100, 2)
        return {
            "symbol": symbol,
            "price": price,
            "change": change,
            "open": open_price,
            "high": high,
            "low": low,
            "volume": volume,
            "prev_close": prev_close,
            "week_52_high": week_52_high,
            "week_52_low": week_52_low,
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE", 0),
            "pb_ratio": info.get("priceToBook", 0),
            "dividend_yield": info.get("dividendYield", 0),
            "eps": info.get("trailingEps", 0),
            "roe": info.get("returnOnEquity", 0),
            "book_value": info.get("bookValue", 0),
            "face_value": info.get("faceValue", 0),
        }
    except Exception as e:
        return {"error": str(e)}

# ─── WATCHLIST ROUTES ─────────────────────────────────
@app.post("/watchlist/add/{symbol}")
def add_stock(symbol: str, email: str, db: Session = Depends(get_db)):
    user = get_current_user(email, db)
    symbol = symbol.upper()
    existing = db.query(Watchlist).filter(
        Watchlist.symbol == symbol,
        Watchlist.user_id == user.id
    ).first()
    if existing:
        return {"message": f"{symbol} already in watchlist"}
    db.add(Watchlist(symbol=symbol, user_id=user.id))
    db.commit()
    return {"message": f"{symbol} added"}

@app.delete("/watchlist/remove/{symbol}")
def remove_stock(symbol: str, email: str, db: Session = Depends(get_db)):
    user = get_current_user(email, db)
    symbol = symbol.upper()
    item = db.query(Watchlist).filter(
        Watchlist.symbol == symbol,
        Watchlist.user_id == user.id
    ).first()
    if not item:
        return {"message": f"{symbol} not found"}
    db.delete(item)
    db.commit()
    return {"message": f"{symbol} removed"}

# ─── PORTFOLIO ROUTES ─────────────────────────────────
@app.get("/portfolio")
def get_portfolio(email: str, db: Session = Depends(get_db)):
    user = get_current_user(email, db)
    balance = db.query(Balance).filter(Balance.user_id == user.id).first()
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
    return {
        "balance": balance.amount if balance else 0,
        "holdings": {
            h.symbol: {
                "quantity": h.quantity,
                "avg_price": h.avg_price
            } for h in holdings
        }
    }

@app.post("/portfolio/deposit/{amount}")
def deposit_money(amount: float, email: str, db: Session = Depends(get_db)):
    if amount <= 0:
        return {"error": "Amount must be greater than 0"}
    user = get_current_user(email, db)
    balance = db.query(Balance).filter(Balance.user_id == user.id).first()
    if not balance:
        balance = Balance(amount=0, user_id=user.id)
        db.add(balance)
    balance.amount = round(balance.amount + amount, 2)
    db.commit()
    return {
        "message": f"₹{amount} deposited successfully",
        "balance": balance.amount
    }

# ─── TRADE ROUTES ─────────────────────────────────────
@app.post("/trade/buy/{symbol}")
def buy_stock(
    symbol: str,
    email: str,
    quantity: float = 1.0,
    db: Session = Depends(get_db)
):
    user = get_current_user(email, db)
    symbol = symbol.upper()
    data = fetch_stock_data(symbol)
    if not data:
        return {"error": "Stock not found"}
    price = data["price"]
    total_cost = round(price * quantity, 2)
    balance = db.query(Balance).filter(Balance.user_id == user.id).first()
    if not balance or balance.amount < total_cost:
        return {"error": "Insufficient balance"}
    balance.amount = round(balance.amount - total_cost, 2)
    holding = db.query(Holding).filter(
        Holding.symbol == symbol,
        Holding.user_id == user.id
    ).first()
    if holding:
        total_qty = holding.quantity + quantity
        holding.avg_price = round(
            (holding.avg_price * holding.quantity + price * quantity) / total_qty, 2
        )
        holding.quantity = round(total_qty, 4)
    else:
        db.add(Holding(
            symbol=symbol,
            quantity=round(quantity, 4),
            avg_price=price,
            user_id=user.id
        ))
    db.add(Order(
        symbol=symbol,
        order_type="BUY",
        quantity=quantity,
        price=price,
        total=total_cost,
        timestamp=datetime.now(),
        user_id=user.id
    ))
    db.commit()
    return {"message": f"Bought {quantity} share(s) of {symbol} at ₹{price}"}

@app.post("/trade/sell/{symbol}")
def sell_stock(
    symbol: str,
    email: str,
    quantity: float = 1.0,
    db: Session = Depends(get_db)
):
    user = get_current_user(email, db)
    symbol = symbol.upper()
    holding = db.query(Holding).filter(
        Holding.symbol == symbol,
        Holding.user_id == user.id
    ).first()
    if not holding:
        return {"error": "You don't own this stock"}
    if holding.quantity < quantity:
        return {"error": f"You only have {holding.quantity} shares"}
    data = fetch_stock_data(symbol)
    if not data:
        return {"error": "Stock not found"}
    price = data["price"]
    total_value = round(price * quantity, 2)
    balance = db.query(Balance).filter(Balance.user_id == user.id).first()
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
        timestamp=datetime.now(),
        user_id=user.id
    ))
    db.commit()
    return {"message": f"Sold {quantity} share(s) of {symbol} at ₹{price}"}

# ─── ORDER ROUTES ─────────────────────────────────────
@app.get("/orders")
def get_orders(email: str, db: Session = Depends(get_db)):
    user = get_current_user(email, db)
    orders = db.query(Order).filter(
        Order.user_id == user.id
    ).order_by(Order.timestamp.desc()).all()
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

# ─── ALERT ROUTES ─────────────────────────────────────
@app.get("/alerts")
def get_alerts(email: str, db: Session = Depends(get_db)):
    user = get_current_user(email, db)
    alerts = db.query(Alert).filter(Alert.user_id == user.id).all()
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
def add_alert(
    symbol: str,
    target_price: float,
    condition: str,
    email: str,
    db: Session = Depends(get_db)
):
    user = get_current_user(email, db)
    db.add(Alert(
        symbol=symbol.upper(),
        target_price=target_price,
        condition=condition,
        user_id=user.id
    ))
    db.commit()
    return {"message": f"Alert set for {symbol} at ₹{target_price}"}

@app.delete("/alerts/delete/{alert_id}")
def delete_alert(alert_id: int, email: str, db: Session = Depends(get_db)):
    user = get_current_user(email, db)
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == user.id
    ).first()
    if not alert:
        return {"error": "Alert not found"}
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}

@app.get("/alerts/check")
def check_alerts(email: str, db: Session = Depends(get_db)):
    user = get_current_user(email, db)
    alerts = db.query(Alert).filter(
        Alert.user_id == user.id,
        Alert.triggered == 0
    ).all()
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

# ─── USER ROUTES ──────────────────────────────────────
@app.get("/user")
def get_user(email: str, db: Session = Depends(get_db)):
    user = get_current_user(email, db)
    orders = db.query(Order).filter(Order.user_id == user.id).count()
    holdings = db.query(Holding).filter(Holding.user_id == user.id).count()
    balance = db.query(Balance).filter(Balance.user_id == user.id).first()
    return {
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "joined": user.joined.strftime("%B %Y"),
        "total_orders": orders,
        "stocks_owned": holdings,
        "balance": balance.amount if balance else 0,
    }

@app.put("/user/update")
def update_user(
    email: str,
    name: str,
    phone: str,
    db: Session = Depends(get_db)
):
    user = get_current_user(email, db)
    user.name = name
    user.phone = phone
    db.commit()
    return {"message": "Profile updated successfully"}

@app.get("/analytics")
def get_analytics(email: str, db: Session = Depends(get_db)):
    user = get_current_user(email, db)
    holdings = db.query(Holding).filter(Holding.user_id == user.id).all()
    orders = db.query(Order).filter(Order.user_id == user.id).all()
    balance = db.query(Balance).filter(Balance.user_id == user.id).first()

    total_invested = 0
    current_value = 0
    stock_pnl = []

    for holding in holdings:
        data = fetch_stock_data(holding.symbol)
        current_price = data["price"] if data else holding.avg_price
        invested = holding.avg_price * holding.quantity
        current = current_price * holding.quantity
        pnl = current - invested
        total_invested += invested
        current_value += current
        stock_pnl.append({
            "symbol": holding.symbol,
            "invested": round(invested, 2),
            "current": round(current, 2),
            "pnl": round(pnl, 2),
            "pnl_percent": round((pnl / invested) * 100, 2) if invested > 0 else 0
        })

    total_pnl = current_value - total_invested

    buy_orders = [o for o in orders if o.order_type == "BUY"]
    sell_orders = [o for o in orders if o.order_type == "SELL"]

    profitable_sells = 0
    for sell in sell_orders:
        matching_buy = next(
            (o for o in buy_orders if o.symbol == sell.symbol), None
        )
        if matching_buy and sell.price > matching_buy.price:
            profitable_sells += 1

    win_rate = round(
        (profitable_sells / len(sell_orders)) * 100, 1
    ) if sell_orders else 0

    order_history = []
    running_value = 100000.0
    for order in sorted(orders, key=lambda x: x.timestamp):
        if order.order_type == "BUY":
            running_value -= order.total
        else:
            running_value += order.total
        order_history.append({
            "date": order.timestamp.strftime("%d %b"),
            "value": round(running_value, 2)
        })

    return {
        "total_invested": round(total_invested, 2),
        "current_value": round(current_value, 2),
        "total_pnl": round(total_pnl, 2),
        "total_pnl_percent": round((total_pnl / total_invested) * 100, 2) if total_invested > 0 else 0,
        "balance": round(balance.amount, 2) if balance else 0,
        "total_orders": len(orders),
        "win_rate": win_rate,
        "stock_pnl": sorted(stock_pnl, key=lambda x: x["pnl"], reverse=True),
        "order_history": order_history,
    }