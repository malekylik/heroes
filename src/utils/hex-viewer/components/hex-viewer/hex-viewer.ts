import { Allocator, getBytesCount } from 'memory/allocator';
import { numbersToHex, min, max } from 'utils/number';
import { createStyleTagAt } from 'utils/css';
import {
  ELEMENT_HEIGTH,
  getElementIndx,
  getElementInContainerCount,
} from '../../utils';
import {
  getWrapperClassName,
  getScrollerClassName,
  getHexViewerClassName,
  getHexViewerCellClassName,
  createScrollerStyle,
  createWrapperStyle,
  createContainerStyle,
  createCellStyle,
} from '../../utils/css';

export default class HexViewer {
  private parent: HTMLElement;
  private wrapper: HTMLElement;
  private scroller: HTMLElement;
  private container: HTMLElement;

  private allocator: Allocator;

  private wrapperHeigth: number = 0;
  private wrapperScroll: number = 0;
  private tresholdElementCount: number = 4;
  private startIndx: number = 0;

  private checkCallbackId: number = -1;

  constructor(parent: HTMLElement, a: Allocator) {
    this.parent = parent;
    this.allocator = a;

    this.createElements();

    this.init();
    this.initStyle(parent);

    this.insetInDOM(parent);
  }

  render(): void {
    this.syncElementCount(this.getElementRenderCount());
    this.updateElementsPosition(this.wrapperScroll);
    this.updateElementsValue(this.wrapperScroll, this.getStartElementIndx(this.wrapperScroll));

    if (this.checkCallbackId === -1) {
      this.checkState();
    }

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
    this.checkCallbackId = requestAnimationFrame(() => this.checkState());

    const height = this.getParentHeight();
    const scrollPosition = this.getWrapperScroll();

    if (height !== this.wrapperHeigth) {
      this.wrapperHeigth = height;

      this.setWrapperHeight(height);
      this.setContainerHeight(height);

      this.syncElementCount(this.getElementRenderCount());
      this.updateElementsValue(scrollPosition, this.startIndx);
    }

    if (scrollPosition !== this.wrapperScroll) {
      this.updateElementsPosition(scrollPosition);

      const startIndx = this.getStartElementIndx(scrollPosition);

      if (this.startIndx !== startIndx) {
        this.updateElementsValue(scrollPosition, startIndx);
        this.startIndx = startIndx
      }

      this.wrapperScroll = scrollPosition;
    }
  }

  private syncElementCount(count: number): void {
    let length = this.container.children.length;

    if (length < count) {
      const fragment = document.createDocumentFragment();

      while (count !== (length++)) {
        const div = document.createElement('div');

        div.classList.add(getHexViewerCellClassName(1, 1));

        fragment.appendChild(div);
      }

      this.container.appendChild(fragment);
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

  private updateElementsPosition(scrollPosition: number): void {
    const tresholdAfterPixels = (this.tresholdElementCount - 1) * ELEMENT_HEIGTH ;
    let yOffset = scrollPosition - this.getBeforePixels(scrollPosition);

    yOffset -= this.getAfterScrollHeigth(scrollPosition) < tresholdAfterPixels ? tresholdAfterPixels - this.getAfterScrollHeigth(scrollPosition) : 0;

    this.container.style.transform = `translate3d(0px, ${yOffset}px, 0px)`;
  }

  private getTotalElementCount(): number {
    return getBytesCount(this.allocator);
  }

  private getElementRenderCount(): number {
    return this.tresholdElementCount + getElementInContainerCount(this.getWrapperHeight()) + this.tresholdElementCount;
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

  private getStartElementIndx(scrollPosition: number): number {
    return max(0, getElementIndx(scrollPosition) - this.tresholdElementCount);
  }

  private getEndElementIndx(scrollPosition: number): number {
    return min(this.getStartElementIndx(scrollPosition) + this.getElementRenderCount(), this.getTotalElementCount());
  }

  private updateElementsValue(scrollPosition: number, newStartIndx: number): void {
    const length = this.getElementRenderCount();
    const children = this.container.children;
    let i = 0;

    newStartIndx = min(newStartIndx, this.getTotalElementCount() - length);

    while (i < children.length && i < length) {
      children[i].textContent = String(newStartIndx);

      i += 1;
      newStartIndx += 1;
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

  
  private createElements(): void {
    this.wrapper = document.createElement('div');
    this.scroller = document.createElement('div');
    this.container = document.createElement('div');
  }

  private init(): void {
      this.wrapperHeigth = this.getWrapperHeight();
      this.wrapperScroll = this.getWrapperScroll();
  
      const containerHeigth = this.getParentHeight();
      this.setWrapperHeight(containerHeigth);
      this.setContainerHeight(containerHeigth);
      this.setScrollerHeight(ELEMENT_HEIGTH * getBytesCount(this.allocator));
  }

  private initStyle(parent: HTMLElement): void {
    createStyleTagAt(
      parent,
      createWrapperStyle() +
      createScrollerStyle()+
      createContainerStyle(3) +
      createCellStyle(1, 1) +
      createCellStyle(2, 1) +
      createCellStyle(3, 4)
      );

      this.wrapper.classList.add(getWrapperClassName());
      this.scroller.classList.add(getScrollerClassName());
      this.container.classList.add(getHexViewerClassName());
  }

  insetInDOM(parent: HTMLElement): void {
    this.scroller.appendChild(this.container);
    this.wrapper.appendChild(this.scroller);
    parent.appendChild(this.wrapper);
  }
}
