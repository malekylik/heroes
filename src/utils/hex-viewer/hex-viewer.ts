import { Allocator, getBytesCount } from 'memory/allocator/allocator';
import { min } from 'utils/number';
import { createStyleTagAt } from 'utils/css';
import {
  ELEMENT_HEIGTH,
  getElementIndx,
  getElementInContainerCount,
  getValue,
} from './utils';
import {
  getWrapperClassName,
  getScrollerClassName,
  getHexViewerClassName,
  createScrollerStyle,
  createWrapperStyle,
  createContainerStyle,
  createCellStyle,
  createContainer,
  createColumnContainer,
  getColumnContainerClassName,
} from './utils/css';
import { alignTo } from 'memory/types/type';

export default class HexViewer {
  private parent: HTMLElement;
  private wrapper: HTMLElement;
  private scroller: HTMLElement;
  private container: HTMLElement;

  private addressContainer: HTMLDivElement;
  private byte1Container: HTMLDivElement;
  private byte4Container: HTMLDivElement;

  private allocator: Allocator;

  private containerPosition: number = 0;
  private wrapperHeigth: number = 0;
  private thresholdElementCount: number = 4;
  private startRenderIndx: number = 0;

  private checkCallbackId: number = -1;

  constructor(parent: HTMLElement, a: Allocator, startRenderIndx: number = 0) {
    this.parent = parent;
    this.allocator = a;
    this.startRenderIndx = startRenderIndx;

    this.createElements();

    this.init();
    this.initStyle(parent);

    this.insetInDOM(parent);
  }

  render(): void {
    const startIndx  = 0;
    const count = this.getElementRenderCount();

    this.syncElementCount(count);
    this.updateElementsValue(startIndx);

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

      const startIndx = this.getStartElementIndx();
      const count = this.getElementRenderCount();

      this.syncElementCount(count);
      this.updateElementsValue(startIndx);
    }

    const scrollStart = getElementIndx(scrollPosition);
    const scrollEnd = getElementIndx(scrollPosition + this.getWrapperHeight());
    const firstIndx = this.getStartElementIndx() + 1;
    const lastIndx = this.getLastElementIndx();

    const isLess = (scrollStart <= firstIndx && (firstIndx - 1) !== 0);
    const isMore = (scrollEnd >= lastIndx && (lastIndx + 1) !== this.getTotalElementCount());

