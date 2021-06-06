import { Vue } from 'vue-property-decorator';
import { TreeViewItem, CheckedState } from "@/businessLogic/contracts/types";
import { eventHub } from "@/businessLogic/eventHub/explorerEventPublisher";
import { cascadeStateToDescendants, flattenNodes } from "../hierachyTraversal/hierachyTraversal";

export interface TreeViewItemEvents {
    checkedStatusChanged(item: TreeViewItem): void;
}

export interface TreeViewViewModel extends TreeViewItemEvents {
    loadNodes(nodes: TreeViewItem[]): void;
    getNodes(): { [id: string]: TreeViewItem };
    removeTreeViewItem(id: string): boolean;
    removeFromParentNode(itemToRemove: TreeViewItem): void;
    removeChildNodes(node: TreeViewItem): void;
    addTreeViewItem(TreeViewItem: TreeViewItem): void;
    checkedStatusChanged(item: TreeViewItem): void;
}

let flattenedNodesLookUp: { [id: string]: TreeViewItem } = {};

export const notifyParentOfSelection = (item: TreeViewItem): void => {
    const parentId = item.parentId as string;
    if (!parentId) return;
    const parent = flattenedNodesLookUp[parentId];
    
    // This solution is inefficient and can be optimised with a single O(n) solution.
    // But we can keep this simple and readable for now. :)

    const isEveryChildChecked = parent.children?.every(child => child.checkedStatus == 'True');
    const isAnyIntermediate = parent.children?.some(child => child.checkedStatus == 'Indeterminate');
    const hasAnUncheckedChild = parent.children?.some(child => child.checkedStatus == 'False');
    const hasACheckedChild = parent.children?.some(child => child.checkedStatus == 'True');

    if (isEveryChildChecked) {
        parent.checkedStatus = 'True';
    }
    else if (isAnyIntermediate || (hasAnUncheckedChild && hasACheckedChild)) {
        parent.checkedStatus = 'Indeterminate';
    } else {
        parent.checkedStatus = 'False';
    }
    
    notifyParentOfSelection(parent);
}

export const TreeViewViewModel: TreeViewViewModel = {
    loadNodes(nodes: TreeViewItem[]): void {
        flattenedNodesLookUp = flattenNodes(nodes);
    },

    getNodes(): { [id: string]: TreeViewItem } {
        return flattenedNodesLookUp
    },

    checkedStatusChanged(item: TreeViewItem): void {
        if (item.checkedStatus == 'True')
            eventHub.onItemChecked(item);
        else
            eventHub.onItemUnChecked(item);

        cascadeStateToDescendants(item, item.checkedStatus as CheckedState);
        notifyParentOfSelection(item);
    },

    removeTreeViewItem(id: string): boolean {
        const itemToBeRemoved = flattenedNodesLookUp[id];

        if (!itemToBeRemoved) return false;

        const parentId = itemToBeRemoved.parentId;
        if (parentId) this.removeFromParentNode(itemToBeRemoved);

        if (!itemToBeRemoved.children) return false;

        while (itemToBeRemoved.children.length > 0) {
            this.removeChildNodes(itemToBeRemoved.children[0])
        }

        delete flattenedNodesLookUp[id];
        return true
    },

    removeFromParentNode(itemToRemove: TreeViewItem): void {
        const parentId = itemToRemove.parentId;
        if (!parentId) return;

        const parent = flattenedNodesLookUp[parentId];
        const index = parent.children?.findIndex(node => node.id == itemToRemove.id)
        if (index! > -1) parent.children?.splice(index!, 1)
    },

    removeChildNodes(node: TreeViewItem) {
        if (!node.children) return;
        
        while (node.children.length > 0) {
            this.removeChildNodes(node.children[0])
        }
        
        this.removeFromParentNode(node)
        delete flattenedNodesLookUp[node.id];
    },

    addTreeViewItem(TreeViewItem: TreeViewItem): void {
        flattenedNodesLookUp[TreeViewItem.id] = TreeViewItem;
        if(!TreeViewItem.parentId) return;

        const parent = flattenedNodesLookUp[TreeViewItem.parentId]
        if (parent.children) {
            parent.children.push(TreeViewItem);
        } else {
            Vue.set(parent, 'children', [TreeViewItem])
        }
    }
}