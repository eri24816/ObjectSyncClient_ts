import { IntTopic, Topic, StringTopic } from "chatroom-client/src"
import { ObjectSyncClient } from "./client"
import { Constructor } from "chatroom-client/src/utils"

export class SObject{
    private readonly _id
    public get id(): string{
        return this._id;
    }
    public get parent(): SObject{
        return this.objectsync.getObject(this.parent_id.getValue());
    }
    public get isRoot(): boolean{
        return this.id == 'root';
    }
    private readonly objectsync;
    private readonly parent_id;
    constructor(objectsync: ObjectSyncClient, id: string){
        this.objectsync = objectsync;
        this._id = id;
        this.parent_id = objectsync.getTopic(`parent_id/${id}`,StringTopic);
        if (!this.isRoot)
            this.parent_id.onSet2.add((oldValue: string, newValue: string) => {
                this.onParentChanged(this.objectsync.getObject_u(oldValue),this.objectsync.getObject(newValue));
            });
    }

    public getAttribute<T extends Topic<any>>(topicName: string,topicType?: string|Constructor<T>): T {
        return this.objectsync.getTopic(`a/${this.id}/${topicName}`,topicType);
    }

    /**
     * When this object is moved to a new parent, this method is called.
     * When the object is first created, this method is called with undefined as the old parent.
     * @param oldValue 
     * @param newValue 
     */
    onParentChanged(oldValue: SObject|undefined, newValue: SObject): void{
    }

    onDestroy(): void{
        //unsubscribe from all topics
        this.objectsync.unsubscribe(this.parent_id);
    }
}