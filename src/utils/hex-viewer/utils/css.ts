import { ELEMENT_HEIGTH } from './';
import { max } from 'utils/number';
import { alignTo8, alignTo } from 'memory/types';

export function getWrapperClassName(): string {
  return 'hex-viewer-wrapper';
}

export function getScrollerClassName(): string {
  return 'hex-viewer-scroller';
}

export function getHexViewerClassName(): string {
  return 'hex-viewer';
};

export function getColumnContainerClassName(postfix: string): string {
  return `hex-viewer-column-${postfix}`;
};

export function getHexViewerCellClassName(column: number, byteSize: number): string {
  return `${getHexViewerClassName()}__cell-column-${column}-bytes-${byteSize}`;
};

export function createWrapperStyle(): string {
  return (
    `
      .${getWrapperClassName()} {
        overflow-y: auto;
      }
    `
  );
}

export function createScrollerStyle(): string {
  return (
    `
      .${getScrollerClassName()} {
        position: relative;
        overflow-y: hidden;
      }
    `
  );
}

export function createContainerStyle(): string {
  return (
    `
      .${getHexViewerClassName()} {
        position: absolute;
        display: flex;
        width: 100%;
      }
    `
  );
}

export function createColumnContainer(postfix: string): string {
  return (
    `
      .${getColumnContainerClassName(postfix)} {
        flex: 1;
      }
    `
  );
}

export function createCellStyle(columnNumber: number, byteSize: number): string {
  return (
    `
      .${getHexViewerCellClassName(columnNumber, byteSize)} {
        height: ${byteSize * ELEMENT_HEIGTH}px;
        box-sizing: border-box;
        border: 1px solid black;
      }
    `
  );
}

export function createContainer(columnNumber: number, byteSize: number): HTMLDivElement {
  const div = document.createElement('div');

  div.classList.add(getHexViewerCellClassName(columnNumber, byteSize));

  return div;
}
