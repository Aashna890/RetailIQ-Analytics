class MockEntity {
  constructor(name, schema) {
    this.name = name;
    this.schemaData = schema;
    this.storage = this.loadFromStorage();
  }

  loadFromStorage() {
    const stored = localStorage.getItem(`entity_${this.name}`);
    return stored ? JSON.parse(stored) : [];
  }

  saveToStorage() {
    localStorage.setItem(`entity_${this.name}`, JSON.stringify(this.storage));
  }

  schema() {
    return this.schemaData;
  }

  async create(data) {
    const record = {
      id: `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      created_at: new Date().toISOString()
    };
    this.storage.push(record);
    this.saveToStorage();
    return record;
  }

  async list(sortBy = null, limit = null) {
    let results = [...this.storage];
    
    if (sortBy) {
      const desc = sortBy.startsWith('-');
      const field = desc ? sortBy.slice(1) : sortBy;
      results.sort((a, b) => {
        const aVal = a[field] || 0;
        const bVal = b[field] || 0;
        return desc ? bVal - aVal : aVal - bVal;
      });
    }
    
    if (limit) {
      results = results.slice(0, limit);
    }
    
    return results;
  }

  async get(id) {
    return this.storage.find(item => item.id === id);
  }

  async update(id, data) {
    const index = this.storage.findIndex(item => item.id === id);
    if (index !== -1) {
      this.storage[index] = { ...this.storage[index], ...data };
      this.saveToStorage();
      return this.storage[index];
    }
    return null;
  }

  async delete(id) {
    const index = this.storage.findIndex(item => item.id === id);
    if (index !== -1) {
      this.storage.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }
  
  async clearAll() {
    this.storage = [];
    this.saveToStorage();
    return true;
  }
}

// Customer Entity
export const Customer = new MockEntity('Customer', {
  name: "Customer",
  type: "object",
  properties: {
    customer_name: { type: "string" },
    email: { type: "string" },
    phone: { type: "string" },
    country: { type: "string" },
    city: { type: "string" },
    age: { type: "number" },
    gender: { type: "string" },
    segment: { type: "string" },
    total_purchases: { type: "number" },
    total_spent: { type: "number" },
    last_purchase_date: { type: "string" },
    churn_risk_score: { type: "number" }
  }
});

// Product Entity
export const Product = new MockEntity('Product', {
  name: "Product",
  type: "object",
  properties: {
    product_name: { type: "string" },
    category: { type: "string" },
    subcategory: { type: "string" },
    price: { type: "number" },
    cost: { type: "number" },
    stock_quantity: { type: "number" },
    reorder_level: { type: "number" },
    total_sold: { type: "number" },
    revenue_generated: { type: "number" },
    average_rating: { type: "number" }
  }
});

// Transaction Entity
export const Transaction = new MockEntity('Transaction', {
  name: "Transaction",
  type: "object",
  properties: {
    transaction_id: { type: "string" },
    customer_id: { type: "string" },
    customer_name: { type: "string" },
    transaction_date: { type: "string" },
    items: { type: "array" },
    total_amount: { type: "number" },
    payment_method: { type: "string" },
    status: { type: "string" },
    is_anomaly: { type: "boolean" }
  }
});

// ✅ CLEAR ALL DATA ON STARTUP (Fresh slate every time)
Customer.clearAll();
Product.clearAll();
Transaction.clearAll();

console.log('✅ All entities cleared - Starting with zero state');
