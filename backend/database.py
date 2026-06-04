from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
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
    password = Column(String)
    phone = Column(String, default="")
    joined = Column(DateTime, default=datetime.now)
    watchlist = relationship("Watchlist", back_populates="user", cascade="all, delete")
    holdings = relationship("Holding", back_populates="user", cascade="all, delete")
    balance = relationship("Balance", back_populates="user", cascade="all, delete", uselist=False)
    orders = relationship("Order", back_populates="user", cascade="all, delete")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete")

class Watchlist(Base):
    __tablename__ = "watchlist"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("user.id"))
    user = relationship("User", back_populates="watchlist")

class Holding(Base):
    __tablename__ = "holdings"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    quantity = Column(Float, default=0.0)
    avg_price = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("user.id"))
    user = relationship("User", back_populates="holdings")

class Balance(Base):
    __tablename__ = "balance"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, default=100000.0)
    user_id = Column(Integer, ForeignKey("user.id"), unique=True)
    user = relationship("User", back_populates="balance")

class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    order_type = Column(String)
    quantity = Column(Float)
    price = Column(Float)
    total = Column(Float)
    timestamp = Column(DateTime, default=datetime.now)
    user_id = Column(Integer, ForeignKey("user.id"))
    user = relationship("User", back_populates="orders")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    target_price = Column(Float)
    condition = Column(String)
    triggered = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("user.id"))
    user = relationship("User", back_populates="alerts")

def init_db():
    Base.metadata.create_all(bind=engine)