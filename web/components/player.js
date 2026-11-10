function updateSliderFill(input) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const val = Number(input.value) || 0;
  const percentage = ((val - min) / (max - min)) * 100;
  input.style.setProperty("--range-progress", `${percentage}%`);
}

document.querySelectorAll('.range-wrap input[type="range"]').forEach((input) => {
  updateSliderFill(input);
  input.addEventListener("input", () => updateSliderFill(input));
});

