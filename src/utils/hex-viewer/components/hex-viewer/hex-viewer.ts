import { createStyleTagAt } from '../../../css';
import { Allocator, getBytesCount } from '../../../../memory/allocator';
import { Pointer } from '../../../../memory/types';
import { getInt32 } from '../../../../memory/types/Int/Int32';
import { getInt8 } from '../../../../memory/types/Int/Int8';
import { numbersToHex, min, max } from '../../../number';
import { toInt32 } from '../../../../memory/coercion';

const ELEMENT_HEIGTH: number = 28;

function getHexViewerClassName(): string {
  return 'hex-viewer';
};

function getHexViewerCellClassName(column: number, byteSize: number): string {
  return `${getHexViewerClassName()}__cell-column-${column}-bytes-${byteSize}`;
};

export default class HexViewer {
  private parent: HTMLElement;
  private wrapper: HTMLElement;
  private scroller: HTMLElement;
  private container: HTMLElement;

  private allocator: Allocator;

  private wrapperHeigth: number;
  private wrapperScroll: number;
  private tresholdElementCount: number = 4;

  constructor(container: HTMLElement, a: Allocator) {
    this.parent = container;
    this.allocator = a;
    this.wrapper = document.createElement('div');
    this.scroller = document.createElement('div');

    this.init(container);

    const containerHeigth = container.getBoundingClientRect().height;
    this.setWrapperHeight(containerHeigth);
    this.setContainerHeight(containerHeigth);
    this.setScrollerHeight(ELEMENT_HEIGTH * getBytesCount(this.allocator));

    this.scroller.style.position = 'relative';
    this.scroller.style.overflowY = 'hidden';
    this.wrapper.style.overflowY = 'auto';
    
    this.scroller.appendChild(this.container);
    this.wrapper.appendChild(this.scroller);
    container.appendChild(this.wrapper);
  }

  render(allocator: Allocator): void {
    this.syncElementCount(this.getElementRenderCount(0));
    this.updateElementsPosition(0);
    this.checkState();

    // const hex = numbersToHex(new Array(getBytesCount(allocator)).fill(0).map((v, i) => i), 8);

    // this.container.appendChild(this.renderList(allocator, 1, (div, i) => {
    //   div.classList.add(getHexViewerCellClassName(1, 1));
    //   div.innerText = hex[i];

    //   return div;
    // }));

    // this.container.appendChild(this.renderList(allocator, 1, (div, i) => {
    //   div.classList.add(getHexViewerCellClassName(2, 1));
    //   div.innerText = String(this.getValue(allocator, 1, i));

    //   return div;
    // }));


    // this.container.appendChild(this.renderList(allocator, 4, (div, i) => {
    //   div.classList.add(getHexViewerCellClassName(3, 4));
    //   div.innerText = String(this.getValue(allocator, 4, i));

    //   return div;
    // }));
  }

  private checkState(): void {
    requestAnimationFrame(() => this.checkState());

    const height = this.getParentHeight();
    const scrollPosition = this.getWrapperScroll();

    if (height !== this.wrapperHeigth) {
      this.wrapperHeigth = height;

      this.setWrapperHeight(height);
      this.setContainerHeight(height);

      this.syncElementCount(this.getElementRenderCount(scrollPosition));
    }

    if (scrollPosition !== this.wrapperScroll) {
      this.updateElementsPosition(scrollPosition);
      this.updateElementsValue(scrollPosition);

      this.wrapperScroll = scrollPosition;
    }
  }

  private syncElementCount(count: number): void {
    let length = this.container.children.length;

    if (length < count) {
      while (count !== (length++))
        this.container.insertAdjacentHTML(
          'beforeend',
          `<div class='${getHexViewerCellClassName(1, 1)}'>${length}</div>`
        );
    } else if (count < length) {
      while (count !== length) this.container.removeChild(this.container.children[--length]);
    }
  }

  private getParentHeight(): number {
    return this.parent.clientHeight;
  }

  private getScrollerHeight(): number {
    return this.scroller.getBoundingClientRect().height;
  }

  private getWrapperHeight(): number {
    return this.wrapper.getBoundingClientRect().height;
  }

  private setWrapperHeight(height: number): void {
    this.wrapper.style.height = `${height}px`;
  }

  private setScrollerHeight(height: number): void {
    this.scroller.style.height = `${height}px`;
  }

