export function createStyleTagAt(target: HTMLElement, styles: string): void {
  const styleTag = document.createElement('style');

  styleTag.insertAdjacentHTML('beforeend', styles);

  target.appendChild(styleTag);
}
