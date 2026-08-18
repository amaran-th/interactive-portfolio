"use client";

import {
  AssetClass,
  Group,
  IrregularCashflow,
  NewAssetClassInput,
  NewIrregularCashflowInput,
} from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";
import IncomeSection from "./input-sections/IncomeSection";

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
    </div>
  );
}
