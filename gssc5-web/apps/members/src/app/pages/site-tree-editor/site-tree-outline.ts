import { Component, input, output } from '@angular/core';
import type { SiteTreeNode } from '../../services/site-trees-api';

/**
 * Nested selectable outline for the Site Tree Editor (GSSC5-116).
 */
// @relation(GSSC-MLLR-527, GSSC-MLLR-528, GSSC-MLLR-529, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-site-tree-outline',
  imports: [SiteTreeOutline],
  template: `
    <ul class="gssc-site-tree-outline m-0 list-none p-0" data-slot="site-tree-outline">
      @for (node of nodes(); track node.cuid) {
        <li class="gssc-site-tree-outline__item my-0.5">
          <button
            type="button"
            class="gssc-site-tree-outline__node w-full cursor-pointer rounded-md border border-transparent px-2 py-1 text-start font-sans text-sm text-gssc-dark-green hover:bg-gssc-gray"
            [class.bg-gssc-light-green]="selectedCuid() === node.cuid"
            [class.border-gssc-dark-green]="selectedCuid() === node.cuid"
            [attr.data-cuid]="node.cuid"
            (click)="select.emit(node.cuid)"
          >
            {{ node.label }}
          </button>
          @if (node.children.length > 0) {
            <gssc-site-tree-outline
              class="block pl-4"
              [nodes]="node.children"
              [selectedCuid]="selectedCuid()"
              (select)="select.emit($event)"
            />
          }
        </li>
      }
    </ul>
  `,
})
export class SiteTreeOutline {
  readonly nodes = input.required<SiteTreeNode[]>();
  readonly selectedCuid = input<string | null>(null);
  readonly select = output<string>();
}
// @relation(GSSC-MLLR-527, GSSC-MLLR-528, GSSC-MLLR-529, scope=range_end, role=Implementation)
