const target = container.querySelector(".target");
const shine = target.querySelector(".tilt-shine");

target.addEventListener("mousemove", (e) => {
  const rect = target.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;
  const rotateX = (-y / (rect.height / 2)) * 20;
  const rotateY = (x / (rect.width / 2)) * 20;

  target.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;

  if (shine) {
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    shine.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.3) 0%, transparent 60%)`;
    shine.style.opacity = "1";
  }
});

target.addEventListener("mouseleave", () => {
  target.style.transform =
    "perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)";
  if (shine) {
    shine.style.opacity = "0";
  }
});
