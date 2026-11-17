import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormSelectField } from '../../modules/form-select-field/form-select-field';
import { FormTextField } from '../../modules/form-text-field/form-text-field';
import { MemberSession } from '../../services/member-session';
import {
  adjacentSibling,
  siteTreesApi,
  type NestedSiteTree,
  type SiteTreeFrontend,
  type SiteTreeNode,
} from '../../services/site-trees-api';
import { SiteTreeOutline } from './site-tree-outline';

type NodeBaseline = {
  label: string;
  path: string;
  sectionTag: string;
  sortOrder: string;
};

const emptyBaseline = (): NodeBaseline => ({
  label: '',
  path: '',
  sectionTag: '',
  sortOrder: '0',
});

/**
 * Members Site Tree Editor (GSSC5-116): admin CRUD/reorder over GSSC5-40
 * /site-trees/{frontend} for Public and Members trees.
 */
@Component({
  selector: 'gssc-site-tree-editor-page',
  imports: [FormSelectField, FormTextField, SiteTreeOutline],
  templateUrl: './site-tree-editor.html',
})
export class SiteTreeEditorPage implements OnInit {
  private readonly memberSession = inject(MemberSession);

  protected readonly frontendOptions = [
    { value: 'public', label: 'Public Frontend' },
    { value: 'members', label: 'Members Frontend' },
  ];

  readonly frontend = signal<SiteTreeFrontend>('members');
  readonly tree = signal<NestedSiteTree | null>(null);
  readonly selectedCuid = signal<string | null>(null);
  readonly statusMessage = signal('');
  readonly label = signal('');
  readonly path = signal('');
  readonly sectionTag = signal('');
  readonly sortOrder = signal('0');

  private baseline: NodeBaseline = emptyBaseline();

  // @relation(GSSC-MLLR-521, GSSC-MLLR-537, scope=range_start, role=Implementation)
  readonly permitted = computed(() => this.memberSession.isAdmin());
  // @relation(GSSC-MLLR-521, GSSC-MLLR-537, scope=range_end, role=Implementation)

  readonly outlineNodes = computed(() => {
    const loaded = this.tree();
    return loaded ? [loaded.root] : [];
  });

  readonly selectedNode = computed(() => {
    const cuid = this.selectedCuid();
    const loaded = this.tree();
    if (!cuid || !loaded) return null;
    return findNode(loaded.root, cuid);
  });

  readonly isRootSelected = computed(() => {
    const loaded = this.tree();
    const cuid = this.selectedCuid();
    return loaded != null && cuid != null && loaded.root.cuid === cuid;
  });

  readonly hasSelection = computed(() => this.selectedCuid() != null);

  async ngOnInit(): Promise<void> {
    await this.reloadTree();
    if (!this.permitted()) {
      // @relation(GSSC-MLLR-539, scope=range_start, role=Implementation)
      this.statusMessage.set('Administrator permission is required to edit site trees.');
      // @relation(GSSC-MLLR-539, scope=range_end, role=Implementation)
    }
  }

