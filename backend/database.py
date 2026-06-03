from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./trading.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "user"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Trader")
    email = Column(String, unique=True, index=True)
    password = Column (String)
    phone = Column(String, default="")
    joined = Column(DateTime, default=datetime.now)

class Watchlist(Base):
    __tablename__ = "watchlist"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)

class Holding(Base):
    __tablename__ = "holdings"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)
    quantity = Column(Float, default=0.0)
    avg_price = Column(Float, default=0.0)

class Balance(Base):
    __tablename__ = "balance"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, default=100000.0)

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    order_type = Column(String)
    quantity = Column(Float)
    price = Column(Float)
    total = Column(Float)
    timestamp = Column(DateTime, default=datetime.now)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    target_price = Column(Float)
    condition = Column(String)
    triggered = Column(Integer, default=0)

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    if not db.query(Balance).first():
        db.add(Balance(amount=100000.0))
        db.commit()
    if not db.query(Watchlist).first():
        for symbol in ["RELIANCE", "TCS", "INFY", "HDFCBANK"]:
            db.add(Watchlist(symbol=symbol))
        db.commit()
    db.close()