    if (isLess || isMore) {
      let startIndx: number;

      startIndx = this.updateElementsPosition(scrollPosition);

      this.updateElementsValue(startIndx);
    }
  }

  private syncElementCount(count: number): void {
    const length = this.addressContainer.children.length;

    if (length < count) {
      this.populateContainer(this.addressContainer, count, 1, 1);
      this.populateContainer(this.byte1Container, count, 2, 1);
      this.populateContainer(this.byte4Container, count, 3, 4);
    } else if (count < length) {
      this.cleanContainer(this.addressContainer, count, 1);
      this.cleanContainer(this.byte1Container, count, 1);
      this.cleanContainer(this.byte4Container, count, 4);
    }
  }

  private populateContainer(container: HTMLDivElement, count: number, columnNumber: number, byteSize: number): void {
    const fragment = document.createDocumentFragment();
    const length = Math.ceil(count / byteSize) - container.children.length;

    for (let i = 0; i < length; i++) fragment.appendChild(createContainer(columnNumber, byteSize));

    container.appendChild(fragment);
  }

  private cleanContainer(container: HTMLDivElement, count: number, byteSize: number): void {
    const length = container.children.length - Math.ceil(count / byteSize);

    for (let i = 0; i < length; i++) container.removeChild(container.children[0]);
  }

  private updateElementsPosition(scrollPosition: number): number {
    let currentScrollIndx = getElementIndx(scrollPosition);
    const endIndx = currentScrollIndx + this.getElementRenderCount();
    const total = this.getTotalElementCount();

    if (endIndx > total) {
      currentScrollIndx = total - this.getElementRenderCount();
    } else {
      currentScrollIndx -= ((currentScrollIndx % 4) + this.thresholdElementCount);
    }

    const yOffset = (currentScrollIndx * ELEMENT_HEIGTH);

    this.setContainerPosition(yOffset);

    return currentScrollIndx;
  }

  private updateElementsValue(newStartIndx: number): void {
    const length = this.getElementRenderCount();

    newStartIndx = min(newStartIndx, this.getTotalElementCount() - length);

    this.updateAddressValue(newStartIndx, length);
    this.update1ByteValue(newStartIndx, length);
    this.update4ByteValue(newStartIndx, length);
  }

  private updateAddressValue(newStartIndx: number, length: number): void {
    const children = this.addressContainer.children;
    let i = 0;

    while (i < length) {
      children[i].textContent = String(newStartIndx);

      i += 1;
      newStartIndx += 1;
    }
  }

  private update1ByteValue(newStartIndx: number, length: number): void {
    const children = this.byte1Container.children;
    let i = 0;

    while (i < length) {
      children[i].textContent = String(getValue(this.allocator, 1, newStartIndx));

      i += 1;
      newStartIndx += 1;
    }
  }

  private update4ByteValue(newStartIndx: number, length: number): void {
    const children = this.byte4Container.children;
    let i = 0;
    length = Math.ceil(length / 4);

    while (i < length) {
      children[i].textContent = String(getValue(this.allocator, 4, newStartIndx));

      i += 1;
      newStartIndx += 4;
    }
  }

  private getParentHeight(): number {
    return min(ELEMENT_HEIGTH * this.getScrollTotalElementCount(), this.parent.clientHeight);
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

  private setContainerPosition(y: number): void {
    this.container.style.transform = `translate3d(0px, ${y}px, 0px)`;
    this.containerPosition = y;
  }

  private getContainerPosition(): number {
    return this.containerPosition;
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
    return alignTo(this.thresholdElementCount + getElementInContainerCount(this.getWrapperHeight()) + this.thresholdElementCount, 4);
  }

  private getStartElementIndx(): number {
    const pos: number = this.getContainerPosition()
    const indx: number = pos / ELEMENT_HEIGTH;

    return indx < 0 ? Math.floor(indx) : Math.ceil(indx);
  }

  private getEndElementIndx(): number {
    return this.getStartElementIndx() + this.getElementRenderCount();
  }

  private getLastElementIndx(): number {
    return this.getStartElementIndx() + this.getElementRenderCount() - 1;
  }

  private getEndElementPixel(): number {
    return this.getEndElementIndx() * ELEMENT_HEIGTH;
  }
  
  private createElements(): void {
    this.wrapper = document.createElement('div');
    this.scroller = document.createElement('div');
    this.container = document.createElement('div');

    this.addressContainer = document.createElement('div');
    this.byte1Container = document.createElement('div');
    this.byte4Container = document.createElement('div');
  }

  private init(): void {  
      const containerHeigth = this.getParentHeight();
      this.setWrapperHeight(containerHeigth);
      this.setContainerHeight(containerHeigth);
      this.setScrollerHeight(ELEMENT_HEIGTH * this.getScrollTotalElementCount());

      this.wrapperHeigth = containerHeigth;
  }

  private initStyle(parent: HTMLElement): void {
    createStyleTagAt(
      parent,
      createWrapperStyle() +
      createScrollerStyle() +
      createContainerStyle() +
      createColumnContainer('address') +
      createColumnContainer('1_byte') +
      createColumnContainer('4_byte') +
      createCellStyle(1, 1) +
      createCellStyle(2, 1) +
      createCellStyle(3, 4)
      );

      this.wrapper.classList.add(getWrapperClassName());
      this.scroller.classList.add(getScrollerClassName());
      this.container.classList.add(getHexViewerClassName());

      this.addressContainer.classList.add(getColumnContainerClassName('address'));
      this.byte1Container.classList.add(getColumnContainerClassName('1_byte'));
      this.byte4Container.classList.add(getColumnContainerClassName('4_byte'));
  }

  insetInDOM(parent: HTMLElement): void {
    this.container.appendChild(this.addressContainer);
    this.container.appendChild(this.byte1Container);
    this.container.appendChild(this.byte4Container);

    this.scroller.appendChild(this.container);
    this.wrapper.appendChild(this.scroller);
    parent.appendChild(this.wrapper);
  }
}
