"use client";

import {
  AssetClass,
  FixedExpense,
  Group,
  IrregularCashflow,
  NewAssetClassInput,
  NewFixedExpenseInput,
  NewIrregularCashflowInput,
  NewTransferRuleInput,
  TransferRule,
} from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";
import IncomeSection from "./input-sections/IncomeSection";
import ExpenseSection from "./input-sections/ExpenseSection";
import TransferRuleSection from "./input-sections/TransferRuleSection";

type InputPanelProps = {
  groups: Group[];
  onAddGroup: (name: string) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  monthlyIncome: number;
  onChangeMonthlyIncome: (value: number) => void;
  irregularIncomes: IrregularCashflow[];
  onAddIrregularIncome: (input: NewIrregularCashflowInput) => void;
  onRemoveIrregularIncome: (id: string) => void;
  fixedExpenses: FixedExpense[];
  onAddFixedExpense: (input: NewFixedExpenseInput) => void;
  onRemoveFixedExpense: (id: string) => void;
  irregularExpenses: IrregularCashflow[];
  onAddIrregularExpense: (input: NewIrregularCashflowInput) => void;
  onRemoveIrregularExpense: (id: string) => void;
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
  today: Date;
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onRemoveGroup={props.onRemoveGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onSetPrimaryAsset={props.onSetPrimaryAsset}
      />
      <IncomeSection
        monthlyIncome={props.monthlyIncome}
        onChangeMonthlyIncome={props.onChangeMonthlyIncome}
        irregularIncomes={props.irregularIncomes}
        onAddIrregularIncome={props.onAddIrregularIncome}
        onRemoveIrregularIncome={props.onRemoveIrregularIncome}
        today={props.today}
      />
      <ExpenseSection
        fixedExpenses={props.fixedExpenses}
        onAddFixedExpense={props.onAddFixedExpense}
        onRemoveFixedExpense={props.onRemoveFixedExpense}
        irregularExpenses={props.irregularExpenses}
        onAddIrregularExpense={props.onAddIrregularExpense}
        onRemoveIrregularExpense={props.onRemoveIrregularExpense}
        today={props.today}
      />
      <TransferRuleSection
        assetClasses={props.assetClasses}
        transferRules={props.transferRules}
        onAddTransferRule={props.onAddTransferRule}
        onRemoveTransferRule={props.onRemoveTransferRule}
      />
    </div>
  );
}
