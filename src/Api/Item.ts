import { ToolbarItemSettings } from "Settings/NoteToolbarSettings";
import { IItem } from "./IItem";
import NoteToolbarPlugin from "main";

export class Item implements IItem {

    public readonly id?: string;

    constructor(private plugin: NoteToolbarPlugin, private item: ToolbarItemSettings) {
        this.id = this.item.uuid;
    }

}