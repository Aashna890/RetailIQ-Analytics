import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Components/Layout'

// Pages - Updated to match your folder structure (capital P)
import Dashboard from './Pages/Dashboard'
import Customers from './Pages/Customers'
import SalesForecast from './Pages/SalesForecast'
import Recommendations from './Pages/Recommendations'
import MarketBasket from './Pages/MarketBasket'
import Anomalies from './Pages/Anomalies'
import DataImport from './Pages/DataImport'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/data-import" replace />} />
          <Route path="/data-import" element={<DataImport />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/sales-forecast" element={<SalesForecast />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/market-basket" element={<MarketBasket />} />
          <Route path="/anomalies" element={<Anomalies />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App