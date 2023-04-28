import { IntTopic } from "chatroom-client/src"
import { ObjectSyncClient } from "./client"

export class SObject{
    private readonly _id
    public get id(): number{
        return this._id;
    }
    private readonly objectsync;
    private readonly parent_id;
    constructor(objectsync: ObjectSyncClient, id: number){
        this.objectsync = objectsync;
        this._id = id;
        this.parent_id = objectsync.getTopic(`_/${id}/parent_id`,IntTopic);
        this.parent_id.onSet2.add(this.onParentChanged.bind(this));
    }

    getId(): number{
        return this.id;
    }

    onParentChanged(oldValue: number, newValue: number): void{
        console.log('parent_id changed:',oldValue,'=>',newValue);
    }

    onDestroy(): void{}
}