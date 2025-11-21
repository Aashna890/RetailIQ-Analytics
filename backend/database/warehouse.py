from sqlalchemy import create_engine, Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

Base = declarative_base()

# Fact Table
class FactSales(Base):
    __tablename__ = 'fact_sales'
    
    sale_id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey('dim_customer.customer_id'))
    product_id = Column(Integer, ForeignKey('dim_product.product_id'))
    date_id = Column(Integer, ForeignKey('dim_date.date_id'))
    quantity = Column(Integer)
    revenue = Column(Float)
    profit = Column(Float)

# Dimension Tables
class DimCustomer(Base):
    __tablename__ = 'dim_customer'
    
    customer_id = Column(Integer, primary_key=True)
    name = Column(String(100))
    segment = Column(String(50))
    city = Column(String(100))
    country = Column(String(100))

class DimProduct(Base):
    __tablename__ = 'dim_product'
    
    product_id = Column(Integer, primary_key=True)
    name = Column(String(100))
    category = Column(String(50))
    price = Column(Float)

class DimDate(Base):
    __tablename__ = 'dim_date'
    
    date_id = Column(Integer, primary_key=True)
    full_date = Column(Date)
    year = Column(Integer)
    quarter = Column(Integer)
    month = Column(Integer)
    day = Column(Integer)

def create_data_warehouse(db_url='sqlite:///retailiq_warehouse.db'):
    """Create data warehouse schema"""
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    return engine
