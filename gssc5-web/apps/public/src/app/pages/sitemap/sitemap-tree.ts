import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SitemapTreeNode } from './sitemap';

/**
 * Nested listing of Public site-tree entries (recursive).
 */
// @relation(GSSC-PLLR-336, GSSC-PLLR-337, GSSC-PLLR-338, scope=range_start, role=Implementation)
@Component({
  selector: 'gssc-sitemap-tree',
  imports: [RouterLink, SitemapTree],
  template: `
    <ul class="gssc-sitemap-tree m-0 list-none p-0 pl-4">
      @for (node of nodes(); track node.cuid) {
        <li class="gssc-sitemap-entry my-1">
          <a
            class="gssc-sitemap-entry__link font-sans text-gssc-dark-green underline"
            [routerLink]="node.path"
            >{{ node.label }}</a
          >
          @if (node.children.length > 0) {
            <gssc-sitemap-tree [nodes]="node.children" />
          }
        </li>
      }
    </ul>
  `,
})
export class SitemapTree {
  readonly nodes = input.required<SitemapTreeNode[]>();
}
// @relation(GSSC-PLLR-336, GSSC-PLLR-337, GSSC-PLLR-338, scope=range_end, role=Implementation)
