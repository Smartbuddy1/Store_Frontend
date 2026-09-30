import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Package, AlertCircle, XCircle, ArrowDownCircle, ArrowUpCircle, Tag, Activity, FileText, FileSpreadsheet, ClipboardList, ArrowRight, TrendingUp, TrendingDown, Wrench } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { t } from '../utils/translator';
import api from '../utils/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    totalQtyIn: 0,
    totalQtyOut: 0,
    goodStock: 0
  });
  
  const [recentStockIn, setRecentStockIn] = useState([]);
  const [recentStockOut, setRecentStockOut] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [dashStats, stockIn, stockOut] = await Promise.all([
          api.currentStock.getDashboardStats(),
          api.stockIn.getAll(),
          api.stockOut.getAll()
        ]);

        setStats(dashStats);
        
        setRecentStockIn(stockIn.slice(0, 10).map(item => ({
          date: new Date(item.date).toISOString().split('T')[0],
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantity: item.quantity
        })));
        
        setRecentStockOut(stockOut.slice(0, 10).map(item => ({
          date: new Date(item.date).toISOString().split('T')[0],
          itemCode: item.itemCode,
          itemName: item.itemName,
          quantity: item.quantity
        })));
        
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { label: t('Total Items'), value: stats.totalItems, icon: Package, color: '#3b82f6', badgeText: 'Active', badgeType: 'success', link: '/item-master', state: {} },
    { label: t('Low Stock'), value: stats.lowStock, icon: AlertTriangle, color: '#f59e0b', badgeText: 'Warning', badgeType: 'warning', link: '/alerts', state: { selectedStatus: 'Low' } },
    { label: t('Out of Stock'), value: stats.outOfStock, icon: XCircle, color: '#ef4444', badgeText: 'Critical', badgeType: 'danger', link: '/alerts', state: { selectedStatus: 'Empty' } },
    { label: t('Items IN'), value: stats.totalQtyIn, icon: ArrowDownCircle, color: '#10b981', badgeText: 'All time', badgeType: 'success', link: '/stock-in', state: {} },
    { label: t('Items OUT'), value: stats.totalQtyOut, icon: ArrowUpCircle, color: '#8b5cf6', badgeText: 'All time', badgeType: 'success', link: '/stock-out', state: {} }
  ];

  return (
    <div style={{ padding: '0 2rem 2rem 2rem', fontFamily: 'var(--font-sans)', minHeight: '100%', backgroundColor: 'var(--slate-50)' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            {t('Welcome to')} <span style={{ color: 'var(--primary-color)' }}>{t('Dashboard')}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '1.05rem', fontFamily: 'var(--font-sans)' }}>
            {t('Hello Admin, here is your system overview.')}
          </p>
        </div>

      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link to={stat.link} state={stat.state} key={index} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="hover-card" style={{
                backgroundColor: 'var(--surface-bg)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid #e2e8f0',
            }}>
              {/* Left Side: Label, Number, Badge */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem', fontWeight: '500', margin: 0 }}>{stat.label}</p>
                <h3 style={{ color: 'var(--slate-900)', fontSize: '2.2rem', fontWeight: 'bold', margin: 0, lineHeight: '1' }}>{stat.value}</h3>
                
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  backgroundColor: stat.badgeType === 'success' ? '#dcfce7' : '#fee2e2',
                  color: stat.badgeType === 'success' ? '#10b981' : '#ef4444',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  width: 'fit-content',
                  marginTop: '0.25rem'
                }}>
                  {stat.badgeType === 'success' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {stat.badgeText}
                </div>
              </div>

              {/* Right Side: Icon */}
              <div style={{ 
                backgroundColor: stat.color, 
                color: 'var(--surface-bg)', 
                width: '64px', height: '64px', 
                borderRadius: '16px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 10px ${stat.color}40`
              }}>
                <Icon size={28} />
              </div>
            </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Links */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--slate-900)', marginBottom: '1rem' }}>{t('Quick Actions')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          
          <Link to="/item-master" state={{ openAddModal: true }} style={{ textDecoration: 'none' }}>
            <div className="hover-card" style={{ backgroundColor: 'var(--surface-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '0.75rem', borderRadius: '10px' }}><Package size={24} /></div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--slate-900)', fontWeight: 'bold', fontSize: '1.1rem' }}>{t('Add New Item')}</h4>
                  <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{t('Create new master item')}</p>
                </div>
              </div>
              <ArrowRight color='var(--slate-300)' />
            </div>
          </Link>
          <Link to="/stock-in" state={{ openAddModal: true }} style={{ textDecoration: 'none' }}>
            <div className="hover-card" style={{ backgroundColor: 'var(--surface-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ backgroundColor: '#dcfce7', color: '#10b981', padding: '0.75rem', borderRadius: '10px' }}><ArrowDownCircle size={24} /></div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--slate-900)', fontWeight: 'bold', fontSize: '1.1rem' }}>{t('Add Stock In')}</h4>
                  <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{t('Record incoming items')}</p>
                </div>
              </div>
              <ArrowRight color='var(--slate-300)' />
            </div>
          </Link>

          <Link to="/stock-out" state={{ openAddModal: true }} style={{ textDecoration: 'none' }}>
            <div className="hover-card" style={{ backgroundColor: 'var(--surface-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ backgroundColor: '#fee2e2', color: '#ef4444', padding: '0.75rem', borderRadius: '10px' }}><ArrowUpCircle size={24} /></div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--slate-900)', fontWeight: 'bold', fontSize: '1.1rem' }}>{t('Add Dispatch')}</h4>
                  <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{t('Dispatch inventory')}</p>
                </div>
              </div>
              <ArrowRight color='var(--slate-300)' />
            </div>
          </Link>

          <Link to="/tools" state={{ openAddModal: true }} style={{ textDecoration: 'none' }}>
            <div className="hover-card" style={{ backgroundColor: 'var(--surface-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '0.75rem', borderRadius: '10px' }}><Wrench size={24} /></div>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--slate-900)', fontWeight: 'bold', fontSize: '1.1rem' }}>{t('Add Tool')}</h4>
                  <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{t('Record new tool')}</p>
                </div>
              </div>
              <ArrowRight color='var(--slate-300)' />
            </div>
          </Link>

        </div>
      </div>

      {/* Recent Activity Section */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* Recent Stock In Card */}
        <div style={{ flex: '1 1 calc(50% - 0.75rem)', minWidth: '300px', backgroundColor: 'var(--surface-bg)', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowDownCircle size={20} color="#10b981" /> {t('Recent Stock IN')}
            </h2>
            <Link to="/stock-in" style={{ fontSize: '0.85rem', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '600' }}>View All &rarr;</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600', width: '25%' }}>CODE</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600' }}>ITEM</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600', width: '20%' }}>QTY</th>
                </tr>
              </thead>
              <tbody>
                {recentStockIn.length > 0 ? recentStockIn.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '0.85rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{item.itemCode}</td>
                    <td style={{ padding: '0.85rem 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>{item.itemName}</td>
                    <td style={{ padding: '0.85rem 0', fontSize: '0.85rem', color: '#10b981', fontWeight: 'bold', textAlign: 'right' }}>+{item.quantity}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No recent entries found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Stock Out Card */}
        <div style={{ flex: '1 1 calc(50% - 0.75rem)', minWidth: '300px', backgroundColor: 'var(--surface-bg)', borderRadius: '16px', padding: '1.5rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowUpCircle size={20} color="#ef4444" /> {t('Recent Stock OUT')}
            </h2>
            <Link to="/stock-out" style={{ fontSize: '0.85rem', color: 'var(--primary-color)', textDecoration: 'none', fontWeight: '600' }}>View All &rarr;</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600', width: '25%' }}>CODE</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600' }}>ITEM</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem 0 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '600', width: '20%' }}>QTY</th>
                </tr>
              </thead>
              <tbody>
                {recentStockOut.length > 0 ? recentStockOut.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '0.85rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{item.itemCode}</td>
                    <td style={{ padding: '0.85rem 0', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>{item.itemName}</td>
                    <td style={{ padding: '0.85rem 0', fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold', textAlign: 'right' }}>-{item.quantity}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No recent entries found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      
    </div>
  );
};

export default Dashboard;
