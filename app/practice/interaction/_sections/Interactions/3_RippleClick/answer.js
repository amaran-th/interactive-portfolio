const target = container.querySelector(".target");

target.addEventListener("click", (e) => {
  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const newRipple = document.createElement("div");
  newRipple.className = "ripple";
  newRipple.style.left = `${x}px`;
  newRipple.style.top = `${y}px`;
  newRipple.style.background = `radial-gradient(
    circle,
    rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7) 30%,
    transparent 100%
  )`;
  newRipple.addEventListener("animationend", () => {
    newRipple.remove();
  });
  target.appendChild(newRipple);
});
