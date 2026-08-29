"use client";

import { useState } from "react";
import {
  AssetClass,
  Category,
  ExpenseItem,
  Group,
  IncomeItem,
  NewAssetClassInput,
  NewExpenseItemInput,
  NewIncomeItemInput,
  NewTransferRuleInput,
  TransferRule,
} from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";
import IncomeSection from "./input-sections/IncomeSection";
import ExpenseSection from "./input-sections/ExpenseSection";
import TransferRuleSection from "./input-sections/TransferRuleSection";

type InputPanelProps = {
  groups: Group[];
  onAddGroup: (name: string, color: string) => string;
  onUpdateGroup: (id: string, input: { name: string; color: string }) => void;
  onRemoveGroup: (id: string) => void;
  categories: Category[];
  onAddCategory: (name: string) => string;
  onUpdateCategory: (id: string, name: string) => void;
  onRemoveCategory: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onUpdateAssetClass: (id: string, input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onChangeAssetColor: (id: string, color: string) => void;
  incomes: IncomeItem[];
  onAddIncome: (input: NewIncomeItemInput) => void;
  onUpdateIncome: (id: string, input: NewIncomeItemInput) => void;
  onRemoveIncome: (id: string) => void;
  onReorderIncome: (from: number, to: number) => void;
  expenses: ExpenseItem[];
  onAddExpense: (input: NewExpenseItemInput) => void;
  onUpdateExpense: (id: string, input: NewExpenseItemInput) => void;
  onRemoveExpense: (id: string) => void;
  onReorderExpense: (from: number, to: number) => void;
  transferRules: TransferRule[];
  onAddTransferRule: (input: NewTransferRuleInput) => void;
  onUpdateTransferRule: (id: string, input: NewTransferRuleInput) => void;
  onRemoveTransferRule: (id: string) => void;
  onReorderTransferRule: (from: number, to: number) => void;
  today: Date;
  horizonMonths: number;
};

type OpenSection = "asset" | "income" | "expense" | "transfer" | null;

export default function InputPanel(props: InputPanelProps) {
  const [openSection, setOpenSection] = useState<OpenSection>(null);

  return (
    <div className="flex flex-wrap gap-4">
      <GroupAssetSection
        groups={props.groups}
        onAddGroup={props.onAddGroup}
        onUpdateGroup={props.onUpdateGroup}
        onRemoveGroup={props.onRemoveGroup}
        assetClasses={props.assetClasses}
        onAddAssetClass={props.onAddAssetClass}
        onUpdateAssetClass={props.onUpdateAssetClass}
        onRemoveAssetClass={props.onRemoveAssetClass}
        onChangeAssetColor={props.onChangeAssetColor}
        isFormOpen={openSection === "asset"}
        onOpenForm={() => setOpenSection("asset")}
        onCloseForm={() => setOpenSection(null)}
      />
      <IncomeSection
        categories={props.categories}
        onAddCategory={props.onAddCategory}
        onUpdateCategory={props.onUpdateCategory}
        onRemoveCategory={props.onRemoveCategory}
        incomes={props.incomes}
        onAddIncome={props.onAddIncome}
        onUpdateIncome={props.onUpdateIncome}
        onRemoveIncome={props.onRemoveIncome}
        onReorderIncome={props.onReorderIncome}
        isFormOpen={openSection === "income"}
        onOpenForm={() => setOpenSection("income")}
        onCloseForm={() => setOpenSection(null)}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
      <ExpenseSection
        categories={props.categories}
        onAddCategory={props.onAddCategory}
        onUpdateCategory={props.onUpdateCategory}
        onRemoveCategory={props.onRemoveCategory}
        expenses={props.expenses}
        onAddExpense={props.onAddExpense}
        onUpdateExpense={props.onUpdateExpense}
        onRemoveExpense={props.onRemoveExpense}
        onReorderExpense={props.onReorderExpense}
        isFormOpen={openSection === "expense"}
        onOpenForm={() => setOpenSection("expense")}
        onCloseForm={() => setOpenSection(null)}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
      <TransferRuleSection
        assetClasses={props.assetClasses}
        transferRules={props.transferRules}
        onAddTransferRule={props.onAddTransferRule}
        onUpdateTransferRule={props.onUpdateTransferRule}
        onRemoveTransferRule={props.onRemoveTransferRule}
        onReorderTransferRule={props.onReorderTransferRule}
        isFormOpen={openSection === "transfer"}
        onOpenForm={() => setOpenSection("transfer")}
        onCloseForm={() => setOpenSection(null)}
        today={props.today}
        horizonMonths={props.horizonMonths}
      />
    </div>
  );
}
