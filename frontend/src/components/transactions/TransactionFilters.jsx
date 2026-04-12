import React from 'react';
import { Search, Filter, X } from 'lucide-react';

const TransactionFilters = ({ filters, setFilters, categories, showFilters, setShowFilters, setPage }) => {
  const updateFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearAll = () => {
    setFilters({ search: '', type: '', categoryId: '', startDate: '', endDate: '', paymentMethod: '', sortBy: 'date', sortOrder: 'desc' });
    setPage(1);
  };

  return (
    <div className="filters-bar">
      <div className="search-box">
        <Search size={16} />
        <input placeholder="Search merchant, description..."
          value={filters.search}
          data-search-input
          onChange={e => updateFilter('search', e.target.value)} />
        {filters.search && (
          <button onClick={() => updateFilter('search', '')}><X size={14} /></button>
        )}
      </div>

      {showFilters && (
        <div className="filters-expanded">
          <select value={filters.type} onChange={e => updateFilter('type', e.target.value)} className="filter-select">
            <option value="">All Types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>

          <select value={filters.categoryId} onChange={e => updateFilter('categoryId', e.target.value)} className="filter-select">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
          </select>

          <input type="date" value={filters.startDate}
            onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
            className="filter-select" placeholder="Start date" />

          <input type="date" value={filters.endDate}
            onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
            className="filter-select" />

          <select value={filters.sortBy}
            onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}
            className="filter-select">
            <option value="date">Sort: Date</option>
            <option value="amount">Sort: Amount</option>
          </select>

          <button className="btn btn--ghost btn--sm" onClick={clearAll}>Clear</button>
        </div>
      )}
    </div>
  );
};

export default TransactionFilters;
