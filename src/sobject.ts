import { IntTopic } from "chatroom-client/src"
import { ObjectSyncClient } from "./client"

export class SObject{
    private readonly _id
    public get id(): string{
        return this._id;
    }
    private readonly objectsync;
    private readonly parent_id;
    constructor(objectsync: ObjectSyncClient, id: string){
        this.objectsync = objectsync;
        this._id = id;
        this.parent_id = objectsync.getTopic(`_/${id}/parent_id`,IntTopic);
        this.parent_id.onSet2.add(this.onParentChanged.bind(this));
    }

    onParentChanged(oldValue: number, newValue: number): void{
        console.log('parent_id changed:',oldValue,'=>',newValue);
    }

    onDestroy(): void{}
}