import { createStyleTagAt } from '../../../css';
import { Allocator, getBytesCount } from '../../../../memory/allocator';
import { Pointer } from '../../../../memory/types';
import { getInt32 } from '../../../../memory/types/Int/Int32';
import { getInt8 } from '../../../../memory/types/Int/Int8';

function getHexViewerClassName(): string {
  return 'hex-viewer';
};

function getHexViewerCellClassName(column: number, byteSize: number): string {
  return `${getHexViewerClassName()}__cell-column-${column}-bytes-${byteSize}`;
};

export default class HexViewer {
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = document.createElement('div');
    this.container.classList.add(getHexViewerClassName());

    this.init(container);

    container.appendChild(this.container);
  }

  render(allocator: Allocator): void {
    this.container.appendChild(this.renderList(allocator, 1, (div) => {
      div.classList.add(getHexViewerCellClassName(1, 1));

      return div;
    }));
    this.container.appendChild(this.renderList(allocator, 4, (div) => {
      div.classList.add(getHexViewerCellClassName(3, 4));

      return div;
    }));
  }

  private init(container: HTMLElement): void {
    createStyleTagAt(
      container,
      createContainerStyle(3) +
      createCellStyle(1, 1) +
      createCellStyle(2, 1) +
      createCellStyle(3, 4)
      );
  }

  private renderList(allocator: Allocator, byteSize: number, customizeDiv: (div: HTMLDivElement) => HTMLDivElement): DocumentFragment {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < getBytesCount(allocator); i += byteSize) {
      const div = customizeDiv(document.createElement('div'));
      div.innerText = String(this.getValue(allocator, byteSize, i));

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
        display: grid;
        grid-template-columns: repeat(${columnsCount}, 1fr);
        grid-auto-flow: column;
        height: 100vh;
        overflow-y: auto;
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
      }
    `
  );
}
