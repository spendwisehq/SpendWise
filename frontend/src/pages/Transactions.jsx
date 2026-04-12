import React, { useState, useEffect } from 'react';
import { Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTransactions, useCreateTransaction, useUpdateTransaction, useDeleteTransaction } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../context/AuthContext';
import TransactionFilters from '../components/transactions/TransactionFilters';
import TransactionList from '../components/transactions/TransactionList';
import TransactionModal from '../components/transactions/TransactionModal';
import ConfirmDialog from '../components/transactions/ConfirmDialog';
import './Transactions.css';

const Transactions = () => {
  const { user } = useAuth();
  const currency = user?.currency || 'INR';

  const [filters, setFilters] = useState({
    search: '', type: '', categoryId: '',
    startDate: '', endDate: '', paymentMethod: '',
    sortBy: 'date', sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [modal,       setModal]       = useState(null);
  const [page,        setPage]        = useState(1);
  const [deleteId,    setDeleteId]    = useState(null);

  const { data: txnData, isLoading: loading } = useTransactions(filters, page);
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  useEffect(() => {
    const handleNewTxn = () => setModal({});
    window.addEventListener('spendwise:new-transaction', handleNewTxn);
    return () => window.removeEventListener('spendwise:new-transaction', handleNewTxn);
  }, []);

  const transactions = txnData?.transactions || [];
  const pagination   = txnData?.pagination || { page: 1, totalPages: 1, total: 0 };

  const handleSave = (data) => {
    if (modal?._id) {
      updateMutation.mutate({ id: modal._id, data }, {
        onSuccess: () => setModal(null),
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => setModal(null),
      });
    }
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id, {
      onSuccess: () => setDeleteId(null),
    });
  };

  return (
    <div className="transactions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">{pagination.total} total transactions</p>
        </div>
        <div className="page-actions">
          <button className={`btn btn--ghost ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(f => !f)}>
            <Filter size={16} /> Filters
          </button>
          <button className="btn btn--primary" onClick={() => setModal({})}>
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <TransactionFilters
        filters={filters} setFilters={setFilters}
        categories={categories}
        showFilters={showFilters} setShowFilters={setShowFilters}
        setPage={setPage}
      />

      <TransactionList
        transactions={transactions} loading={loading} currency={currency}
        onEdit={setModal} onDelete={setDeleteId} onAdd={() => setModal({})}
      />

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn--ghost btn--sm" disabled={page === 1}
            onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="pagination__info">
            Page {page} of {pagination.totalPages}
          </span>
          <button className="btn btn--ghost btn--sm" disabled={page === pagination.totalPages}
            onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {modal !== null && (
        <TransactionModal
          transaction={modal?._id ? modal : null}
          categories={categories}
          currency={currency}
          onClose={() => setModal(null)}
          onSave={handleSave}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          message="This transaction will be permanently deleted."
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
};

export default Transactions;
