// One shared native modal for equipment and source verification.
let current;
export function closeReferenceDialog({ restoreFocus = true } = {}) {
  if (!current) return;
  const state = current;
  current = undefined;
  if (state.node.open) state.node.close();
  state.node.remove();
  document.body.classList.remove("reference-open");
  document.body.style.paddingRight = state.padding;
  if (restoreFocus && state.trigger?.isConnected)
    state.trigger.focus({ preventScroll: true });
}
export function openReferenceDialog({
  title,
  context,
  content,
  trigger = document.activeElement,
  onReady,
}) {
  if (current?.node.contains(trigger)) trigger = current.trigger;
  closeReferenceDialog({ restoreFocus: false });
  const node = document.createElement("dialog");
  node.className = "reference-dialog";
  node.setAttribute("aria-labelledby", "reference-title");
  node.innerHTML =
    '<header class="reference-header"><div><h2 id="reference-title"></h2><p id="reference-context"></p></div><button type="button" class="button secondary reference-close" aria-label="Close dialog" autofocus>Close</button></header><div class="reference-body"></div>';
  node.querySelector("h2").textContent = title;
  node.querySelector("#reference-context").textContent = context;
  node.querySelector(".reference-body").innerHTML = content;
  const padding = document.body.style.paddingRight;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gap}px`;
  document.body.classList.add("reference-open");
  current = { node, trigger, padding };
  document.body.append(node);
  node.querySelector(".reference-close").onclick = () => closeReferenceDialog();
  node.addEventListener("close", () => {
    if (current?.node === node) closeReferenceDialog();
  });
  node.addEventListener("click", (event) => {
    const rect = node.getBoundingClientRect();
    if (
      event.target === node &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    )
      closeReferenceDialog();
  });
  node.showModal();
  onReady?.(node);
  return node;
}
