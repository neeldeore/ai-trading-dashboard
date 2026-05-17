from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

stocks = {
    "RELIANCE": {"name": "Reliance Industries", "price": 2456.50, "change": 1.2},
    "TCS": {"name": "Tata Consultancy Services", "price": 3821.75, "change": -0.5},
    "INFY": {"name": "Infosys", "price": 1456.30, "change": 0.8},
    "HDFC": {"name": "HDFC Bank", "price": 1678.90, "change": -1.1},
}

history = {
    "RELIANCE": [
        {"day": "Mon", "price": 2300},
        {"day": "Tue", "price": 2350},
        {"day": "Wed", "price": 2280},
        {"day": "Thu", "price": 2400},
        {"day": "Fri", "price": 2456},
    ],
    "TCS": [
        {"day": "Mon", "price": 3700},
        {"day": "Tue", "price": 3750},
        {"day": "Wed", "price": 3800},
        {"day": "Thu", "price": 3780},
        {"day": "Fri", "price": 3821},
    ],
    "INFY": [
        {"day": "Mon", "price": 1400},
        {"day": "Tue", "price": 1380},
        {"day": "Wed", "price": 1420},
        {"day": "Thu", "price": 1440},
        {"day": "Fri", "price": 1456},
    ],
    "HDFC": [
        {"day": "Mon", "price": 1750},
        {"day": "Tue", "price": 1720},
        {"day": "Wed", "price": 1700},
        {"day": "Thu", "price": 1690},
        {"day": "Fri", "price": 1678},
    ],
}

@app.get("/")
def read_root():
    return {"message": "Trading Dashboard API"}

@app.get("/stocks")
def get_all_stocks():
    return stocks

@app.get("/stocks/{symbol}")
def get_stock(symbol: str):
    symbol = symbol.upper()
    if symbol not in stocks:
        return {"error": "Stock not found"}
    return stocks[symbol]

@app.get("/history/{symbol}")
def get_history(symbol: str):
    symbol = symbol.upper()
    if symbol not in history:
        return {"error": "Stock not found"}
    return history[symbol]