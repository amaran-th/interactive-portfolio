const DOOR_END_POINT = 200;

const door = container.querySelector(".door");
const floorlight = container.querySelector(".floorlight");
const hiddenMan = container.querySelector(".hidden-man");
const manShadow = container.querySelector(".man-shadow");

let isDragging = false;
let startOpenAmount = 0; // 드래그를 시작했을 때 문이 열린 정도(px 단위)
let savedOpenAmount = 0; // 현재 문이 열린 정도(px 단위)
let startX = 0; // 드래그를 시작했을 때 마우스의 x 좌표(px 단위)

door.addEventListener("pointerdown", (event) => {
  isDragging = true;
  startX = event.clientX;
  startOpenAmount = savedOpenAmount;
});

function initializeDrag() {
  isDragging = false;
}

document.addEventListener("mouseleave", initializeDrag);
door.addEventListener("pointerup", initializeDrag);

door.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  const dx = startX - event.clientX; // 이번 드래그 이벤트 동안 문이 열린 정도
  savedOpenAmount = startOpenAmount + dx; // 현재 문이 열린 정도
  if (savedOpenAmount <= 0) {
    if (3 * Math.random() > 2) {
      hiddenMan.style.display = "block";
      manShadow.style.display = "block";
    } else {
      hiddenMan.style.display = "none";
      manShadow.style.display = "none";
    }
  }
  const effectiveOpenAmount = Math.min(100, Math.max(0, savedOpenAmount));
  door.style.transform = `translateX(${-effectiveOpenAmount}px)`;
  floorlight.style.clipPath = `polygon(${DOOR_END_POINT - effectiveOpenAmount}px 0, ${DOOR_END_POINT - 2 * effectiveOpenAmount}px 300px, ${DOOR_END_POINT + effectiveOpenAmount}px 300px, ${DOOR_END_POINT}px 0)`;
});
