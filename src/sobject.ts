import { IntTopic, Topic, StringTopic, ListTopic, SetTopic, DictTopic } from "chatroom-client/src"
import { ObjectSyncClient } from "./client"
import { Action, Constructor } from "chatroom-client/src/utils"
import {ObjSetTopic, ObjListTopic, ObjDictTopic, ObjectTopic} from './topic';
import { print } from "./devUtils"

export class SObject{
    private readonly _id
    public get id(): string{
        return this._id;
    }
    public get parent(): SObject{
        if (this.parent_id.getValue()=='')
            return null as any;
        return this.objectsync.getObject(this.parent_id.getValue());
    }
    public get isRoot(): boolean{
        return this.id == 'root';
    }
    
    onAddChild: Action<[SObject]> = new Action();
    onRemoveChild: Action<[SObject]> = new Action();

    protected readonly objectsync;
    private readonly parent_id;
    //private subscribed
    protected readonly children: Set<SObject> = new Set();

    constructor(objectsync: ObjectSyncClient, id: string){
        this.objectsync = objectsync;
        this._id = id;
        this.parent_id = objectsync.getTopic(`parent_id/${id}`,StringTopic);
        if (!this.isRoot){ 
            this.parentIdChangedCallback = this.parentIdChangedCallback.bind(this);
            this.parent_id.onSet2.add(this.parentIdChangedCallback);
        }
    }

    public postConstructor(): void{
        print('postConstructor',this.parent_id.getValue());
        if(this.parent != null){
            this.onParentChangedTo(this.parent);
        }
    }

    public getAttribute<T extends Topic<any>|ObjectTopic<any>|ObjListTopic<any>|ObjSetTopic<any>|ObjDictTopic<any>>(topicName: string,topicType?: string|Constructor<T>): T {
        if (topicType == ObjectTopic){
            return new ObjectTopic(this.objectsync.getTopic(`a/${this.id}/${topicName}`,StringTopic),this.objectsync.getObject.bind(this.objectsync)) as T;
        }
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

    private parentIdChangedCallback(oldValue: string, newValue: string): void{
        //this.onParentChanged(this.objectsync.getObject_u(oldValue),this.objectsync.getObject_u(newValue));
        if(this.objectsync.getObject_u(oldValue)!=null)
            this.onParentChangedFrom(this.objectsync.getObject(oldValue));
        if(this.objectsync.getObject_u(newValue)!=null)
            this.onParentChangedTo(this.objectsync.getObject(newValue));
    }


    protected onParentChangedFrom(oldValue: SObject): void{
        oldValue.removeChild(this);
    }

    /**
     * When this object is moved to a new parent, this method is called.
     * When the object is first created, this method is called with undefined as the old parent.
     * @param oldValue 
     * @param newValue 
     */
    protected onParentChangedTo(newValue: SObject): void{
        newValue.addChild(this);
    }

    onDestroy(): void{
        this.parent_id.onSet2.remove(this.parentIdChangedCallback);
        //unsubscribe from all topics
        this.objectsync.unsubscribe(this.parent_id);
    }

    public addChild(child: SObject): void{
        this.children.add(child);
        this.onAddChild.invoke(child);
    }

    public removeChild(child: SObject): void{
        this.onRemoveChild.invoke(child);
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

    public setParent(parent_id:string): void{
        this.parent_id.set(parent_id);
    }
}