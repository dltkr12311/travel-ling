import { PiggyBank, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import React, { useMemo } from 'react';
import { Expense, Person } from '../../../types';

interface ExpensePreviewCardProps {
  budget: number;
  expenses: Expense[];
  people: Person[];
  itineraryCount: number;
}

export const ExpensePreviewCard: React.FC<ExpensePreviewCardProps> = ({
  budget,
  expenses,
  people,
  itineraryCount,
}) => {
  const totalSpent = useMemo(
    () => expenses.reduce((acc, cur) => acc + cur.amount, 0),
    [expenses]
  );
  const remainingBudget = budget - totalSpent;
  const spendPercentage = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const perPersonShare = people.length > 0 ? totalSpent / people.length : 0;

  const recentExpenses = useMemo(
    () => expenses.slice(-3).reverse(),
    [expenses]
  );

  const getBudgetStatus = () => {
    if (budget === 0)
      return {
        color: 'slate',
        label: '예산 미설정',
        icon: <PiggyBank size={16} />,
      };
    if (spendPercentage > 100)
      return {
        color: 'red',
        label: '예산 초과!',
        icon: <TrendingDown size={16} />,
      };
    if (spendPercentage > 80)
      return {
        color: 'orange',
        label: '주의 필요',
        icon: <TrendingUp size={16} />,
      };
    return {
      color: 'emerald',
      label: '여유로움',
      icon: <TrendingUp size={16} />,
    };
  };

  const status = getBudgetStatus();

  return (
    <div className='bg-white rounded-3xl p-5 shadow-lg shadow-slate-200/50 border border-slate-100'>
      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 bg-gradient-to-br from-orange-400 to-rose-500 rounded-xl flex items-center justify-center'>
            <Wallet size={16} className='text-white' />
          </div>
          <div>
            <h3 className='font-bold text-slate-800 text-sm'>지출 현황</h3>
            <p className='text-[10px] text-slate-400'>실시간 업데이트</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
            status.color === 'emerald'
              ? 'bg-emerald-100 text-emerald-700'
              : status.color === 'orange'
              ? 'bg-orange-100 text-orange-700'
              : status.color === 'red'
              ? 'bg-red-100 text-red-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {status.icon}
          {status.label}
        </div>
      </div>

      {budget > 0 ? (
        <div className='mb-4'>
          <div className='flex items-baseline justify-between mb-2'>
            <div>
              <p className='text-[10px] text-slate-400 font-medium mb-0.5'>
                총 지출
              </p>
              <p className='text-3xl font-black text-slate-900'>
                {totalSpent.toLocaleString()}
                <span className='text-lg text-slate-400 ml-1'>원</span>
              </p>
            </div>
            <div className='text-right'>
              <p className='text-[10px] text-slate-400 font-medium mb-0.5'>
                남은 예산
              </p>
              <p
                className={`text-xl font-bold ${
                  remainingBudget >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {remainingBudget >= 0 ? '' : '-'}
                {Math.abs(remainingBudget).toLocaleString()}원
              </p>
            </div>
          </div>

          <div className='h-2 w-full bg-slate-100 rounded-full overflow-hidden'>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                spendPercentage > 100
                  ? 'bg-red-500'
                  : spendPercentage > 80
                  ? 'bg-orange-400'
                  : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
              }`}
              style={{ width: `${Math.min(spendPercentage, 100)}%` }}
            />
          </div>
          <div className='flex justify-between mt-1.5 text-[10px] text-slate-400'>
            <span>{Math.round(spendPercentage)}% 사용</span>
            <span>예산 {budget.toLocaleString()}원</span>
          </div>
        </div>
      ) : (
        <div className='mb-4 bg-slate-50 rounded-2xl p-4 text-center'>
          <PiggyBank size={32} className='text-slate-300 mx-auto mb-2' />
          <p className='text-slate-500 text-sm font-medium'>예산을 설정하면</p>
          <p className='text-slate-400 text-xs'>
            지출 현황을 한눈에 볼 수 있어요
          </p>
        </div>
      )}

      {recentExpenses.length > 0 && (
        <div className='mb-4'>
          <p className='text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2'>
            최근 지출
          </p>
          <div className='space-y-2'>
            {recentExpenses.map(exp => {
              const payer = people.find(p => p.id === exp.payerId);
              return (
                <div
                  key={exp.id}
                  className='flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2'
                >
                  <div className='flex items-center gap-2'>
                    <div className='w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200'>
                      {payer?.name.slice(0, 1) || '?'}
                    </div>
                    <span className='text-sm font-medium text-slate-700 truncate max-w-[120px]'>
                      {exp.description}
                    </span>
                  </div>
                  <span className='text-sm font-bold text-slate-800'>
                    {exp.amount.toLocaleString()}원
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className='grid grid-cols-3 gap-2 pt-3 border-t border-slate-100'>
        <div className='text-center'>
          <p className='text-lg font-black text-slate-800'>{people.length}</p>
          <p className='text-[9px] text-slate-400 font-medium'>멤버</p>
        </div>
        <div className='text-center border-x border-slate-100'>
          <p className='text-lg font-black text-slate-800'>{expenses.length}</p>
          <p className='text-[9px] text-slate-400 font-medium'>지출 건수</p>
        </div>
        <div className='text-center'>
          <p className='text-lg font-black text-slate-800'>{itineraryCount}</p>
          <p className='text-[9px] text-slate-400 font-medium'>일정</p>
        </div>
      </div>

      {expenses.length > 0 && people.length > 1 && (
        <div className='mt-3 bg-blue-50 rounded-xl px-3 py-2 flex items-center justify-between'>
          <span className='text-xs text-blue-600 font-medium'>1인당 지출</span>
          <span className='text-sm font-bold text-blue-700'>
            {Math.round(perPersonShare).toLocaleString()}원
          </span>
        </div>
      )}
    </div>
  );
};
