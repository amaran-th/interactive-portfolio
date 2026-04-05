import TiltCard from "./Interactions/1_TiltCard/TiltCard";
import MagneticCard from "./Interactions/2_MagneticCard/MagneticCard";
import RippleClick from "./Interactions/3_RippleClick/RippleClick";
import SlidingDoor from "./Interactions/4_SlidingDoor/SlidingDoor";

export default function Interactions() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-8 text-white/80">Interactions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <TiltCard />
        <MagneticCard />
        <RippleClick />
        <SlidingDoor />
      </div>
    </section>
  );
}
