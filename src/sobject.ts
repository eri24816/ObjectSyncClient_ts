import { IntTopic, Topic, StringTopic, ListTopic, SetTopic, DictTopic } from "chatroom-client/src"
import { ObjectSyncClient } from "./client"
import { Constructor } from "chatroom-client/src/utils"
import {ObjSetTopic, ObjListTopic, ObjDictTopic} from './topic';

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
    private readonly children: Set<SObject> = new Set();

    constructor(objectsync: ObjectSyncClient, id: string){
        this.objectsync = objectsync;
        this._id = id;
        this.parent_id = objectsync.getTopic(`parent_id/${id}`,StringTopic);
        if (!this.isRoot)
            this.parent_id.onSet2.add((oldValue: string, newValue: string) => {
                this.onParentChanged(this.objectsync.getObject_u(oldValue),this.objectsync.getObject(newValue));
            });
    }

    public getAttribute<T extends Topic<any>|ObjListTopic<any>|ObjSetTopic<any>|ObjDictTopic<any>>(topicName: string,topicType?: string|Constructor<T>): T {
        if (topicType == ObjListTopic){
            return new ObjListTopic(this.objectsync.getTopic(`a/${this.id}/${topicName}`,ListTopic),this.objectsync.getObject.bind(this.objectsync)) as T;
        }
        if (topicType == ObjSetTopic){
            return new ObjSetTopic(this.objectsync.getTopic(`a/${this.id}/${topicName}`,SetTopic),this.objectsync.getObject.bind(this.objectsync)) as T;
        }
        if (topicType == ObjDictTopic){
            return new ObjDictTopic(this.objectsync.getTopic(`a/${this.id}/${topicName}`,DictTopic<string,string>),this.objectsync.getObject.bind(this.objectsync)) as T;
        }

        return this.objectsync.getTopic(`a/${this.id}/${topicName}`,topicType as any) as T;
    }

    /**
     * When this object is moved to a new parent, this method is called.
     * When the object is first created, this method is called with undefined as the old parent.
     * @param oldValue 
     * @param newValue 
     */
    onParentChanged(oldValue: SObject|undefined, newValue: SObject): void{
        if (oldValue)
            oldValue.removeChild(this);
        newValue.addChild(this);
    }

    onDestroy(): void{
        //unsubscribe from all topics
        this.objectsync.unsubscribe(this.parent_id);
    }

    public addChild(child: SObject): void{
        this.children.add(child);
    }

    public removeChild(child: SObject): void{
        this.children.delete(child);
    }

    public getChildren(): Set<SObject>{
        return this.children;
    }

    public getChildrenOfType<T extends SObject>(type: Constructor<T>): Set<T>{
        let result = new Set<T>();
        for (let child of this.children){
            if (child instanceof type)
                result.add(child);
        }
        return result;
    }
}