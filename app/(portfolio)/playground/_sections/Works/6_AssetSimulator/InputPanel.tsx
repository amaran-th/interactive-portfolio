"use client";

import { AssetClass, Group, NewAssetClassInput } from "./types";
import GroupAssetSection from "./input-sections/GroupAssetSection";

type InputPanelProps = {
  groups: Group[];
  onAddGroup: (name: string) => void;
  onRemoveGroup: (id: string) => void;
  assetClasses: AssetClass[];
  onAddAssetClass: (input: NewAssetClassInput) => void;
  onRemoveAssetClass: (id: string) => void;
  onSetPrimaryAsset: (id: string) => void;
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
    </div>
  );
}
