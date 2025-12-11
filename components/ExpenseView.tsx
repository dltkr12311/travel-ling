import {
  AlertTriangle,
  PiggyBank,
  Plus,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Expense, Person } from '../types';

interface Props {
  people: Person[];
  expenses: Expense[];
  onAddPerson: (name: string) => void;
  onAddExpense: (expense: Expense) => void;
  onRemoveExpense: (id: string) => void;
  budget: number;
  onSetBudget: (amount: number) => void;
}

const ExpenseView: React.FC<Props> = ({
  people,
  expenses,
  onAddPerson,
  onAddExpense,
  onRemoveExpense,
  budget,
  onSetBudget,
}) => {
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseDesc, setNewExpenseDesc] = useState('');
  const [newExpensePayer, setNewExpensePayer] = useState<string>(
    people[0]?.id || ''
  );
  const [newPersonName, setNewPersonName] = useState('');
  const [isAddingPerson, setIsAddingPerson] = useState(false);

  // Budget Setting State
  const [tempBudget, setTempBudget] = useState('');
  const [isEditingBudget, setIsEditingBudget] = useState(false);

  // 1. 총 지출 계산
  const totalSpent = useMemo(
    () => expenses.reduce((acc, cur) => acc + cur.amount, 0),
    [expenses]
  );
  const remainingBudget = budget - totalSpent;
  const spendPercentage = budget > 0 ? (totalSpent / budget) * 100 : 0;

  // 2. 1인당 부담해야 할 금액 (N분의 1)
  const perPersonShare = useMemo(() => {
    if (people.length === 0) return 0;
    return totalSpent / people.length;
  }, [totalSpent, people.length]);

  // 3. 정산 로직 (누가 얼마를 냈고, 얼마를 더 내거나 받아야 하는지)
  const settlement = useMemo(() => {
    const paidByPerson: Record<string, number> = {};
    people.forEach(p => (paidByPerson[p.id] = 0));

    expenses.forEach(e => {
      if (paidByPerson[e.payerId] !== undefined) {
        paidByPerson[e.payerId] += e.amount;
      }
    });

    return people
      .map(p => {
        const paid = paidByPerson[p.id];
        const balance = paid - perPersonShare; // 양수면 받을 돈, 음수면 줄 돈
        return {
          ...p,
          paid,
          balance,
        };
      })
      .sort((a, b) => a.balance - b.balance); // 줄 돈 많은 사람(음수)부터 정렬
  }, [people, expenses, perPersonShare]);

  // 4. 송금 리스트 생성 (누가 누구에게 보내야 하는지 매칭)
  const transferInstructions = useMemo(() => {
    const debtors = settlement
      .filter(p => p.balance < -10)
      .map(p => ({ ...p, debt: Math.abs(p.balance) }));
    const creditors = settlement
      .filter(p => p.balance > 10)
      .map(p => ({ ...p, credit: p.balance }));

    const instructions: { from: string; to: string; amount: number }[] = [];

    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const amount = Math.min(debtor.debt, creditor.credit);

      if (amount > 0) {
        instructions.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(amount),
        });
      }

      debtor.debt -= amount;
      creditor.credit -= amount;

      if (debtor.debt < 10) i++;
      if (creditor.credit < 10) j++;
    }
    return instructions;
  }, [settlement]);

  const handleAddExpense = () => {
    if (!newExpenseAmount || !newExpenseDesc || !newExpensePayer) return;

    onAddExpense({
      id: Date.now().toString(),
      amount: parseInt(newExpenseAmount.replace(/,/g, '')),
      description: newExpenseDesc,
      payerId: newExpensePayer,
      date: new Date().toISOString(),
    });

    // Reset & Close
    setIsAddingExpense(false);
    setNewExpenseAmount('');
    setNewExpenseDesc('');
    setNewExpensePayer(people[0]?.id || '');
  };

  const formatCurrency = (val: string) => {
    const num = val.replace(/,/g, '');
    if (!Number(num)) return '';
    return Number(num).toLocaleString();
  };

  // Budget Health Logic
  const getBudgetHealth = () => {
    if (spendPercentage > 100)
      return {
        status: 'critical',
        color: 'bg-slate-900',
        textColor: 'text-white',
        icon: <AlertTriangle size={20} className='text-red-500' />,
        msg: '예산 초과! 지갑에 구멍이 났어요 💸',
        sub: `목표보다 ${(totalSpent - budget).toLocaleString()}원 더 썼어요.`,
      };
    if (spendPercentage > 85)
      return {
        status: 'danger',
        color: 'bg-red-50',
        textColor: 'text-red-600',
        icon: <AlertTriangle size={20} className='text-red-500' />,
        msg: '위험해요! 예산이 거의 바닥났어요 🚨',
        sub: '지금부터는 숨만 쉬어도 돈이 나가요.',
      };
    if (spendPercentage > 50)
      return {
        status: 'warning',
        color: 'bg-orange-50',
        textColor: 'text-orange-700',
        icon: <TrendingUp size={20} className='text-orange-500' />,
        msg: '절반 넘게 썼어요! 계획적인 소비가 필요해요 🤔',
        sub: '남은 일정과 예산을 비교해보세요.',
      };
    return {
      status: 'good',
      color: 'bg-blue-600',
      textColor: 'text-white',
      icon: <PiggyBank size={20} className='text-blue-200' />,
      msg: '아주 훌륭해요! 예산이 여유롭네요 😋',
      sub: '이대로라면 맛있는거 더 먹어도 되겠어요!',
    };
  };

  const health = getBudgetHealth();

  return (
    <div
      className='bg-[#f2f4f6] min-h-full'
      style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
    >
      {/* Budget Dashboard Area */}
      {budget === 0 ? (
        <div className='bg-white p-6 pt-8 pb-8 rounded-b-3xl shadow-sm'>
          <div className='text-center mb-6'>
            <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600'>
              <Wallet size={32} />
            </div>
            <h2 className='text-xl font-black text-slate-900 mb-2'>
              얼마나 쓰실 계획인가요?
            </h2>
            <p className='text-slate-500 text-sm'>
              예산을 등록하면 AI가
              <br />
              과소비를 막아드릴게요.
            </p>
          </div>

          <div className='relative max-w-xs mx-auto'>
            <input
              type='text'
              inputMode='numeric'
              autoComplete='off'
              placeholder='예: 300,000'
              className='w-full text-center text-2xl font-bold border-b-2 border-slate-200 py-2 outline-none focus:border-blue-600 focus:text-blue-600 placeholder:text-slate-300 transition-colors bg-transparent'
              value={tempBudget}
              onChange={e => setTempBudget(formatCurrency(e.target.value))}
              onKeyDown={e => {
                if (e.key === 'Enter' && tempBudget) {
                  onSetBudget(parseInt(tempBudget.replace(/,/g, '')));
                }
              }}
            />
            <span className='absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold'>
              원
            </span>
          </div>

          <button
            onClick={() =>
              tempBudget && onSetBudget(parseInt(tempBudget.replace(/,/g, '')))
            }
            disabled={!tempBudget}
            className='w-full mt-6 bg-slate-900 text-white font-bold py-4 rounded-xl disabled:opacity-30 active:scale-[0.98] transition-all shadow-lg'
          >
            예산 등록하기
          </button>
        </div>
      ) : (
        <div
          className={`p-6 pt-8 pb-8 rounded-b-3xl shadow-sm transition-colors duration-500 ${health.color}`}
        >
          {/* Header: Edit Button */}
          <div className='flex justify-between items-start mb-6'>
            <div
              className={`text-xs font-bold opacity-80 px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                health.textColor.includes('white')
                  ? 'border-white/30 text-white'
                  : 'border-slate-200 text-slate-500'
              }`}
            >
              {health.icon}
              <span>소비 리포트</span>
            </div>
            <button
              onClick={() => onSetBudget(0)}
              className={`text-xs underline opacity-60 hover:opacity-100 ${
                health.textColor.includes('white')
                  ? 'text-white'
                  : 'text-slate-400'
              }`}
            >
              예산 수정
            </button>
          </div>

          {/* Main Amount Display */}
          <div className='mb-1'>
            <p
              className={`text-sm font-bold mb-1 opacity-80 ${
                health.textColor.includes('white')
                  ? 'text-blue-100'
                  : 'text-slate-500'
              }`}
            >
              남은 예산
            </p>
            <div
              className={`flex items-baseline gap-1 ${
                health.textColor.includes('white')
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              <span className='text-4xl font-black tracking-tight'>
                {remainingBudget.toLocaleString()}
              </span>
              <span className='text-xl font-bold opacity-80'>원</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className='mt-6 mb-4'>
            <div className='flex justify-between text-[11px] font-bold mb-1.5 opacity-70'>
              <span
                className={
                  health.textColor.includes('white')
                    ? 'text-white'
                    : 'text-slate-500'
                }
              >
                {Math.round(spendPercentage)}% 사용
              </span>
              <span
                className={
                  health.textColor.includes('white')
                    ? 'text-white'
                    : 'text-slate-500'
                }
              >
                총 {budget.toLocaleString()}원
              </span>
            </div>
            <div className='h-3 w-full bg-black/10 rounded-full overflow-hidden backdrop-blur-sm'>
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                  health.status === 'critical'
                    ? 'bg-red-500'
                    : health.status === 'danger'
                    ? 'bg-red-500'
                    : health.status === 'warning'
                    ? 'bg-orange-400'
                    : 'bg-white'
                }`}
                style={{ width: `${Math.min(spendPercentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Insight Message Bubble */}
          <div
            className={`mt-4 p-4 rounded-xl backdrop-blur-md border flex flex-col gap-1 ${
              health.textColor.includes('white')
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white border-slate-100 shadow-sm'
            }`}
          >
            <p
              className={`font-bold text-base ${
                health.textColor.includes('white')
                  ? 'text-white'
                  : 'text-slate-800'
              }`}
            >
              {health.msg}
            </p>
            <p
              className={`text-xs ${
                health.textColor.includes('white')
                  ? 'text-blue-100'
                  : 'text-slate-500'
              }`}
            >
              {health.sub}
            </p>
          </div>

          {/* People Management (Mini) */}
          <div className='mt-6 flex items-center justify-between'>
            <div className='flex -space-x-2'>
              {people.map((p, idx) => (
                <div
                  key={p.id}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold uppercase z-0 relative ${
                    health.textColor.includes('white')
                      ? 'border-blue-500 bg-blue-800 text-white'
                      : 'border-white bg-slate-200 text-slate-600'
                  }`}
                  style={{ zIndex: people.length - idx }}
                >
                  {p.name.slice(0, 2)}
                </div>
              ))}
              <button
                onClick={() => setIsAddingPerson(true)}
                className={`w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center z-10 ${
                  health.textColor.includes('white')
                    ? 'border-blue-300/50 text-blue-100 hover:bg-white/10'
                    : 'border-slate-300 text-slate-400 hover:bg-slate-100'
                }`}
              >
                <Plus size={14} />
              </button>
            </div>
            <div
              className={`text-[11px] font-bold opacity-80 ${
                health.textColor.includes('white')
                  ? 'text-blue-100'
                  : 'text-slate-400'
              }`}
            >
              1인당 {Math.round(perPersonShare).toLocaleString()}원 지출 중
            </div>
          </div>

          {/* Add Person Input Inline */}
          {isAddingPerson && (
            <div className='mt-3 flex items-center gap-2 animate-in slide-in-from-top-2'>
              <input
                autoFocus
                autoComplete='off'
                className='bg-white/90 px-3 py-2 rounded-lg text-xs outline-none flex-1 text-slate-900 placeholder:text-slate-400 shadow-lg'
                placeholder='새 멤버 이름'
                value={newPersonName}
                onChange={e => setNewPersonName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newPersonName) {
                    onAddPerson(newPersonName);
                    setNewPersonName('');
                    setIsAddingPerson(false);
                  }
                }}
              />
              <button
                onClick={() => setIsAddingPerson(false)}
                className='p-2 bg-black/20 rounded-full text-white'
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settlement Cards (Who sends to whom) */}
      {transferInstructions.length > 0 && (
        <div className='px-5 mt-6'>
          <h3 className='text-slate-800 font-bold text-lg mb-3 ml-1'>
            정산 알림
          </h3>
          <div className='grid gap-3'>
            {transferInstructions.map((inst, idx) => (
              <div
                key={idx}
                className='bg-white p-5 rounded-2xl shadow-sm border border-slate-100/50 flex items-center justify-between'
              >
                <div className='flex items-center gap-3'>
                  <div className='bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-bold'>
                    송금
                  </div>
                  <div className='text-slate-700 font-bold text-sm'>
                    {inst.from}{' '}
                    <span className='text-slate-300 font-normal mx-1'>→</span>{' '}
                    {inst.to}
                  </div>
                </div>
                <div className='text-base font-black text-blue-600'>
                  {inst.amount.toLocaleString()}원
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense List */}
      <div className='px-5 mt-8'>
        <div className='flex justify-between items-end mb-3 ml-1'>
          <h3 className='text-slate-800 font-bold text-lg'>지출 내역</h3>
          <span className='text-slate-400 text-xs'>{expenses.length}건</span>
        </div>

        <div className='space-y-3'>
          {expenses.length === 0 && (
            <div className='text-center py-10 text-slate-400 text-sm bg-white rounded-2xl border-dashed border border-slate-200'>
              아직 지출 내역이 없어요.
              <br />
              {budget > 0 && '예산을 잘 지키고 계시네요!'}
            </div>
          )}
          {expenses
            .slice()
            .reverse()
            .map(expense => {
              const payer = people.find(p => p.id === expense.payerId);
              return (
                <div
                  key={expense.id}
                  className='bg-white p-4 rounded-2xl shadow-sm border border-slate-100/50 flex justify-between items-center active:scale-[0.98] transition-transform'
                >
                  <div className='flex items-center gap-4'>
                    <div className='w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100'>
                      <Wallet size={18} />
                    </div>
                    <div>
                      <p className='font-bold text-slate-800 text-[15px]'>
                        {expense.description}
                      </p>
                      <p className='text-xs text-slate-400 font-medium'>
                        {payer?.name} 결제
                      </p>
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='font-bold text-slate-800 text-[15px]'>
                      {expense.amount.toLocaleString()}원
                    </div>
                    <button
                      onClick={() => onRemoveExpense(expense.id)}
                      className='text-slate-300 hover:text-red-500 text-xs mt-1 p-1'
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Floating Action Button */}
      <div
        className='fixed bottom-20 right-5 z-30'
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => setIsAddingExpense(true)}
          className='w-14 h-14 bg-slate-900 rounded-full shadow-lg shadow-slate-900/30 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95'
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Add Expense Modal (Bottom Sheet Style) */}
      {isAddingExpense && (
        <div className='fixed inset-0 z-50 flex items-end justify-center'>
          <div
            className='absolute inset-0 bg-black/40 backdrop-blur-sm'
            onClick={() => setIsAddingExpense(false)}
          ></div>
          <div className='bg-white w-full max-w-md rounded-t-3xl p-6 z-10 animate-in slide-in-from-bottom-10 duration-300 shadow-2xl pb-safe'>
            <div className='w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6'></div>

            <div className='mb-8 text-center'>
              <p className='text-slate-500 text-sm font-bold mb-2'>
                얼마를 썼나요?
              </p>
              <div className='flex justify-center items-center gap-1'>
                <input
                  autoFocus
                  type='text'
                  inputMode='numeric'
                  autoComplete='off'
                  placeholder='0'
                  className='text-5xl font-black text-slate-900 text-center outline-none w-full bg-transparent placeholder:text-slate-200'
                  value={newExpenseAmount}
                  onChange={e =>
                    setNewExpenseAmount(formatCurrency(e.target.value))
                  }
                />
                <span className='text-2xl font-bold text-slate-400'>원</span>
              </div>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='block text-xs font-bold text-slate-400 mb-2 ml-1'>
                  누가 냈나요?
                </label>
                <div className='flex gap-2 overflow-x-auto no-scrollbar py-1'>
                  {people.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setNewExpensePayer(p.id)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                        newExpensePayer === p.id
                          ? 'bg-slate-900 text-white shadow-md shadow-slate-400'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.profilePic && (
                        <span className='text-lg'>{p.profilePic}</span>
                      )}
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className='block text-xs font-bold text-slate-400 mb-2 ml-1'>
                  무엇을 샀나요?
                </label>
                <input
                  autoComplete='off'
                  className='w-full bg-slate-100 rounded-2xl p-4 text-base font-medium outline-none focus:bg-slate-50 focus:ring-2 focus:ring-blue-100 transition-all'
                  placeholder='예: 점심 식사, 마트 장보기'
                  value={newExpenseDesc}
                  onChange={e => setNewExpenseDesc(e.target.value)}
                />
              </div>

              <button
                onClick={handleAddExpense}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg mt-4 transition-all ${
                  newExpenseAmount && newExpenseDesc
                    ? 'bg-blue-600 text-white shadow-blue-300 active:scale-[0.98]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseView;
