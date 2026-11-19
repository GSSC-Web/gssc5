import { Component, input, output } from '@angular/core';
import type { SiteTreeNode } from '../../services/site-trees-api';

/**
 * Nested selectable outline for the Site Tree Editor (GSSC5-116 / GSSC5-138).
 */
// @relation(GSSC-MLLR-527, GSSC-MLLR-528, GSSC-MLLR-529, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-site-tree-outline',
  imports: [SiteTreeOutline],
  template: `
    <ul class="gssc-site-tree-outline m-0 list-none p-0" data-slot="site-tree-outline">
      @for (node of nodes(); track node.cuid) {
        <li class="gssc-site-tree-outline__item my-0.5">
          <div class="flex items-center gap-1">
            <!-- Fixed-width toggle column so labels align by depth (GSSC-183). -->
            <span
              class="gssc-site-tree-outline__toggle inline-flex w-5 shrink-0 items-center justify-center"
              data-slot="site-tree-outline-toggle"
              [attr.data-cuid]="node.cuid"
            >
              @if (hasChildren(node)) {
                <!-- @relation(GSSC-MLLR-668, GSSC-MLLR-669, GSSC-MLLR-670, scope=range_start, role=Implementation) -->
                <button
                  type="button"
                  class="gssc-site-tree-outline__expander cursor-pointer border-0 bg-transparent p-0 font-sans text-sm leading-none text-gssc-dark-green"
                  data-slot="site-tree-outline-expander"
                  [attr.data-cuid]="node.cuid"
                  [attr.aria-expanded]="isExpanded(node.cuid)"
                  [attr.aria-label]="
                    isExpanded(node.cuid)
                      ? 'Collapse ' + node.label
                      : 'Expand ' + node.label
                  "
                  (click)="onToggleExpand($event, node.cuid)"
                >
                  {{ isExpanded(node.cuid) ? '−' : '+' }}
                </button>
                <!-- @relation(GSSC-MLLR-668, GSSC-MLLR-669, GSSC-MLLR-670, scope=range_end, role=Implementation) -->
              }
            </span>
            <button
              type="button"
              class="gssc-site-tree-outline__node min-w-0 flex-auto cursor-pointer rounded-md border border-transparent px-2 py-1 text-start font-sans text-sm text-gssc-dark-green hover:bg-gssc-gray"
              [class.bg-gssc-light-green]="selectedCuid() === node.cuid"
              [class.border-gssc-dark-green]="selectedCuid() === node.cuid"
              [attr.data-cuid]="node.cuid"
              (click)="select.emit(node.cuid)"
            >
              {{ node.label }}
            </button>
          </div>
          @if (hasChildren(node) && isExpanded(node.cuid)) {
            <gssc-site-tree-outline
              class="block pl-4"
              [nodes]="node.children"
              [selectedCuid]="selectedCuid()"
              [collapsedIds]="collapsedIds()"
              (select)="select.emit($event)"
              (toggleExpand)="toggleExpand.emit($event)"
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
  // @relation(GSSC-MLLR-668, GSSC-MLLR-669, scope=range_start, role=Implementation)
  readonly collapsedIds = input<ReadonlySet<string>>(new Set());
  readonly select = output<string>();
  readonly toggleExpand = output<string>();

  protected hasChildren(node: SiteTreeNode): boolean {
    return (node.children?.length ?? 0) > 0;
  }

  protected isExpanded(cuid: string): boolean {
    return !this.collapsedIds().has(cuid);
  }

  protected onToggleExpand(event: Event, cuid: string): void {
    event.stopPropagation();
    this.toggleExpand.emit(cuid);
  }
  // @relation(GSSC-MLLR-668, GSSC-MLLR-669, scope=range_end, role=Implementation)
}
// @relation(GSSC-MLLR-527, GSSC-MLLR-528, GSSC-MLLR-529, scope=range_end, role=Implementation)
