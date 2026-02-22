const target = container.querySelector(".target");
const magneticButton = target.querySelector(".magnetic-button");
const backgroundText = target.querySelector(".background-text");

const prevPosition = { x: 0, y: 0 };
let count = 0;

magneticButton.addEventListener("click", () => {
  count = 0;
  backgroundText.classList.remove("visible");
  magneticButton.classList.remove("earnest");
});

target.addEventListener("mousemove", (e) => {
  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;

  if (prevPosition.x * x <= 0 || prevPosition.y * y <= 0) {
    count++;
  }
  if (count > 30) {
    backgroundText.classList.add("visible");
  } else if (count > 10) {
    magneticButton.classList.add("earnest");
  }
  magneticButton.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  prevPosition.x = x;
  prevPosition.y = y;
});

target.addEventListener("mouseleave", () => {
  magneticButton.style.transform = "translate(0px, 0px)";
});