  private setContainerHeight(height: number): void {
    this.container.style.height = `${height}px`;
  }

  private getWrapperScroll(): number {
    return this.wrapper.scrollTop;
  }

  private init(container: HTMLElement): void {
    createStyleTagAt(
      container,
      createContainerStyle(3) +
      createCellStyle(1, 1) +
      createCellStyle(2, 1) +
      createCellStyle(3, 4)
      );

      this.container = document.createElement('div');
      this.container.classList.add(getHexViewerClassName());

      this.wrapperHeigth = this.getWrapperHeight();
      this.wrapperScroll = this.getWrapperScroll();
  }

  private updateElementsPosition(scrollPosition: number): void {
    const tresholdAfterPixels = (this.tresholdElementCount - 1) * ELEMENT_HEIGTH ;
    let yOffset = scrollPosition - this.getBeforePixels(scrollPosition);

    yOffset -= this.getAfterScrollHeigth(scrollPosition) < tresholdAfterPixels ? tresholdAfterPixels - this.getAfterScrollHeigth(scrollPosition) : 0;

    this.container.style.transform = `translate3d(0px, ${yOffset}px, 0px)`;
  }

  private getTotalElementCount(): number {
    return getBytesCount(this.allocator);
  }

  private getElementRenderCount(scrollPosition: number): number {
    return this.tresholdElementCount + this.getElementInContainerCount() + this.tresholdElementCount;
  }

  private getBeforePixels(scrollPosition: number): number {
    return scrollPosition - (this.getStartElementIndx(scrollPosition) * ELEMENT_HEIGTH);
  }

  private getAfterPixels(scrollPosition: number): number {
    return this.getEndElementIndx(scrollPosition) * ELEMENT_HEIGTH - scrollPosition - this.getWrapperHeight();
  }

  private getAfterScrollHeigth(scrollPosition: number): number {
    return this.getScrollerHeight() - (scrollPosition + this.getWrapperHeight());
  }

  private getElementInContainerCount(): number {
    return toInt32(this.getWrapperHeight() / ELEMENT_HEIGTH);
  }

  private getStartElementIndx(scrollPosition: number): number {
    return max(0, this.getElementIndx(scrollPosition) - this.tresholdElementCount);
  }

  private getElementIndx(scrollPosition: number): number {
    return toInt32(scrollPosition / ELEMENT_HEIGTH);
  }

  private getEndElementIndx(scrollPosition: number): number {
    return min(this.getStartElementIndx(scrollPosition) + this.getElementRenderCount(scrollPosition), this.getTotalElementCount());
  }

  private updateElementsValue(scrollPosition: number): void {
    const length = this.getElementRenderCount(scrollPosition);
    const children = this.container.children;
    let startIndx = max(0, this.getElementIndx(scrollPosition) - this.tresholdElementCount);
    let i = 0;

    startIndx = min(startIndx, this.getTotalElementCount() - length);
    
    while (i < children.length && i < length) {
      // children[i].innerHTML = String(this.getValue(this.allocator, 1, startIndx));
      children[i].innerHTML = String(startIndx);
      i += 1;
      startIndx += 1;
    } 
  }

  private renderList(allocator: Allocator, byteSize: number, customizeDiv: (div: HTMLDivElement, inx: number) => HTMLDivElement): DocumentFragment {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < getBytesCount(allocator); i += byteSize) {
      const div = customizeDiv(document.createElement('div'), i);
      fragment.appendChild(div);
    }

    return fragment;
  }

  private getValue(allocator: Allocator, byteSize: number, address: Pointer): number {
    switch(byteSize) {
      case 1: return getInt8(allocator, address);
      case 4: return getInt32(allocator, address);
      default: return -1;
    }
  }
}

function createContainerStyle(columnsCount: number): string {
  return (
    `
      .${getHexViewerClassName()} {
        position: absolute;
        display: grid;
        grid-template-columns: repeat(${columnsCount}, 1fr);
        grid-auto-flow: column;
        height: 100vh;
      }
    `
  );
}

function createCellStyle(columnNumber: number, byteSize: number): string {
  return (
    `
      .${getHexViewerCellClassName(columnNumber, byteSize)} {
        grid-column: ${columnNumber};
        grid-row: auto / span ${byteSize};
        margin: auto;
        height: ${ELEMENT_HEIGTH}px;
      }
    `
  );
}
