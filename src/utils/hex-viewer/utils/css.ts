import { ELEMENT_HEIGTH } from './';

export function getWrapperClassName(): string {
  return 'hex-viewer-wrapper';
}

export function getScrollerClassName(): string {
  return 'hex-viewer-scroller';
}

export function getHexViewerClassName(): string {
  return 'hex-viewer';
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

export function createContainerStyle(columnsCount: number): string {
  return (
    `
      .${getHexViewerClassName()} {
        position: absolute;
        display: grid;
        grid-template-columns: repeat(${columnsCount}, 1fr);
        grid-auto-flow: column;
        width: 100%;
      }
    `
  );
}

export function createCellStyle(columnNumber: number, byteSize: number): string {
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
