"use client";

import {
  AssetClass,
  ExpenseItem,
  Goal,
  Group,
  IncomeItem,
  MonthSnapshot,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  SimulationInput,
  TransferRule,
} from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";
import IncomeSection from "./input-sections/IncomeSection";
import ExpenseSection from "./input-sections/ExpenseSection";
import TransferRuleSection from "./input-sections/TransferRuleSection";
import GoalCard from "./GoalCard";

type InputPanelProps = {
  groups: Group[];
  assetGroups: Group[];
  onAddGroup: (name: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
  onChangeAssetColor: (id: string, color: string) => void;
  incomes: IncomeItem[];
  onAddIncome: (input: NewIncomeItemInput) => void;
  onUpdateIncome: (id: string, input: NewIncomeItemInput) => void;
  onRemoveIncome: (id: string) => void;
  expenses: ExpenseItem[];
  onAddExpense: (input: NewExpenseItemInput) => void;
  onUpdateExpense: (id: string, input: NewExpenseItemInput) => void;
  onRemoveExpense: (id: string) => void;
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onUpdateTransferRule: (id: string, input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
  today: Date;
  horizonMonths: number;
  goal: Goal | null;
  onSetGoal: (goal: Goal | null) => void;
  simulationInput: SimulationInput;
  selectedSnapshot: MonthSnapshot;
};

export default function InputPanel(props: InputPanelProps) {
  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))]">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onUpdateGroup={props.onUpdateGroup}
        onRemoveGroup={props.onRemoveGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onUpdateAssetClass={props.onUpdateAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onSetPrimaryAsset={props.onSetPrimaryAsset}
        onChangeAssetColor={props.onChangeAssetColor}
      />
      <IncomeSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onUpdateGroup={props.onUpdateGroup}
        onRemoveGroup={props.onRemoveGroup}
        incomes={props.incomes}
        onAddIncome={props.onAddIncome}
        onUpdateIncome={props.onUpdateIncome}
        onRemoveIncome={props.onRemoveIncome}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
      <ExpenseSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onUpdateGroup={props.onUpdateGroup}
        onRemoveGroup={props.onRemoveGroup}
        expenses={props.expenses}
        onAddExpense={props.onAddExpense}
        onUpdateExpense={props.onUpdateExpense}
        onRemoveExpense={props.onRemoveExpense}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
      <TransferRuleSection
        assetClasses={props.assetClasses}
        transferRules={props.transferRules}
        onAddTransferRule={props.onAddTransferRule}
        onUpdateTransferRule={props.onUpdateTransferRule}
        onRemoveTransferRule={props.onRemoveTransferRule}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
      <GoalCard
        goal={props.goal}
        onSetGoal={props.onSetGoal}
        assetClasses={props.assetClasses}
        groups={props.assetGroups}
        simulationInput={props.simulationInput}
        today={props.today}
        selectedSnapshot={props.selectedSnapshot}
      />
    </div>
  );
}