  // @relation(GSSC-MLLR-524, scope=range_start, role=Implementation)
  async onFrontendChange(next: string): Promise<void> {
    if (next !== 'public' && next !== 'members') return;
    this.frontend.set(next);
    this.selectedCuid.set(null);
    this.clearFields();
    await this.reloadTree();
  }
  // @relation(GSSC-MLLR-524, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-527, scope=range_start, role=Implementation)
  onSelectNode(cuid: string): void {
    const loaded = this.tree();
    if (!loaded) return;
    const node = findNode(loaded.root, cuid);
    if (!node) return;
    this.selectedCuid.set(cuid);
    this.applyNode(node);
    this.statusMessage.set('');
  }
  // @relation(GSSC-MLLR-527, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-533, scope=range_start, role=Implementation)
  async onCreateChild(): Promise<void> {
    if (!this.permitted()) return;
    const parent = this.selectedNode();
    if (!parent) {
      this.statusMessage.set('Select a parent node first.');
      return;
    }
    const fields = this.readFields();
    if (!fields) return;

    const created = await siteTreesApi.create(this.frontend(), {
      label: fields.label,
      path: fields.path,
      sortOrder: fields.sortOrder,
      parentId: parent.cuid,
      sectionTag: fields.sectionTag,
    });
    if (!created) {
      this.statusMessage.set('Create failed.');
      return;
    }
    this.statusMessage.set('Created.');
    await this.reloadTree(created.cuid);
  }
  // @relation(GSSC-MLLR-533, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-534, scope=range_start, role=Implementation)
  async onSave(): Promise<void> {
    if (!this.permitted()) return;
    const cuid = this.selectedCuid();
    if (!cuid) return;
    const fields = this.readFields();
    if (!fields) return;

    const updated = await siteTreesApi.update(this.frontend(), cuid, {
      label: fields.label,
      path: fields.path,
      sortOrder: fields.sortOrder,
      sectionTag: fields.sectionTag,
    });
    if (!updated) {
      this.statusMessage.set('Save failed.');
      return;
    }
    this.statusMessage.set('Saved.');
    await this.reloadTree(cuid);
  }
  // @relation(GSSC-MLLR-534, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-535, scope=range_start, role=Implementation)
  async onDelete(): Promise<void> {
    if (!this.permitted()) return;
    const cuid = this.selectedCuid();
    if (!cuid || this.isRootSelected()) return;

    const ok = await siteTreesApi.remove(this.frontend(), cuid);
    if (!ok) {
      this.statusMessage.set('Delete failed.');
      return;
    }
    this.statusMessage.set('Deleted.');
    this.selectedCuid.set(null);
    this.clearFields();
    await this.reloadTree();
  }
  // @relation(GSSC-MLLR-535, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-536, scope=range_start, role=Implementation)
  async onMove(direction: -1 | 1): Promise<void> {
    if (!this.permitted()) return;
    const loaded = this.tree();
    const cuid = this.selectedCuid();
    if (!loaded || !cuid || this.isRootSelected()) return;

    const neighbor = adjacentSibling(loaded.root, cuid, direction);
    const current = findNode(loaded.root, cuid);
    if (!neighbor || !current) {
      this.statusMessage.set('Cannot move further in that direction.');
      return;
    }

    const currentOrder = current.sortOrder;
    const neighborOrder = neighbor.sortOrder;
    const first = await siteTreesApi.update(this.frontend(), cuid, {
      sortOrder: neighborOrder,
    });
    const second = await siteTreesApi.update(this.frontend(), neighbor.cuid, {
      sortOrder: currentOrder,
    });
    if (!first || !second) {
      this.statusMessage.set('Reorder failed.');
      return;
    }
    this.statusMessage.set(direction < 0 ? 'Moved up.' : 'Moved down.');
    await this.reloadTree(cuid);
  }
  // @relation(GSSC-MLLR-536, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-538, scope=range_start, role=Implementation)
  onDiscard(): void {
    this.label.set(this.baseline.label);
    this.path.set(this.baseline.path);
    this.sectionTag.set(this.baseline.sectionTag);
    this.sortOrder.set(this.baseline.sortOrder);
    this.statusMessage.set('Discarded.');
  }
  // @relation(GSSC-MLLR-538, scope=range_end, role=Implementation)

  // @relation(GSSC-MLLR-521, scope=range_start, role=Implementation)
  private async reloadTree(selectCuid?: string): Promise<void> {
    const loaded = await siteTreesApi.get(this.frontend());
    this.tree.set(loaded);
    if (!loaded) {
      this.statusMessage.set('Site tree unavailable.');
      this.selectedCuid.set(null);
      this.clearFields();
      return;
    }
    if (selectCuid) {
      const node = findNode(loaded.root, selectCuid);
      if (node) {
        this.selectedCuid.set(selectCuid);
        this.applyNode(node);
        return;
      }
    }
    const cuid = this.selectedCuid();
    if (cuid) {
      const node = findNode(loaded.root, cuid);
      if (node) {
        this.applyNode(node);
        return;
      }
      this.selectedCuid.set(null);
      this.clearFields();
    }
  }
  // @relation(GSSC-MLLR-521, scope=range_end, role=Implementation)

  private applyNode(node: SiteTreeNode): void {
    // @relation(GSSC-MLLR-530, scope=range_start, role=Implementation)
    const next: NodeBaseline = {
      label: node.label,
      path: node.path,
      sectionTag: node.sectionTag ?? '',
      sortOrder: String(node.sortOrder),
    };
    this.baseline = next;
    this.label.set(next.label);
    this.path.set(next.path);
    this.sectionTag.set(next.sectionTag);
    this.sortOrder.set(next.sortOrder);
    // @relation(GSSC-MLLR-530, scope=range_end, role=Implementation)
  }

  private clearFields(): void {
    this.baseline = emptyBaseline();
    this.label.set('');
    this.path.set('');
    this.sectionTag.set('');
    this.sortOrder.set('0');
  }

  private readFields():
    | { label: string; path: string; sectionTag: string | null; sortOrder: number }
    | null {
    const label = this.label().trim();
    const path = this.path().trim();
    const sectionRaw = this.sectionTag().trim();
    const sortRaw = this.sortOrder().trim();
    if (!label || !path) {
      this.statusMessage.set('Label and path are required.');
      return null;
    }
    if (!/^-?\d+$/.test(sortRaw)) {
      this.statusMessage.set('Sort order must be an integer.');
      return null;
    }
    return {
      label,
      path,
      sectionTag: sectionRaw.length > 0 ? sectionRaw : null,
      sortOrder: Number.parseInt(sortRaw, 10),
    };
  }
}

function findNode(root: SiteTreeNode, cuid: string): SiteTreeNode | null {
  if (root.cuid === cuid) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, cuid);
    if (found) return found;
  }
  return null;
}
