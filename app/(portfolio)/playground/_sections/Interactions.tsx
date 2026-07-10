import HorrorButton from "./Interactions/1_HorrorButton/HorrorButton";
import SlidingDoor from "./Interactions/2_SlidingDoor/SlidingDoor";

export default function Interactions() {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-8 text-white/80">Interactions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <HorrorButton />
        <SlidingDoor />
      </div>
    </section>
  );
}
