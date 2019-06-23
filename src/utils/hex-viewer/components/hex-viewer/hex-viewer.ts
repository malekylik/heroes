import { Allocator, getBytesCount } from 'memory/allocator';
import { min, max } from 'utils/number';
import { createStyleTagAt } from 'utils/css';
import {
  ELEMENT_HEIGTH,
  getElementIndx,
  getElementInContainerCount,
  get1ByteValueOffset,
  getValue,
  get4ByteValueOffset,
  getAddressLength,
  get1ByteValueLength,
  get4ByteValueLength,
} from '../../utils';
import {
  getWrapperClassName,
  getScrollerClassName,
  getHexViewerClassName,
  createScrollerStyle,
  createWrapperStyle,
  createContainerStyle,
  createCellStyle,
  createContainer,
  setCellClass,
} from '../../utils/css';

export default class HexViewer {
  private parent: HTMLElement;
  private wrapper: HTMLElement;
  private scroller: HTMLElement;
  private container: HTMLElement;

  private allocator: Allocator;

  private wrapperHeigth: number = 0;
  private wrapperScroll: number = 0;
  private thresholdElementCount: number = 4;
  private startIndx: number = 0;
  private startRenderIndx: number = 0;

  private checkCallbackId: number = -1;

  constructor(parent: HTMLElement, a: Allocator, startRenderIndx: number = 0) {
    this.parent = parent;
    this.allocator = a;
    this.startRenderIndx = startRenderIndx;
    this.startIndx = this.getStartElementIndx(this.wrapperScroll);

    this.createElements();

    this.init();
    this.initStyle(parent);

    this.insetInDOM(parent);
  }

  render(): void {
    this.syncElementCount(this.getElementRenderCount());
    this.updateElementsPosition(this.wrapperScroll);
    this.updateElementsValue(this.getStartElementIndx(this.wrapperScroll));

    if (this.checkCallbackId === -1) {
      this.checkState();
    }
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
      this.updateElementsValue(this.startIndx);
    }

    if (scrollPosition !== this.wrapperScroll) {
      this.updateElementsPosition(scrollPosition);

      const startIndx = this.getStartElementIndx(scrollPosition);

      if (this.startIndx !== startIndx) {
        this.updateElementsValue(startIndx);
        this.startIndx = startIndx
      }

      this.wrapperScroll = scrollPosition;
    }
  }

  private syncElementCount(count: number): void {
    const allCount = getAddressLength(count) + get1ByteValueLength(count) + get4ByteValueLength(count);
    let length = this.container.children.length;

    if (length < allCount) {
      const fragment = document.createDocumentFragment();

      while ((length++) !== allCount) fragment.appendChild(createContainer(1, 1));

      this.container.appendChild(fragment);

      setCellClass(this.container.children, 0, getAddressLength(count), 1, 1);
      setCellClass(this.container.children, get1ByteValueOffset(count), get4ByteValueOffset(count), 2, 1);
      setCellClass(this.container.children, get4ByteValueOffset(count), allCount, 3, 4);
    } else if (allCount < length) {
      while (allCount !== length) this.container.removeChild(this.container.children[--length]);
    }
  }

  private updateElementsPosition(scrollPosition: number): void {
    const thresholdAfterPixels = this.thresholdElementCount * ELEMENT_HEIGTH ;
    let yOffset = scrollPosition - this.getBeforePixels(scrollPosition);

    yOffset -= this.getAfterScrollHeigth(scrollPosition) < thresholdAfterPixels ? thresholdAfterPixels - this.getAfterScrollHeigth(scrollPosition) : 0;

    this.container.style.transform = `translate3d(0px, ${yOffset}px, 0px)`;
  }

  private updateElementsValue(newStartIndx: number): void {
    const length = this.getElementRenderCount();

    newStartIndx = min(newStartIndx, this.getTotalElementCount() - length);

    this.updateAddressValue(newStartIndx, length);
    this.update1ByteValue(newStartIndx, length);
    this.update4ByteValue(newStartIndx, length);
  }

  private updateAddressValue(newStartIndx: number, length: number): void {
    const children = this.container.children;
    let i = 0;

    while (i < length) {
      children[i].textContent = String(newStartIndx);

      i += 1;
      newStartIndx += 1;
    }
  }

  private update1ByteValue(newStartIndx: number, length: number): void {
    const children = this.container.children;
    let i = get1ByteValueOffset(length);
    length = i + get1ByteValueLength(length);

    while (i < length) {
      children[i].textContent = String(getValue(this.allocator, 1, newStartIndx));

      i += 1;
      newStartIndx += 1;
    }
  }

  private update4ByteValue(newStartIndx: number, length: number): void {
    const children = this.container.children;
    let i = get4ByteValueOffset(length);
    length = i + get4ByteValueLength(length);

    while (i < length) {
      children[i].textContent = String(getValue(this.allocator, 4, newStartIndx));

      i += 1;
      newStartIndx += 1;
    }
  }

  private getParentHeight(): number {
    return min(ELEMENT_HEIGTH * this.getScrollTotalElementCount(), this.parent.clientHeight);
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

  private getScrollTotalElementCount(): number {
    return getBytesCount(this.allocator) - this.startRenderIndx;
  }

  private getTotalElementCount(): number {
    return getBytesCount(this.allocator);
  }

  private getElementRenderCount(): number {
    return this.thresholdElementCount + getElementInContainerCount(this.getWrapperHeight()) + this.thresholdElementCount;
  }

  private getBeforePixels(scrollPosition: number): number {
    return scrollPosition - ((this.getStartElementIndx(scrollPosition) - this.startRenderIndx) * ELEMENT_HEIGTH);
  }

  private getAfterScrollHeigth(scrollPosition: number): number {
    return this.getScrollerHeight() - (scrollPosition + this.getWrapperHeight());
  }

  private getStartElementIndx(scrollPosition: number): number {
    return max(0, this.startRenderIndx + getElementIndx(scrollPosition) - this.thresholdElementCount);
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
      const containerHeigth = this.getParentHeight();
      this.setWrapperHeight(containerHeigth);
      this.setContainerHeight(containerHeigth);
      this.setScrollerHeight(ELEMENT_HEIGTH * this.getScrollTotalElementCount());

      this.wrapperHeigth = containerHeigth;
      this.wrapperScroll = 0;
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
