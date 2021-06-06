import { TreeViewItem, ItemTypes } from "../contracts/types"
import { cascadeStateToDescendants, findChildrenOfType } from "../hierachyTraversal/hierachyTraversal";

const onCheckedSubscribers: {[type: string]: ((items: TreeViewItem[]) => void)[] } = {}
const onUnCheckedSubscribers: {[type: string]: ((items: TreeViewItem[]) => void)[] } = {}

export const eventHub = {
    // Add subscriber for item hecked to collection of subscribers
    subscribeToItemChecked(type: ItemTypes, callback: (item: TreeViewItem[]) => void): void {
        onCheckedSubscribers[type.toString()].push(callback);
    },

    // Add subscriber for item unchecked to collection of subscribers
    subscribeToItemUnchecked(type: ItemTypes, callback: (item: TreeViewItem[]) => void) {
        onUnCheckedSubscribers[type.toString()].push(callback);
    },
    
    // Publish events if any subscriber listening for item checked
    onItemChecked(item: TreeViewItem): void {
        if (item.type == ItemTypes.Folder) {
            this.onFolderChecked(item);
        } else {
            const subscribers = onCheckedSubscribers[item.type.toString()];
            if (subscribers) {
                subscribers.forEach(callback => callback([item]));
            }
        }
    },

    // Publish events if any subscriber listening for item unchecked
    onItemUnChecked(item: TreeViewItem): void {
        const subscribers = onUnCheckedSubscribers[item.type.toString()];
        if (subscribers) {
            subscribers.forEach(callback => callback([item]));
        }
    },

    /// Premise: Whenever a folder is checked, it automatically checks all it's decendants.
    /// Expected action: When a folder is checked, traverse it's tree to get see if any item has also been checked for which a listener needs to be updated
    onFolderChecked(folder: TreeViewItem): void {
        if (folder.type != ItemTypes.Folder) return;

        const itemTypesWithListeners = Object.keys(onCheckedSubscribers);
        itemTypesWithListeners.forEach(itemType => {
            const itemsToPublish = findChildrenOfType(folder, (<any>ItemTypes)[itemType] );
            onCheckedSubscribers[itemType].forEach(subscriber => subscriber(itemsToPublish));
        });
    },

    /// Premise: Whenever a folder is checked, it automatically checks all it's decendants.
    /// Expected action: When a folder is un-checked, traverse it's tree to get see if any item has also been checked for which a listener needs to be updated
    onFolderUnChecked(folder: TreeViewItem): void {
        if (folder.type != ItemTypes.Folder) return;

        const itemTypesWithListeners = Object.keys(onUnCheckedSubscribers);
        itemTypesWithListeners.forEach(itemType => {
            const itemsToPublish = findChildrenOfType(folder, (<any>ItemTypes)[itemType] );
            onUnCheckedSubscribers[itemType].forEach(subscriber => subscriber(itemsToPublish));
        });
    }
}