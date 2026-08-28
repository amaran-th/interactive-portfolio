import KnitMuffler from "@/public/playground/knit-muffler.svg";

interface SVGIconProps {
  color?: string | undefined;
  size?: string | undefined;
}
export const KnitMufflerIcon = ({ size = "20" }: SVGIconProps) => {
  return <KnitMuffler width={size} height={size} aria-hidden="true" />;
};
