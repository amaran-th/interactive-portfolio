"use client";

import {
  AssetClass,
  FixedExpense,
  FixedIncome,
  Group,
  IrregularCashflow,
  NewAssetClassInput,
  NewFixedExpenseInput,
  NewFixedIncomeInput,
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
  onAddGroup: (name: string) => string;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  fixedIncomes: FixedIncome[];
  onAddFixedIncome: (input: NewFixedIncomeInput) => void;
  onUpdateFixedIncome: (id: string, input: NewFixedIncomeInput) => void;
  onRemoveFixedIncome: (id: string) => void;
  irregularIncomes: IrregularCashflow[];
  onAddIrregularIncome: (input: NewIrregularCashflowInput) => void;
  onUpdateIrregularIncome: (id: string, input: NewIrregularCashflowInput) => void;
  onRemoveIrregularIncome: (id: string) => void;
  fixedExpenses: FixedExpense[];
  onAddFixedExpense: (input: NewFixedExpenseInput) => void;
  onUpdateFixedExpense: (id: string, input: NewFixedExpenseInput) => void;
  onRemoveFixedExpense: (id: string) => void;
  irregularExpenses: IrregularCashflow[];
  onAddIrregularExpense: (input: NewIrregularCashflowInput) => void;
  onUpdateIrregularExpense: (id: string, input: NewIrregularCashflowInput) => void;
  onRemoveIrregularExpense: (id: string) => void;
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onUpdateTransferRule: (id: string, input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
  today: Date;
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onUpdateAssetClass={props.onUpdateAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onSetPrimaryAsset={props.onSetPrimaryAsset}
      />
      <IncomeSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        fixedIncomes={props.fixedIncomes}
        onAddFixedIncome={props.onAddFixedIncome}
        onUpdateFixedIncome={props.onUpdateFixedIncome}
        onRemoveFixedIncome={props.onRemoveFixedIncome}
        irregularIncomes={props.irregularIncomes}
        onAddIrregularIncome={props.onAddIrregularIncome}
        onUpdateIrregularIncome={props.onUpdateIrregularIncome}
        onRemoveIrregularIncome={props.onRemoveIrregularIncome}
        today={props.today}
      />
      <ExpenseSection
        fixedExpenses={props.fixedExpenses}
        onAddFixedExpense={props.onAddFixedExpense}
        onUpdateFixedExpense={props.onUpdateFixedExpense}
        onRemoveFixedExpense={props.onRemoveFixedExpense}
        irregularExpenses={props.irregularExpenses}
        onAddIrregularExpense={props.onAddIrregularExpense}
        onUpdateIrregularExpense={props.onUpdateIrregularExpense}
        onRemoveIrregularExpense={props.onRemoveIrregularExpense}
        today={props.today}
      />
      <TransferRuleSection
        assetClasses={props.assetClasses}
        transferRules={props.transferRules}
        onAddTransferRule={props.onAddTransferRule}
        onUpdateTransferRule={props.onUpdateTransferRule}
        onRemoveTransferRule={props.onRemoveTransferRule}
      />
    </div>
  );
}
