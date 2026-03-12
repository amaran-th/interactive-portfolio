const ANGLE = 20;
const RADIAN = (ANGLE * Math.PI) / 180;
const DOOR_WIDTH = 100;
const FLOORLIGHT_WIDTH = 200;
const FLOORLIGHT_HEIGHT = 200;
const door = container.querySelector(".door");
const floorlight = container.querySelector(".floorlight");
const hiddenMan = container.querySelector(".hidden-man");
const manShadow = container.querySelector(".man-shadow");
const prev = { x: 0, y: 0 };
let isDragging = false;
let delta = 0;
let prevDelta = 0;

door.addEventListener("pointerdown", (event) => {
  isDragging = true;
  prev.x = event.clientX;
  prev.y = event.clientY;
});

function initializeDrag() {
  isDragging = false;
  prevDelta = delta;
}

container.addEventListener("mouseleave", initializeDrag);
door.addEventListener("pointerup", initializeDrag);

door.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  const dx = prev.x - event.clientX;
  const dy = prev.y - event.clientY;

  delta = prevDelta + Math.cos(RADIAN) * dx + Math.sin(RADIAN) * dy;
  if (delta <= 0) {
    if (3 * Math.random() > 2) {
      hiddenMan.style.display = "block";
      manShadow.style.display = "block";
    } else {
      hiddenMan.style.display = "none";
      manShadow.style.display = "none";
    }
  }
  const effectiveDelta = Math.max(0, Math.min(delta, DOOR_WIDTH));
  const gradationAngle =
    (Math.atan(
      (FLOORLIGHT_WIDTH * Math.sqrt(effectiveDelta / DOOR_WIDTH) -
        effectiveDelta) /
        FLOORLIGHT_HEIGHT,
    ) /
      Math.PI) *
    180;
  door.style.transform = `translateX(${-effectiveDelta}px)`;
  floorlight.style.clipPath = `polygon(${FLOORLIGHT_WIDTH - effectiveDelta}px 0, ${FLOORLIGHT_WIDTH * (1 - Math.sqrt(effectiveDelta / DOOR_WIDTH))}px ${FLOORLIGHT_HEIGHT}px, 100% 100%, 100% 0)`;
  floorlight.style.background = `linear-gradient(${gradationAngle}deg, transparent 30%, #FFFF0033 60%, yellow 120%)`;
});
